const express = require('express')
const cors = require('cors')
const { initDatabase, positionStmt, resumeStmt } = require('./database')
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
    
    const timestamp = Date.now()
    const ext = path.extname(name)
    const baseName = path.basename(name, ext)
    
    // 使用时间戳和原始文件名
    const fileName = `${timestamp}_${baseName}${ext}`
    recordFileName = info.filename
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
      console.log('文件接收完成，大小:', size)
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
      
      // 重命名临时文件到正式文件
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        if (filePath !== tempFilePath) {
          fs.renameSync(tempFilePath, filePath)
        }
      }
      
      console.log('\n========== 上传简历 ==========')
      console.log('文件名:', recordFileName)
      console.log('文件大小:', size, 'bytes')
      console.log('文件类型:', type)
      console.log('文件路径:', filePath)
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error('文件未正确保存')
      }
      
      const result = await parserFactory.parse(filePath, recordFileName)
      
      console.log('\n========== 解析结果 ==========')
      console.log('候选人姓名:', result.candidateName)
      console.log('内容长度:', result.content?.length || 0, '字符')
      console.log('内容预览:', result.content?.substring(0, 200) || '无')
      console.log('================================\n')
      
      // 确保所有值都是字符串
      const insertResult = resumeStmt.insert(
        String(positionId),
        String(recordFileName),
        String(size),
        String(type || ''),
        String(filePath),
        String(result.candidateName || '未知'),
        String(result.content || '')
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
    console.log('内容预览:', result.content?.substring(0, 200) || '无')
    console.log('================================\n')
    
    resumeStmt.updateContent(req.params.id, String(result.candidateName || '未知'), String(result.content || ''))
    
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

async function startServer() {
  try {
    await initDatabase()
    console.log('数据库初始化完成')
    console.log('当前解析器:', parserFactory.getCurrentParser())
    console.log('可用解析器:', parserFactory.getAvailableParsers())
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log(`Upload directory: ${UPLOAD_DIR}`)
      console.log(`Database file: ${path.join(__dirname, 'resume.db')}`)
    })
  } catch (error) {
    console.error('启动服务器失败:', error)
    process.exit(1)
  }
}

startServer()
