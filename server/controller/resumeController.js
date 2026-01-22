const { resumeStmt, positionResumeStmt, positionStmt, positionNoteStmt, aiConfigStmt } = require('../database')
const parserFactory = require('../parser/factory')
const AIService = require('../aiService')
const fs = require('fs')
const path = require('path')
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

  delete: (req, res) => {
    try {
      const resume = resumeStmt.getById(req.params.id)
      
      if (resume?.file_path && fs.existsSync(resume.file_path)) {
        fs.unlinkSync(resume.file_path)
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
      
      if (!fs.existsSync(resume.file_path)) {
        return error(res, '文件不存在', 404)
      }
      
      const positionId = req.query.positionId
      if (!positionId) {
        return error(res, '缺少职位ID', 400)
      }
      
      const result = await parserFactory.parse(resume.file_path, resume.name, positionId)
      
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
  }
}

module.exports = resumeController
