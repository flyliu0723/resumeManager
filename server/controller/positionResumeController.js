const { positionResumeStmt, resumeStmt, positionStmt, aiConfigStmt, positionNoteStmt } = require('../database')
const parserFactory = require('../parser/factory')
const AIService = require('../aiService')
const fs = require('fs')
const path = require('path')
const busboy = require('busboy')
const { success, error } = require('../utils/response')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'files')

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
    let positionId = req.params.positionId
    let recordFileName = ''
    let size = 0
    let type = ''
    let filePath = ''
    let tempFilePath = ''
    
    const bb = busboy({ headers: req.headers, defParamCharset: 'utf8' })
    
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
          String(filePath),
          String(result.candidateName || '未知'),
          String(result.content || '')
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

    req.pipe(bb)
  },

  evaluate: (req, res) => {
    try {
      const { positionId, resumeId } = req.params
      
      const position = positionStmt.getById(positionId)
      if (!position) return error(res, '职位不存在', 404)
      
      const resume = resumeStmt.getById(resumeId)
      if (!resume) return error(res, '简历不存在', 404)
      
      let match = positionResumeStmt.getByResumeAndPosition(resumeId, positionId)
      if (!match) {
        const insertResult = positionResumeStmt.insert(resumeId, positionId)
        match = positionResumeStmt.getById(insertResult.lastInsertRowid)
      }

      setTimeout(() => {
        runEvaluation(match.id, resumeId, positionId, resume.content, resume.parsed_data || '{}')
      }, 100)

      success(res, { matchId: match.id }, '评估已开始，请稍后刷新查看结果')
    } catch (err) {
      error(res, err.message)
    }
  },

  updateStatus: (req, res) => {
    try {
      const { status } = req.body
      if (!status) return error(res, '状态不能为空', 400)
      
      const result = positionResumeStmt.updateStatus(req.params.id, status)
      if (result.changes) {
        const match = positionResumeStmt.getById(req.params.id)
        success(res, match)
      } else {
        error(res, '匹配记录不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = positionResumeController
