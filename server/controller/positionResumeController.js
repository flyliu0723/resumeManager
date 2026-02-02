const { positionResumeStmt, resumeStmt, positionStmt, aiConfigStmt, positionNoteStmt, interviewEventStmt } = require('../database')
const parserFactory = require('../parser/factory')
const AIService = require('../aiService')
const fs = require('fs')
const path = require('path')
const busboy = require('busboy')
const { success, error } = require('../utils/response')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'files')
// 用于数据库存储的相对路径前缀
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

const positionResumeController = {
  getByPosition: (req, res) => {
    try {
      const matches = positionResumeStmt.getByPosition(req.params.positionId)
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

        return {
          ...match,
          parsed_data_obj: parsedDataObj,
          evaluation_obj: evaluationObj,
          questions_list: questionsList
        }
      })
      success(res, data)
    } catch (err) {
      error(res, err.message)
    }
  },

  create: (req, res) => {
    try {
      console.log('\n========== 开始处理文件上传 ==========')
      console.log('请求头:', JSON.stringify(req.headers, null, 2))
      console.log('Position ID:', req.params.positionId)
      
      let positionId = req.params.positionId
      let recordFileName = ''
      let size = 0
      let type = ''
      let filePath = ''
      let tempFilePath = ''
      let source = 'other'
      let note = ''
      
      const bb = busboy({ 
        headers: req.headers, 
        defParamCharset: 'utf8',
        limits: {
          fileSize: 50 * 1024 * 1024 // 50MB limit
        }
      })
      
      bb.on('file', (name, file, info) => {
        console.log('接收到文件:', { name, filename: info.filename, mimeType: info.mimeType })
        
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
          console.error('文件流错误:', err)
        })
      })
      
      bb.on('field', (name, val, info) => {
        console.log('接收到字段:', { name, value: val, info })
        if (name === 'source') {
          source = val
        } else if (name === 'note') {
          note = val
        }
      })

      bb.on('close', async () => {
      try {
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

        // 获取文件格式
        const ext = path.extname(recordFileName).toLowerCase()
        const fileFormat = ext === '.pdf' ? 'PDF' : ext === '.docx' ? 'DOCX' : ext === '.doc' ? 'DOC' : 'OTHER'

        // 生成相对路径用于数据库存储
        const timestamp = Date.now()
        const originalName = recordFileName || 'file'
        const fileExt = path.extname(originalName)
        const baseName = path.basename(originalName, fileExt)
        const storedFileName = `${timestamp}_${baseName}${fileExt}`
        const relativeFilePath = DB_PATH_PREFIX + storedFileName

        // 重命名文件为带时间戳的名称
        const finalFilePath = path.join(UPLOAD_DIR, storedFileName)
        fs.renameSync(filePath, finalFilePath)

        console.log('文件存储信息:', {
          originalName: recordFileName,
          storedFileName: storedFileName,
          relativePath: relativeFilePath,
          absolutePath: finalFilePath
        })

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

        // 记录简历上传事件
        try {
          interviewEventStmt.insert('resume_upload', matchResult.lastInsertRowid, Number(positionId), {
            stageAfter: '新候选人',
            details: {
              resumeId: insertResult.lastInsertRowid,
              candidateName: result.candidateName || '未知',
              fileName: recordFileName,
              fileSize: size,
              fileFormat: fileFormat
            }
          })
          console.log('记录简历上传事件成功:', { matchId: matchResult.lastInsertRowid, positionId })
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
            console.warn('解析 parsed_data 失败:', e)
          }
        }

        success(res, { ...newMatch, parsed_data_obj: parsedDataObj }, '上传成功')
      } catch (err) {
        error(res, err.message)
      }
    })

    bb.on('error', (err) => {
      console.error('Busboy错误:', err)
      error(res, '文件上传处理失败: ' + err.message, 500)
    })
    
    req.pipe(bb)
    
  } catch (err) {
    console.error('上传处理错误:', err)
    error(res, err.message, 500)
  }
  },

  updateStatus: (req, res) => {
    try {
      const { 
        mainStatus,      // 新主状态
        subStatus,       // 新子状态
        actionType = 'status_change',  // 操作类型
        note = '',       // 备注
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
        roundId
      } = req.body
      
      // 验证新状态
      if (!mainStatus || !subStatus) {
        return error(res, '主状态和子状态不能为空', 400)
      }
      
      const match = positionResumeStmt.getById(req.params.id)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }
      
      const oldMainStatus = match.main_status
      const oldSubStatus = match.sub_status
      
      // 如果是拒绝操作，创建拒绝记录
      if (actionType === 'reject') {
        const { interviewRejectionStmt } = require('../database')
        interviewRejectionStmt.insert(req.params.id, {
          rejectedAtStage: oldMainStatus,
          rejectedAtSubStatus: oldSubStatus,
          rejectionCategory: getRejectionCategory(rejectionReasonCode),
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
      
      // 更新状态（使用新方法）
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
      const terminalSubStatuses = ['screening_rejected', 'interview_rejected', 'offer_rejected', 'salary_rejected', 'onboard_abandoned', 'onboarded']
      if (terminalSubStatuses.includes(subStatus)) {
        updates.next_interview_at = null
      }
      
      // 执行更新
      positionResumeStmt.updateStatusNew(req.params.id, mainStatus, subStatus, {
        updateFlowStartAt: true
      })
      
      // 记录流程日志
      const { flowLogStmt } = require('../database')
      flowLogStmt.insertWithNewStatus(req.params.id, oldMainStatus, mainStatus, oldSubStatus, subStatus, {
        actionType,
        note: note || `状态变更: ${oldSubStatus} → ${subStatus}`,
        roundId,
        metadata: {
          rejection_reason_code: rejectionReasonCode,
          old_main_status: oldMainStatus,
          old_sub_status: oldSubStatus,
          new_main_status: mainStatus,
          new_sub_status: subStatus
        }
      })
      
      // 获取更新后的记录
      const updatedMatch = positionResumeStmt.getById(req.params.id)
      
      success(res, {
        ...updatedMatch,
        main_status: mainStatus,
        sub_status: subStatus
      }, '状态更新成功')
    } catch (err) {
      console.error('状态更新失败:', err)
      error(res, err.message, 500)
    }
  }
}

// 辅助函数：获取拒绝原因分类
function getRejectionCategory(reasonCode) {
  const categoryMap = {
    'resume_not_match': 'screening',
    'experience_not_enough': 'screening',
    'skill_not_match': 'screening',
    'salary_expectation_high': 'screening',
    'technical_not_pass': 'interview',
    'communication_issue': 'interview',
    'culture_not_match': 'interview',
    'attitude_issue': 'interview',
    'stability_concern': 'interview',
    'salary_not_agree': 'salary',
    'candidate_reject_offer': 'salary',
    'benefit_not_satisfied': 'salary',
    'got_other_offer': 'salary',
    'candidate_abandon': 'onboard',
    'company_decision': 'onboard',
    'personal_reason': 'onboard'
  }
  return categoryMap[reasonCode] || 'other'
}

module.exports = positionResumeController
