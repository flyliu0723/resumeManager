const express = require('express')
const cors = require('cors')
const { initDatabase, positionStmt, positionResumeStmt, resumeStmt, aiConfigStmt, companyStmt, positionNoteStmt } = require('./database')
const path = require('path')
const fs = require('fs')
const busboy = require('busboy')
const parserFactory = require('./parser/factory')
const AIService = require('./aiService')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const UPLOAD_DIR = path.join(__dirname, 'uploads', 'files')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

app.post('/api/positions/:positionId/resumes', (req, res) => {
  let positionId = req.params.positionId
  let recordFileName = ''
  let size = 0
  let type = ''
  let filePath = ''
  let tempFilePath = ''
  
  const bb = busboy({ headers: req.headers, defParamCharset: 'utf8' })
  
  bb.on('file', (name, file, info) => {
    console.log('\n========== Busboy 接收文件 ==========')
    console.log('Field info:', info)
    console.log('Field name:', name)
    console.log('Filename:', info.filename, 'type:', typeof info.filename)
    console.log('Encoding:', info.encoding)
    console.log('MimeType:', info.mimeType)

    type = info.mimeType
    recordFileName = info.filename || 'unknown'

    const timestamp = Date.now()
    const originalName = info.filename || 'file'
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)

    const fileName = `${timestamp}_${baseName}${ext}`
    filePath = path.join(UPLOAD_DIR, fileName)

    console.log('保存路径:', filePath)

    tempFilePath = filePath + '.tmp'
    const writeStream = fs.createWriteStream(tempFilePath)

    file.on('data', (data) => {
      writeStream.write(data)
      size += data.length
    })

    file.on('end', () => {
      writeStream.end()
    })

    file.on('error', (err) => {
      console.error('文件接收错误:', err.message)
    })
  })

  bb.on('close', async () => {
    try {
      if (!recordFileName) {
        return res.status(400).json({ success: false, message: '没有上传文件' })
      }

      if (!tempFilePath || !fs.existsSync(tempFilePath)) {
        throw new Error('文件未正确接收')
      }

      await new Promise((resolve, reject) => {
        const writeStream = fs.createReadStream(tempFilePath)
        const outStream = fs.createWriteStream(filePath)

        writeStream.pipe(outStream)

        outStream.on('finish', resolve)
        outStream.on('error', reject)
      })

      fs.unlinkSync(tempFilePath)

      console.log('\n========== 上传简历 ==========')
      console.log('文件名:', recordFileName)
      console.log('文件大小:', size, 'bytes')
      console.log('文件类型:', type)
      console.log('文件路径:', filePath)

      let retries = 3
      let fileExists = false
      let fileContent = null

      while (retries > 0 && !fileExists) {
        await new Promise(r => setTimeout(r, 100))

        try {
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath)
            if (stats.size > 0) {
              fileContent = fs.readFileSync(filePath)
              if (fileContent.length > 0) {
                fileExists = true
              }
            }
          }
        } catch (e) {
          console.warn('检查文件失败，重试中...')
        }
        retries--
      }

      if (!fileExists) {
        throw new Error('文件写入失败或为空')
      }

      const ext = path.extname(recordFileName).toLowerCase()
      const unsupportedExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.tif', '.tiff']
      if (unsupportedExts.includes(ext)) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
        return res.status(400).json({ 
          success: false, 
          message: `不支持的图片格式 ${ext}，请上传 PDF 或 Word 格式的简历文件`
        })
      }

      const result = await parserFactory.parse(filePath, recordFileName, positionId)
      
      console.log('\n========== 解析结果 ==========')
      console.log('候选人姓名:', result.candidateName)
      console.log('内容长度:', result.content?.length || 0, '字符')
      console.log('解析器:', result.parser)
      console.log('================================\n')
      
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
      console.log('数据库存储结果:', newMatch)

      let parsedDataObj = null
      if (newMatch.parsed_data) {
        try {
          parsedDataObj = JSON.parse(newMatch.parsed_data)
        } catch (e) {
          console.warn('解析 parsed_data 失败:', e)
        }
      }

      const responseData = {
        ...newMatch,
        parsed_data_obj: parsedDataObj
      }

      res.json({ success: true, data: responseData })
    } catch (error) {
      console.error('上传简历失败:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  })
  
  req.pipe(bb)
})

app.post('/api/resumes/:id/parse', async (req, res) => {
  try {
    console.log(req.params.id, '>>>>>>req.params.id', req)
    const resume = resumeStmt.getById(req.params.id)
    if (!resume || !resume.file_path) {
      return res.status(404).json({ success: false, message: '简历不存在或无文件' })
    }
    
    if (!fs.existsSync(resume.file_path)) {
      return res.status(404).json({ success: false, message: '文件不存在' })
    }
    
    const positionId = req.query.positionId
    if (!positionId) {
      return res.status(400).json({ success: false, message: '缺少职位ID' })
    }
    
    console.log('\n========== 重新解析简历 ==========')
    console.log('简历ID:', req.params.id)
    console.log('文件名:', resume.name)
    console.log('文件路径:', resume.file_path)
    console.log('职位ID:', positionId)
    
    const result = await parserFactory.parse(resume.file_path, resume.name, positionId)
    
    console.log('\n========== 解析结果 ==========')
    console.log('候选人姓名:', result.candidateName)
    console.log('内容长度:', result.content?.length || 0, '字符')
    console.log('解析器:', result.parser)
    console.log('================================\n')
    
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
    res.json({ success: true, data: updatedResume })
  } catch (error) {
    console.error('重新解析失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

async function runEvaluation(matchId, resumeId, positionId, resumeContent, parsedDataStr) {
  try {
    console.log('\n========== 开始评估简历 ==========')
    console.log('匹配ID:', matchId)
    console.log('简历ID:', resumeId)
    
    const position = positionStmt.getById(positionId)
    if (!position) {
      console.error('职位不存在')
      return
    }

    const activeConfig = aiConfigStmt.getActive()
    if (!activeConfig || !activeConfig.api_key) {
      console.error('未配置AI服务')
      return
    }

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
    } catch (error) {
      console.error('合并评估失败:', error.message)
    }

    const matchScore = combinedResult.match_score || 0
    const matchLevel = combinedResult.match_level || '低'
    const questionsJson = JSON.stringify(combinedResult.questions || [])
    const evaluationJson = JSON.stringify({
      ai_summary: combinedResult.ai_summary || '',
      match_reasons: combinedResult.match_reasons || [],
      gap_analysis: combinedResult.gap_analysis || [],
      suggestions: combinedResult.suggestions || [],
      match_score: matchScore,
      match_level: matchLevel
    })

    positionResumeStmt.updateEvaluation(matchId, evaluationJson, matchScore, questionsJson)

    console.log('评估完成 - 匹配度:', matchScore, '问题数:', (combinedResult.questions || []).length)
    console.log('================================\n')
  } catch (error) {
    console.error('评估过程出错:', error)
  }
}

app.post('/api/positions/:positionId/resumes/:resumeId/evaluate', async (req, res) => {
  try {
    const { positionId, resumeId } = req.params
    
    const position = positionStmt.getById(positionId)
    if (!position) {
      return res.status(404).json({ success: false, message: '职位不存在' })
    }
    
    const resume = resumeStmt.getById(resumeId)
    if (!resume) {
      return res.status(404).json({ success: false, message: '简历不存在' })
    }
    
    let match = positionResumeStmt.getByResumeAndPosition(resumeId, positionId)
    if (!match) {
      const insertResult = positionResumeStmt.insert(resumeId, positionId)
      match = positionResumeStmt.getById(insertResult.lastInsertRowid)
    }

    setTimeout(() => {
      runEvaluation(match.id, resumeId, positionId, resume.content, resume.parsed_data || '{}')
    }, 100)

    res.json({ success: true, message: '评估已开始，请稍后刷新查看结果', data: { matchId: match.id } })
  } catch (error) {
    console.error('评估失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/positions', (req, res) => {
  try {
    const activePositions = positionStmt.getActive()
    const archivedPositions = positionStmt.getArchived()
    res.json({ 
      success: true, 
      data: {
        active: activePositions,
        archived: archivedPositions
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/positions/:id/archive', (req, res) => {
  try {
    const { reason } = req.body
    const result = positionStmt.archive(req.params.id, reason)
    if (result.changes) {
      const position = positionStmt.getById(req.params.id)
      res.json({ success: true, data: position })
    } else {
      res.status(404).json({ success: false, message: '职位不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/positions/:id/restore', (req, res) => {
  try {
    const result = positionStmt.restore(req.params.id)
    if (result.changes) {
      const position = positionStmt.getById(req.params.id)
      res.json({ success: true, data: position })
    } else {
      res.status(404).json({ success: false, message: '职位不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 职位补充信息 API
app.get('/api/positions/:positionId/notes', (req, res) => {
  try {
    const notes = positionNoteStmt.getByPosition(req.params.positionId)
    res.json({ success: true, data: notes })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/positions/:positionId/notes', (req, res) => {
  try {
    const { content } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '补充内容不能为空' })
    }
    
    const result = positionNoteStmt.insert(req.params.positionId, content.trim())
    const note = positionNoteStmt.getById(result.lastInsertRowid)
    res.json({ success: true, data: note })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/positions/:positionId/notes/:noteId', (req, res) => {
  try {
    const { content } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '补充内容不能为空' })
    }
    
    const note = positionNoteStmt.getById(req.params.noteId)
    if (!note) {
      return res.status(404).json({ success: false, message: '补充信息不存在' })
    }
    
    const result = positionNoteStmt.update(req.params.noteId, content.trim())
    if (result.changes) {
      const updatedNote = positionNoteStmt.getById(req.params.noteId)
      res.json({ success: true, data: updatedNote })
    } else {
      const refreshedNote = positionNoteStmt.getById(req.params.noteId)
      if (refreshedNote) {
        res.json({ success: true, data: refreshedNote })
      } else {
        res.json({ success: true, message: '更新成功' })
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/positions/:positionId/notes/:noteId', (req, res) => {
  try {
    const result = positionNoteStmt.delete(req.params.noteId)
    if (result.changes) {
      res.json({ success: true, message: '删除成功' })
    } else {
      res.json({ success: true, message: '删除成功或记录不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/positions/:id', (req, res) => {
  try {
    const position = positionStmt.getById(req.params.id)
    if (position) {
      res.json({ success: true, data: position })
    } else {
      res.status(404).json({ success: false, message: '职位不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/positions', (req, res) => {
  try {
    const { name, company, description, start_date } = req.body
    console.log('\n========== 创建职位 ==========')
    console.log('请求体:', req.body)
    console.log('name:', name, 'company:', company, 'description:', description, 'start_date:', start_date)
    
    if (!name) {
      return res.status(400).json({ success: false, message: '职位名称不能为空' })
    }
    
    if (company) {
      companyStmt.insert(company)
    }
    
    const result = positionStmt.insert(String(name), String(company || ''), String(description || ''), String(start_date || ''))
    console.log('插入结果:', result)
    
    const newPosition = positionStmt.getById(result.lastInsertRowid)
    console.log('查询新职位:', newPosition)
    console.log('================================\n')
    
    res.json({ success: true, data: newPosition })
  } catch (error) {
    console.error('创建职位失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/positions/:id', (req, res) => {
  try {
    const position = positionStmt.getById(req.params.id)
    if (!position) {
      return res.status(404).json({ success: false, message: '职位不存在' })
    }
    
    if (position.status === 'archived') {
      return res.status(400).json({ success: false, message: '已归档的职位不能编辑' })
    }
    
    const { name, company, description, start_date } = req.body
    
    if (company) {
      companyStmt.insert(company)
    }
    
    const result = positionStmt.update(req.params.id, String(name), String(company || ''), String(description || ''), String(start_date || ''))
    
    if (result.changes) {
      const updatedPosition = positionStmt.getById(req.params.id)
      res.json({ success: true, data: updatedPosition })
    } else {
      res.status(404).json({ success: false, message: '职位不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/positions/:id', (req, res) => {
  try {
    const result = positionStmt.delete(Number(req.params.id))
    if (result.changes) {
      res.json({ success: true, message: '删除成功' })
    } else {
      res.status(404).json({ success: false, message: '职位不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/companies', (req, res) => {
  try {
    const companies = companyStmt.getAll()
    res.json({ success: true, data: companies })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/companies/search', (req, res) => {
  try {
    const { keyword } = req.query
    if (!keyword) {
      return res.json({ success: true, data: [] })
    }
    const companies = companyStmt.search(keyword)
    res.json({ success: true, data: companies })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/resumes/:id', (req, res) => {
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
      
      let evaluation = null
      if (resume.evaluation) {
        try {
          evaluation = JSON.parse(resume.evaluation)
        } catch (e) {
          console.warn('解析 evaluation 失败:', e)
        }
      }
      
      res.json({ 
        success: true, 
        data: {
          ...resume,
          parsed_data_obj: parsedData,
          evaluation_obj: evaluation
        }
      })
    } else {
      res.status(404).json({ success: false, message: '简历不存在' })
    }
  } catch (error) {
    console.error('获取简历详情失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/positions/:positionId/resumes', (req, res) => {
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
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/resumes/:id', (req, res) => {
  try {
    const resume = resumeStmt.getById(req.params.id)
    console.log('\n========== 删除简历 ==========')
    console.log('简历ID:', req.params.id)
    console.log('简历信息:', resume)
    console.log('文件路径:', resume?.file_path)
    
    if (resume?.file_path && fs.existsSync(resume.file_path)) {
      fs.unlinkSync(resume.file_path)
      console.log('文件已删除:', resume.file_path)
    }
    
    const result = resumeStmt.delete(req.params.id)
    console.log('删除结果:', result)
    console.log('影响行数:', result.changes)
    console.log('================================\n')
    
    if (result.changes) {
      res.json({ success: true, message: '删除成功' })
    } else {
      res.json({ success: true, message: '删除成功或记录不存在' })
    }
  } catch (error) {
    console.error('删除简历失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/resumes/:id/preview', (req, res) => {
  try {
    const resume = resumeStmt.getById(req.params.id)
    if (resume && resume.file_path && fs.existsSync(resume.file_path)) {
      const fileName = encodeURIComponent(resume.name)
      res.setHeader('Content-Type', resume.type || 'application/octet-stream')
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
      res.sendFile(path.resolve(resume.file_path))
    } else {
      res.status(404).json({ success: false, message: '简历文件不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/resumes/:id/download', (req, res) => {
  try {
    const resume = resumeStmt.getById(req.params.id)
    if (resume && resume.file_path && fs.existsSync(resume.file_path)) {
      const fileName = encodeURIComponent(resume.name)
      res.setHeader('Content-Type', resume.type || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.sendFile(path.resolve(resume.file_path))
    } else {
      res.status(404).json({ success: false, message: '简历文件不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/resumes/:id/content', (req, res) => {
  try {
    const resume = resumeStmt.getById(req.params.id)
    if (resume) {
      res.json({ 
        success: true, 
        data: {
          candidateName: resume.candidate_name || '未知',
          content: resume.content || ''
        }
      })
    } else {
      res.status(404).json({ success: false, message: '简历不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/ai-configs', (req, res) => {
  try {
    const configs = aiConfigStmt.getAll()
    res.json({ success: true, data: configs })
  } catch (error) {
    console.error('获取AI配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/ai-configs/:id', (req, res) => {
  try {
    const config = aiConfigStmt.getById(req.params.id)
    if (config) {
      res.json({ success: true, data: config })
    } else {
      res.status(404).json({ success: false, message: '配置不存在' })
    }
  } catch (error) {
    console.error('获取AI配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/ai-configs/active/current', (req, res) => {
  try {
    const config = aiConfigStmt.getActive()
    res.json({ success: true, data: config })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/ai-configs', (req, res) => {
  try {
    const { name, provider, api_key, api_url, model, priority } = req.body
    
    if (!name || !provider) {
      return res.status(400).json({ success: false, message: '名称和提供商不能为空' })
    }

    const result = aiConfigStmt.insert(name, provider, api_key, api_url, model, priority || 0)
    const newConfig = aiConfigStmt.getById(result.lastInsertRowid)
    
    res.json({ success: true, data: newConfig })
  } catch (error) {
    console.error('创建AI配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/ai-configs/:id', (req, res) => {
  try {
    const { name, provider, api_key, api_url, model, is_active, priority } = req.body
    
    if (!name || !provider) {
      return res.status(400).json({ success: false, message: '名称和提供商不能为空' })
    }

    aiConfigStmt.update(req.params.id, name, provider, api_key, api_url, model, is_active, priority)
    const updatedConfig = aiConfigStmt.getById(req.params.id)
    
    res.json({ success: true, data: updatedConfig })
  } catch (error) {
    console.error('更新AI配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/ai-configs/:id/set-active', (req, res) => {
  try {
    aiConfigStmt.setActive(req.params.id)
    const config = aiConfigStmt.getById(req.params.id)
    res.json({ success: true, data: config })
  } catch (error) {
    console.error('设置激活配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/ai-configs/:id/test', (req, res) => {
  try {
    const result = aiConfigStmt.test(req.params.id)
    res.json(result)
  } catch (error) {
    console.error('测试AI配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.put('/api/position-resumes/:id/status', (req, res) => {
  try {
    const { status } = req.body
    if (!status) {
      return res.status(400).json({ success: false, message: '状态不能为空' })
    }
    
    const result = positionResumeStmt.updateStatus(req.params.id, status)
    if (result.changes) {
      const match = positionResumeStmt.getById(req.params.id)
      res.json({ success: true, data: match })
    } else {
      res.status(404).json({ success: false, message: '匹配记录不存在' })
    }
  } catch (error) {
    console.error('更新状态失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.delete('/api/ai-configs/:id', (req, res) => {
  try {
    const config = aiConfigStmt.getById(req.params.id)
    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' })
    }
    
    aiConfigStmt.delete(req.params.id)
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除AI配置失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/ai-providers', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'zhipu', label: '智谱GLM', fields: ['api_key', 'model'], apiUrl: 'https://open.bigmodel.cn/api/paas/v4' },
      { value: 'minimax', label: 'MiniMax', fields: ['api_key', 'model'], apiUrl: 'https://api.minimax.chat/v1' },
      { value: 'deepseek', label: 'DeepSeek', fields: ['api_key', 'model'], apiUrl: 'https://api.deepseek.com' },
      { value: 'openai', label: 'OpenAI', fields: ['api_key', 'api_url', 'model'] }
    ]
  })
})

app.get('/api/ai-models', (req, res) => {
  const { provider } = req.query
  let models = []

  if (provider === 'zhipu') {
    models = [
      { value: 'glm-4', label: 'GLM-4 (推荐, 较强推理)' },
      { value: 'glm-4v', label: 'GLM-4V (支持图像)' },
      { value: 'glm-3-turbo', label: 'GLM-3 Turbo (快速, 便宜)' }
    ]
  } else if (provider === 'minimax') {
    models = [
      { value: 'abab6.5s-chat', label: 'abab6.5s-chat (快速)' },
      { value: 'abab6.5-chat', label: 'abab6.5-chat (较强)' },
      { value: 'abab5.5s-chat', label: 'abab5.5s-chat (便宜)' }
    ]
  } else if (provider === 'deepseek') {
    models = [
      { value: 'deepseek-chat', label: 'DeepSeek Chat (推荐, 性价比高)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (推理强)' }
    ]
  } else if (provider === 'openai') {
    models = [
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (推荐, 快速)' },
      { value: 'gpt-4', label: 'GPT-4 (更智能, 较慢)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
    ]
  }

  res.json({ success: true, data: models })
})

async function startServer() {
  try {
    await initDatabase()
    console.log('数据库初始化完成')

    parserFactory.init({
      unified: {}
    })

    console.log('当前解析器:', parserFactory.getCurrentParser())
    console.log('可用解析器:', parserFactory.getAvailableParsers())

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log(`Upload directory: ${UPLOAD_DIR}`)
      console.log(`Database file: ${path.join(__dirname, 'resume.db')}`)
      console.log('\n支持的AI提供商:')
      console.log('  - 智谱GLM (zhipu)')
      console.log('  - MiniMax (minimax)')
      console.log('  - DeepSeek (deepseek)')
      console.log('  - OpenAI (openai)')
    })
  } catch (error) {
    console.error('启动服务器失败:', error)
    process.exit(1)
  }
}

startServer()
