const { resumeStmt, positionResumeStmt, positionStmt, positionNoteStmt, aiConfigStmt } = require('../database')
const parserFactory = require('../parser/factory')
const AIService = require('../aiService')
const fs = require('fs')
const path = require('path')
const mammoth = require('mammoth')
const { success, error } = require('../utils/response')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'files')

// 辅助函数：获取文件的绝对路径（支持相对路径和绝对路径）
function getAbsoluteFilePath(filePath) {
  if (!filePath) return null
  if (path.isAbsolute(filePath)) {
    return filePath
  }
  return path.join(__dirname, '..', filePath)
}

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

const resumeController = {
  getById: (req, res) => {
    try {
      const resume = resumeStmt.getById(req.params.id)
      if (resume) {
        let parsedData = null
        if (resume.parsed_data) {
          try {
            parsedData = JSON.parse(resume.parsed_data)
          } catch (e) {
            console.warn('解析 parsed_data 失败:', e)
          }
        }
        success(res, { ...resume, parsed_data_obj: parsedData })
      } else {
        error(res, '简历不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  getContent: (req, res) => {
    try {
      const resume = resumeStmt.getById(req.params.id)
      if (resume) {
        success(res, {
          candidateName: resume.candidate_name || '未知',
          content: resume.content || ''
        })
      } else {
        error(res, '简历不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  extractText: async (req, res) => {
    try {
      const resume = resumeStmt.getById(req.params.id)
      if (!resume) {
        return error(res, '简历不存在', 404)
      }

      if (!resume.file_path) {
        return error(res, '简历文件路径不存在', 400)
      }

      const absolutePath = getAbsoluteFilePath(resume.file_path)
      console.log('提取文本 - 文件路径:', resume.file_path)
      console.log('提取文本 - 绝对路径:', absolutePath)

      if (!fs.existsSync(absolutePath)) {
        return error(res, '简历文件不存在', 404)
      }

      const fileExt = path.extname(absolutePath).toLowerCase()
      const supportedFormats = ['.docx', '.doc', '.pdf']

      if (!supportedFormats.includes(fileExt)) {
        return error(res, `不支持提取此格式的文件文本: ${fileExt}`, 400)
      }

      let textContent = ''

      if (fileExt === '.docx') {
        const result = await mammoth.extractRawText({
          path: absolutePath
        })
        textContent = result.value
      } else if (fileExt === '.doc') {
        return error(res, '.doc 格式需要先转换为 .docx 或 PDF 才能预览', 400)
      } else if (fileExt === '.pdf') {
        return error(res, 'PDF 文件请使用 PDF.js 在前端预览', 400)
      }

      success(res, {
        candidateName: resume.candidate_name || '未知',
        content: textContent,
        fileFormat: fileExt.replace('.', '').toUpperCase()
      })
    } catch (err) {
      console.error('提取文本失败:', err)
      error(res, '提取文本失败: ' + err.message)
    }
  },

  delete: (req, res) => {
    try {
      const resume = resumeStmt.getById(req.params.id)

      if (resume?.file_path) {
        const absolutePath = getAbsoluteFilePath(resume.file_path)
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath)
        }
      }

      const result = resumeStmt.delete(req.params.id)
      success(res, null, '删除成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  parse: async (req, res) => {
    try {
      const resume = resumeStmt.getById(req.params.id)
      if (!resume || !resume.file_path) {
        return error(res, '简历不存在或无文件', 404)
      }

      const absolutePath = getAbsoluteFilePath(resume.file_path)
      if (!fs.existsSync(absolutePath)) {
        return error(res, '文件不存在', 404)
      }

      const positionId = req.query.positionId
      if (!positionId) {
        return error(res, '缺少职位ID', 400)
      }

      const result = await parserFactory.parse(absolutePath, resume.name, positionId)
      
      const parsedData = JSON.stringify({
        name: result.candidateName,
        email: result.structuredData?.email,
        mobile: result.structuredData?.mobile,
        skills: result.structuredData?.skills || [],
        education: result.structuredData?.education,
        experience: result.structuredData?.experience,
        work_experience: result.structuredData?.work_experience,
        project_experience: result.structuredData?.project_experience,
        companies: result.structuredData?.companies || [],
        summary: result.structuredData?.ai_summary
      })

      resumeStmt.updateParsedData(
        req.params.id,
        parsedData,
        result.candidateName || '未知',
        result.content || '',
        result.parser,
        result.structuredData?.model || ''
      )

      let match = positionResumeStmt.getByResumeAndPosition(req.params.id, positionId)
      if (!match) {
        const insertResult = positionResumeStmt.insert(req.params.id, positionId)
        match = positionResumeStmt.getById(insertResult.lastInsertRowid)
      }

      setTimeout(() => {
        runEvaluation(match.id, req.params.id, positionId, result.content, parsedData)
      }, 100)

      const updatedResume = resumeStmt.getById(req.params.id)
      success(res, updatedResume, '解析已开始')
    } catch (err) {
      error(res, err.message)
    }
  },

  preview: (req, res) => {
    try {
      console.log('========== 预览文件请求 ==========')
      console.log('简历ID:', req.params.id)

      const resume = resumeStmt.getById(req.params.id)
      if (!resume) {
        console.log('简历记录不存在')
        return res.status(404).json({ code: 404, success: false, message: '简历记录不存在' })
      }

      console.log('数据库中的文件路径:', resume.file_path)

      const absolutePath = getAbsoluteFilePath(resume.file_path)
      console.log('解析后的绝对路径:', absolutePath)

      if (!absolutePath || !fs.existsSync(absolutePath)) {
        console.log('文件不存在:', absolutePath)
        return res.status(404).json({ code: 404, success: false, message: '简历文件不存在' })
      }

      const fileName = encodeURIComponent(resume.name || resume.file_name || 'file')
      console.log('文件名:', fileName)
      console.log('文件大小:', fs.statSync(absolutePath).size, 'bytes')
      console.log('==============================')

      res.setHeader('Content-Type', resume.type || 'application/octet-stream')
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
      res.sendFile(path.resolve(absolutePath))
    } catch (error) {
      console.error('预览文件错误:', error)
      res.status(500).json({ code: 500, success: false, message: error.message })
    }
  },

  download: (req, res) => {
    try {
      console.log('========== 下载文件请求 ==========')
      console.log('简历ID:', req.params.id)

      const resume = resumeStmt.getById(req.params.id)
      if (!resume) {
        console.log('简历记录不存在')
        return res.status(404).json({ code: 404, success: false, message: '简历记录不存在' })
      }

      console.log('数据库中的文件路径:', resume.file_path)

      const absolutePath = getAbsoluteFilePath(resume.file_path)
      console.log('解析后的绝对路径:', absolutePath)

      if (!absolutePath || !fs.existsSync(absolutePath)) {
        console.log('文件不存在:', absolutePath)
        return res.status(404).json({ code: 404, success: false, message: '简历文件不存在' })
      }

      const fileName = encodeURIComponent(resume.name || resume.file_name || 'file')
      console.log('文件名:', fileName)
      console.log('文件大小:', fs.statSync(absolutePath).size, 'bytes')
      console.log('==============================')

      res.setHeader('Content-Type', resume.type || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.sendFile(path.resolve(absolutePath))
    } catch (error) {
      console.error('下载文件错误:', error)
      res.status(500).json({ code: 500, success: false, message: error.message })
    }
  }
}

module.exports = resumeController
