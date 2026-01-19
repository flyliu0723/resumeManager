const express = require('express')
const cors = require('cors')
const { initDatabase, positionStmt, resumeStmt, aiConfigStmt } = require('./database')
const path = require('path')
const fs = require('fs')
const busboy = require('busboy')
const parserFactory = require('./parser/factory')

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
  console.log(req, '>>>>>>>req')
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

      const result = await parserFactory.parse(filePath, recordFileName)
      
      console.log('\n========== 解析结果 ==========')
      console.log('候选人姓名:', result.candidateName)
      console.log('内容长度:', result.content?.length || 0, '字符')
      console.log('解析器:', result.parser)
      console.log('================================\n')
      
      // 将结构化数据转换为JSON字符串存储
      const parsedData = JSON.stringify({
        name: result.candidateName,
        email: result.structuredData?.email,
        mobile: result.structuredData?.mobile,
        skills: result.structuredData?.skills || [],
        education: result.structuredData?.education,
        experience: result.structuredData?.experience,
        companies: result.structuredData?.companies || [],
        summary: result.structuredData?.ai_summary
      })

      // 存储到数据库
      const insertResult = resumeStmt.insert(
        String(positionId),
        String(recordFileName),
        String(size),
        String(type || ''),
        String(filePath),
        String(result.candidateName || '未知'),
        String(result.content || '')
      )

      // 更新解析结果
      resumeStmt.updateParsedData(
        insertResult.lastInsertRowid,
        parsedData,
        result.candidateName || '未知',
        result.content || '',
        result.parser,
        result.structuredData?.model || ''
      )
      
      const newResume = resumeStmt.getById(insertResult.lastInsertRowid)
      console.log('数据库存储结果:', newResume)
      
      res.json({ success: true, data: newResume })
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
    
    console.log('\n========== 重新解析简历 ==========')
    console.log('简历ID:', req.params.id)
    console.log('文件名:', resume.name)
    console.log('文件路径:', resume.file_path)
    
    const result = await parserFactory.parse(resume.file_path, resume.name)
    
    console.log('\n========== 解析结果 ==========')
    console.log('候选人姓名:', result.candidateName)
    console.log('内容长度:', result.content?.length || 0, '字符')
    console.log('解析器:', result.parser)
    console.log('================================\n')
    
    // 将结构化数据转换为JSON字符串存储
    const parsedData = JSON.stringify({
      name: result.candidateName,
      email: result.structuredData?.email,
      mobile: result.structuredData?.mobile,
      skills: result.structuredData?.skills || [],
      education: result.structuredData?.education,
      experience: result.structuredData?.experience,
      companies: result.structuredData?.companies || [],
      summary: result.structuredData?.ai_summary
    })

    // 更新解析结果（覆盖旧数据）
    resumeStmt.updateParsedData(
      req.params.id,
      parsedData,
      result.candidateName || '未知',
      result.content || '',
      result.parser,
      result.structuredData?.model || ''
    )
    
    const updatedResume = resumeStmt.getById(req.params.id)
    res.json({ success: true, data: updatedResume })
  } catch (error) {
    console.error('重新解析失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/positions', (req, res) => {
  try {
    const positions = positionStmt.getAll()
    res.json({ success: true, data: positions })
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
    const { name, description } = req.body
    console.log('\n========== 创建职位 ==========')
    console.log('请求体:', req.body)
    console.log('name:', name, 'description:', description)
    
    if (!name) {
      return res.status(400).json({ success: false, message: '职位名称不能为空' })
    }
    
    const result = positionStmt.insert(String(name), String(description || ''))
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
    const { name, description } = req.body
    const result = positionStmt.update(String(name), String(description || ''), req.params.id)
    if (result.changes > 0) {
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
    const result = positionStmt.delete(req.params.id)
    if (result.changes > 0) {
      res.json({ success: true, message: '删除成功' })
    } else {
      res.status(404).json({ success: false, message: '职位不存在' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})
// 获取职位下的所有简历
app.get('/api/positions/:positionId/resumes', (req, res) => {
  try {
    const resumes = resumeStmt.getByPosition(req.params.positionId)
    res.json({ success: true, data: resumes })
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
    
    // 删除文件（如果存在）
    if (resume?.file_path && fs.existsSync(resume.file_path)) {
      fs.unlinkSync(resume.file_path)
      console.log('文件已删除:', resume.file_path)
    }
    
    // 执行删除
    const result = resumeStmt.delete(req.params.id)
    console.log('删除结果:', result)
    console.log('影响行数:', result.changes)
    console.log('================================\n')
    
    if (result.changes > 0) {
      res.json({ success: true, message: '删除成功' })
    } else {
      // 即使没找到记录也返回成功，因为可能已经被删了
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

// ==================== AI 配置 API ====================

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

// ==================== 提供商选项 ====================

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
