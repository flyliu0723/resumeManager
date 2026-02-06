const { 
  positionResumeStmt, 
  resumeStmt, 
  positionStmt, 
  aiConfigStmt, 
  positionNoteStmt, 
  interviewEventStmt,
  interviewRoundStmt,
  interviewRejectionStmt,
  flowLogStmt 
} = require('../database')
const { StatusUtils, REJECTION_REASONS } = require('../constants/interviewStatus')
const parserFactory = require('../parser/factory')
const AIService = require('../aiService')
const fs = require('fs')
const path = require('path')
const busboy = require('busboy')
const { success, error } = require('../utils/response')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'files')
const DB_PATH_PREFIX = 'uploads/files/'

async function runEvaluation(matchId, resumeId, positionId, resumeContent, parsedDataStr) {
  try {
    const position = positionStmt.getById(positionId)
    if (!position) return

    const activeConfig = aiConfigStmt.getActive()
    if (!activeConfig || !activeConfig.api_key) return

    const aiService = new AIService(activeConfig)
    aiService.setActiveConfig(activeConfig)

    let combinedResult = {}
    try {
      const parsedData = JSON.parse(parsedDataStr)
      const positionNotes = positionNoteStmt.getByPosition(positionId)
      const notesText = positionNotes.length > 0
        ? '\n\n职位补充要求：\n' + positionNotes.map(n => `• ${n.content}`).join('\n')
        : ''
      const jdText = (position.description || '') + notesText
      const result = await aiService.evaluateAndGenerateQuestions(parsedData, jdText)
      if (result && typeof result === 'object') {
        combinedResult = result
      }
    } catch (e) {
      console.error('合并评估失败:', e.message)
    }

    const matchScore = combinedResult.match_score || 0
    const questionsJson = JSON.stringify(combinedResult.questions || [])
    const evaluationJson = JSON.stringify({
      ai_summary: combinedResult.ai_summary || '',
      match_reasons: combinedResult.match_reasons || [],
      gap_analysis: combinedResult.gap_analysis || [],
      suggestions: combinedResult.suggestions || [],
      match_score: matchScore,
      match_level: combinedResult.match_level || '低'
    })

    positionResumeStmt.updateEvaluation(matchId, evaluationJson, matchScore, questionsJson)
  } catch (e) {
    console.error('评估过程出错:', e)
  }
}

/**
 * 状态流转控制器 - 新状态系统
 * 支持主状态+子状态的完整流转，包括各阶段流向"不合适"
 */
const positionResumeController = {
  
  // 获取列表（支持新状态系统筛选）
  getByPosition: (req, res) => {
    try {
      const { positionId } = req.params
      const { 
        mainStatus,      // 主状态筛选
        subStatus,       // 子状态筛选
        ongoing,         // 是否只查进行中的（非终态）
        search           // 搜索关键词
      } = req.query

      let matches = positionResumeStmt.getByPosition(positionId)
      
      // 新状态系统筛选
      if (mainStatus) {
        matches = matches.filter(m => m.main_status === mainStatus)
      }
      if (subStatus) {
        matches = matches.filter(m => m.sub_status === subStatus)
      }
      if (ongoing === 'true') {
        // 只查询非终态的记录
        matches = matches.filter(m => {
          const isTerminal = StatusUtils.isTerminalStatus(m.main_status, m.sub_status)
          return !isTerminal
        })
      }
      if (search) {
        const keyword = search.toLowerCase()
        matches = matches.filter(m => 
          (m.candidate_name && m.candidate_name.toLowerCase().includes(keyword)) ||
          (m.resume_name && m.resume_name.toLowerCase().includes(keyword))
        )
      }

      // 增强返回数据
      const data = matches.map(match => {
        let parsedDataObj = null
        if (match.parsed_data) {
          try {
            parsedDataObj = JSON.parse(match.parsed_data)
          } catch (e) {
            console.warn('解析 parsed_data 失败:', e)
          }
        }
        
        let evaluationObj = null
        if (match.evaluation) {
          try {
            evaluationObj = JSON.parse(match.evaluation)
          } catch (e) {
            console.warn('解析 evaluation 失败:', e)
          }
        }
        
        let questionsList = []
        if (match.questions) {
          try {
            questionsList = JSON.parse(match.questions)
          } catch (e) {
            console.warn('解析 questions 失败:', e)
          }
        }

        // 计算在阶段停留天数
        const daysInStage = match.flow_start_at 
          ? Math.floor((Date.now() - new Date(match.flow_start_at).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          ...match,
          parsed_data_obj: parsedDataObj,
          evaluation_obj: evaluationObj,
          questions_list: questionsList,
          days_in_stage: daysInStage,
          // 新状态系统友好显示
          status_display: StatusUtils.getSubStatus(match.main_status, match.sub_status)?.label || match.sub_status,
          is_terminal: StatusUtils.isTerminalStatus(match.main_status, match.sub_status),
          is_rejected: StatusUtils.isRejectedStatus(match.main_status, match.sub_status),
          can_reject: StatusUtils.canRejectAtStage(match.main_status, match.sub_status)
        }
      })

      success(res, data)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取单个详情（支持新状态系统）
  getById: (req, res) => {
    try {
      const match = positionResumeStmt.getById(req.params.id)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      // 获取关联的面试轮次
      const interviewRounds = interviewRoundStmt.getByMatchId(match.id)
      
      // 获取当前进行的轮次
      const currentRound = interviewRoundStmt.getCurrentRound(match.id)
      
      // 获取拒绝记录（如果是不合适状态）
      let rejectionRecord = null
      if (StatusUtils.isRejectedStatus(match.main_status, match.sub_status)) {
        const rejections = interviewRejectionStmt.getByMatchId(match.id)
        rejectionRecord = rejections[0] || null // 取最新的拒绝记录
      }

      // 解析JSON字段
      let parsedDataObj = null
      if (match.parsed_data) {
        try {
          parsedDataObj = JSON.parse(match.parsed_data)
        } catch (e) {}
      }
      
      let evaluationObj = null
      if (match.evaluation) {
        try {
          evaluationObj = JSON.parse(match.evaluation)
        } catch (e) {}
      }

      // 计算停留天数
      const daysInStage = match.flow_start_at 
        ? Math.floor((Date.now() - new Date(match.flow_start_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const data = {
        ...match,
        parsed_data_obj: parsedDataObj,
        evaluation_obj: evaluationObj,
        interview_rounds: interviewRounds,
        current_round: currentRound,
        rejection_record: rejectionRecord,
        days_in_stage: daysInStage,
        // 状态系统友好信息
        main_status_info: StatusUtils.getMainStatus(match.main_status),
        sub_status_info: StatusUtils.getSubStatus(match.main_status, match.sub_status),
        is_terminal: StatusUtils.isTerminalStatus(match.main_status, match.sub_status),
        is_rejected: StatusUtils.isRejectedStatus(match.main_status, match.sub_status),
        can_reject: StatusUtils.canRejectAtStage(match.main_status, match.sub_status),
        next_status_options: StatusUtils.getStatusFlow(match.main_status, match.sub_status)
      }

      success(res, data)
    } catch (err) {
      error(res, err.message)
    }
  },

   /**
    * 状态流转 - 通用状态变更接口（新状态系统）
    * 支持：正常流转、拒绝、重新打开
    */
   updateStatus: (req, res) => {
     try {
       const { id } = req.params
       console.log('\n========== [后端接收] ==========')
       console.log('[后端] URL参数ID:', id)
       console.log('[后端] 接收时间:', new Date().toLocaleString('zh-CN'))
       console.log('[后端] 接收数据:', JSON.stringify(req.body, null, 2))

       const {
         mainStatus,      // 新主状态
         subStatus,       // 新子状态
         actionType,      // 操作类型：progress（正常推进）/ reject（拒绝）/ reopen（重新打开）
         // 拒绝相关字段
         rejectionReasonCode,
         rejectionReasonDetail,
         rejectedBy,
         rejectedByName,
         rejectedByRole,
         internalNotes,
         candidateFeedback,
         isReopenable,
         reopenConditions,
         // 面试相关
         roundId,
         // 通用备注
         note
       } = req.body

      const match = positionResumeStmt.getById(id)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      // 获取当前状态
      const oldMainStatus = match.main_status
      const oldSubStatus = match.sub_status

      // 验证新状态是否有效
      const subStatusInfo = StatusUtils.getSubStatus(mainStatus, subStatus)
      if (!subStatusInfo) {
        return error(res, `无效的状态组合: ${mainStatus} / ${subStatus}`, 400)
      }

      // 检查是否是拒绝操作
      if (actionType === 'reject') {
        // 验证是否可以在当前阶段拒绝
        if (!StatusUtils.canRejectAtStage(oldMainStatus, oldSubStatus)) {
          return error(res, '当前阶段无法进行拒绝操作', 400)
        }

        // 创建拒绝记录
        interviewRejectionStmt.insert(id, {
          rejectedAtStage: oldMainStatus,
          rejectedAtSubStatus: oldSubStatus,
          rejectionCategory: REJECTION_REASONS[rejectionReasonCode]?.category || 'other',
          rejectionReasonCode,
          rejectionReasonDetail,
          rejectedBy,
          rejectedByName,
          rejectedByRole,
          internalNotes,
          candidateFeedback,
          isReopenable: isReopenable ? 1 : 0,
          reopenConditions,
          relatedRoundId: roundId
        })
      }

      // 更新主表状态
      const updates = {
        main_status: mainStatus,
        sub_status: subStatus
      }

      // 如果是进入面试阶段，重置或更新面试轮次
      if (mainStatus === 'interviewing' && oldMainStatus !== 'interviewing') {
        updates.interview_round = 0
        updates.current_round_id = null
      }

      // 如果是终态，清空next_interview_at
      if (StatusUtils.isTerminalStatus(mainStatus, subStatus)) {
        updates.next_interview_at = null
      }

      // 执行状态更新 - 使用新版方法正确更新main_status和sub_status
      positionResumeStmt.updateStatusNew(
        id,
        updates.main_status,
        updates.sub_status,
        {
          interviewRound: updates.interview_round,
          currentRoundId: updates.current_round_id,
          nextInterviewAt: updates.next_interview_at,
          updateFlowStartAt: true
        }
      )

      // 记录流程日志（使用新状态系统字段）
      flowLogStmt.insertWithNewStatus(id, oldMainStatus, mainStatus, oldSubStatus, subStatus, {
        actionType: actionType || 'status_change',
        note: note || subStatusInfo.action,
        roundId,
        metadata: {
          rejection_reason_code: rejectionReasonCode,
          rejection_reason_detail: rejectionReasonDetail,
          old_main_status: oldMainStatus,
          old_sub_status: oldSubStatus,
          new_main_status: mainStatus,
          new_sub_status: subStatus
        }
      })

      // 记录事件（用于数据分析）
      interviewEventStmt.insert(match.resume_id, match.position_id, actionType === 'reject' ? 'candidate_rejected' : 'status_changed', {
        eventTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        stageBefore: oldMainStatus,
        stageAfter: mainStatus,
        details: {
          match_id: id,
          sub_status_before: oldSubStatus,
          sub_status_after: subStatus,
          rejection_reason: rejectionReasonCode
        }
      })

      success(res, { 
        id, 
        main_status: mainStatus, 
        sub_status: subStatus,
        is_terminal: StatusUtils.isTerminalStatus(mainStatus, subStatus),
        is_rejected: StatusUtils.isRejectedStatus(mainStatus, subStatus)
      }, '状态更新成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * 重新打开已拒绝的流程
   */
  reopen: (req, res) => {
    try {
      const { id } = req.params
      const { 
        targetMainStatus = 'resume_screening',  // 默认回到简历筛选
        targetSubStatus = 'pending_review',
        reopenReason 
      } = req.body

      const match = positionResumeStmt.getById(id)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      // 验证当前状态是否是已拒绝
      if (!StatusUtils.isRejectedStatus(match.main_status, match.sub_status)) {
        return error(res, '只能重新打开已拒绝的流程', 400)
      }

      // 获取拒绝记录，检查是否允许重新打开
      const rejections = interviewRejectionStmt.getByMatchId(id)
      const latestRejection = rejections[0]
      
      if (latestRejection && !latestRejection.is_reopenable) {
        return error(res, '该流程已标记为不可重新打开', 400)
      }

      const oldMainStatus = match.main_status
      const oldSubStatus = match.sub_status

      // 更新状态
      positionResumeStmt.updateStatus(
        id,
        targetSubStatus,
        targetMainStatus,
        targetSubStatus,
        null,
        true
      )

      // 记录流程日志
      flowLogStmt.insertWithNewStatus(id, oldMainStatus, targetMainStatus, oldSubStatus, targetSubStatus, {
        actionType: 'reopen',
        note: reopenReason || '流程重新打开',
        metadata: {
          previous_rejection_id: latestRejection?.id,
          reopen_reason: reopenReason
        }
      })

      success(res, {
        id,
        main_status: targetMainStatus,
        sub_status: targetSubStatus,
        reopened_from: oldSubStatus
      }, '流程重新打开成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取可用的下一个状态选项
  getNextStatusOptions: (req, res) => {
    try {
      const match = positionResumeStmt.getById(req.params.id)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      const { main_status, sub_status } = match
      
      // 获取跨主状态的正常流转选项
      const nextOptions = StatusUtils.getCrossMainStatusFlow(main_status, sub_status)
      
      // 构建选项详情
      const options = nextOptions.map(opt => {
        return {
          code: opt.code,
          target_main_status: opt.targetMainStatus,
          label: opt.label,
          action: opt.action,
          is_terminal: opt.isTerminal
        }
      })

      // 检查是否可以拒绝
      const canReject = StatusUtils.canRejectAtStage(main_status, sub_status)
      
      // 获取拒绝原因选项
      let rejectOptions = null
      if (canReject) {
        rejectOptions = {
          target_status: StatusUtils.getRejectionSubStatus(main_status),
          reasons: Object.values(REJECTION_REASONS).filter(r => 
            // 根据当前阶段筛选相关原因
            main_status === 'resume_screening' ? r.category === 'screening' :
            main_status === 'interviewing' ? r.category === 'interview' :
            main_status === 'salary_negotiation' ? r.category === 'salary' :
            main_status === 'closed' ? r.category === 'onboard' :
            true
          )
        }
      }

      success(res, {
        current: {
          main_status,
          sub_status,
          main_status_label: StatusUtils.getMainStatus(main_status)?.label,
          sub_status_label: StatusUtils.getSubStatus(main_status, sub_status)?.label
        },
        next_options: options,
        can_reject: canReject,
        reject_options: rejectOptions
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取拒绝原因列表
  getRejectionReasons: (req, res) => {
    try {
      const { category } = req.query  // screening, interview, salary, onboard, other
      
      let reasons = Object.values(REJECTION_REASONS)
      if (category) {
        reasons = reasons.filter(r => r.category === category)
      }

      success(res, reasons)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 文件上传
  create: (req, res) => {
    const positionId = req.params.positionId
    let recordFileName = ''
    let size = 0
    let type = ''
    let filePath = ''
    let tempFilePath = ''
    let source = 'other'
    let note = ''
    let hasError = false

    const bb = busboy({
      headers: req.headers,
      defParamCharset: 'utf8',
      limits: {
        fileSize: 50 * 1024 * 1024
      }
    })

    bb.on('file', (name, file, info) => {
      type = info.mimeType
      recordFileName = info.filename || 'unknown'

      const timestamp = Date.now()
      const originalName = info.filename || 'file'
      const ext = path.extname(originalName)
      const baseName = path.basename(originalName, ext)

      const fileName = `${timestamp}_${baseName}${ext}`
      filePath = path.join(UPLOAD_DIR, fileName)
      tempFilePath = filePath + '.tmp'
      const writeStream = fs.createWriteStream(tempFilePath)

      file.on('data', (data) => {
        writeStream.write(data)
        size += data.length
      })

      file.on('end', () => writeStream.end())

      file.on('error', (err) => {
        hasError = true
      })
    })

    bb.on('field', (name, val) => {
      if (name === 'source') {
        source = val
      } else if (name === 'note') {
        note = val
      }
    })

    bb.on('close', async () => {
      try {
        if (hasError) {
          return error(res, '文件上传失败', 500)
        }

        if (!recordFileName) {
          return error(res, '没有上传文件', 400)
        }

        if (!tempFilePath || !fs.existsSync(tempFilePath)) {
          throw new Error('文件未正确接收')
        }

        await new Promise((resolve, reject) => {
          fs.createReadStream(tempFilePath).pipe(fs.createWriteStream(filePath))
            .on('finish', resolve).on('error', reject)
        })

        fs.unlinkSync(tempFilePath)

        const unsupportedExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.tif', '.tiff']
        if (unsupportedExts.includes(path.extname(recordFileName).toLowerCase())) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
          return error(res, `不支持的图片格式，请上传 PDF 或 Word 格式`, 400)
        }

        const result = await parserFactory.parse(filePath, recordFileName, positionId)

        const ext = path.extname(recordFileName).toLowerCase()
        const fileFormat = ext === '.pdf' ? 'PDF' : ext === '.docx' ? 'DOCX' : ext === '.doc' ? 'DOC' : 'OTHER'

        const timestamp = Date.now()
        const originalName = recordFileName || 'file'
        const fileExt = path.extname(originalName)
        const baseName = path.basename(originalName, fileExt)
        const storedFileName = `${timestamp}_${baseName}${fileExt}`
        const relativeFilePath = DB_PATH_PREFIX + storedFileName

        const finalFilePath = path.join(UPLOAD_DIR, storedFileName)
        fs.renameSync(filePath, finalFilePath)

        const parsedData = JSON.stringify({
          name: result.candidateName,
          email: result.structuredData?.email,
          mobile: result.structuredData?.mobile,
          skills: result.structuredData?.skills || [],
          education: result.structuredData?.education,
          experience: result.structuredData?.experience,
          companies: result.structuredData?.companies || [],
          work_experience: result.structuredData?.work_experience,
          project_experience: result.structuredData?.project_experience,
          summary: result.structuredData?.ai_summary
        })

        const insertResult = resumeStmt.insert(
          String(recordFileName),
          String(size),
          String(type || ''),
          String(relativeFilePath),
          String(fileFormat),
          String(result.candidateName || '未知'),
          String(result.content || ''),
          String(source || 'other'),
          String(note || '')
        )

        resumeStmt.updateParsedData(
          insertResult.lastInsertRowid,
          parsedData,
          result.candidateName || '未知',
          result.content || '',
          result.parser,
          result.structuredData?.model || ''
        )

        const matchResult = positionResumeStmt.insert(insertResult.lastInsertRowid, positionId)

        try {
          interviewEventStmt.insert('resume_upload', matchResult.lastInsertRowid, Number(positionId), {
            eventTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
            stageAfter: '新候选人',
            details: {
              resumeId: insertResult.lastInsertRowid,
              candidateName: result.candidateName || '未知',
              fileName: recordFileName,
              fileSize: size,
              fileFormat: fileFormat
            }
          })
        } catch (eventErr) {
          console.error('记录简历上传事件失败:', eventErr)
        }

        setTimeout(() => {
          runEvaluation(matchResult.lastInsertRowid, insertResult.lastInsertRowid, positionId, result.content, parsedData)
        }, 100)

        const newMatch = positionResumeStmt.getById(matchResult.lastInsertRowid)

        let parsedDataObj = null
        if (newMatch.parsed_data) {
          try {
            parsedDataObj = JSON.parse(newMatch.parsed_data)
          } catch (e) {
          }
        }

        if (!res.headersSent) {
          success(res, { ...newMatch, parsed_data_obj: parsedDataObj }, '上传成功')
        }
      } catch (err) {
        if (!res.headersSent) {
          error(res, err.message)
        }
      }
    })

    bb.on('error', (err) => {
      if (!res.headersSent) {
        error(res, '文件上传处理失败: ' + err.message, 500)
      }
    })

    req.pipe(bb)
  },

  // 其他原有方法...
  delete: (req, res) => {
    try {
      const match = positionResumeStmt.getById(req.params.id)
      
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      // 清理关联数据
      interviewRoundStmt.deleteByMatchId(req.params.id)
      interviewRejectionStmt.deleteByMatchId(req.params.id)
      
      // 删除主记录
      positionResumeStmt.delete(req.params.id)
      
      success(res, null, '删除成功')
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = positionResumeController
