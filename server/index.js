const express = require('express')
const cors = require('cors')
const { initDatabase } = require('./database')
const path = require('path')
const fs = require('fs')
const router = require('./router')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const UPLOAD_DIR = path.join(__dirname, 'uploads', 'files')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

app.use('/api', router)

async function startServer() {
  try {
    await initDatabase()
    console.log('数据库初始化完成')

    const parserFactory = require('./parser/factory')
    parserFactory.init({ unified: {} })

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
