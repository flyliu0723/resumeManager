const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

// 检测是否在 pkg 打包环境中
const isPackaged = process.pkg !== undefined

// 确定数据目录（打包后在exe所在目录，开发时在server目录）
const DATA_DIR = isPackaged 
  ? path.dirname(process.execPath)  // exe 所在目录
  : __dirname  // server 目录

// 检查启动参数
const args = process.argv.slice(2)
const noBrowser = args.includes('--no-browser') || args.includes('-n')

console.log(`[INFO] 运行模式: ${isPackaged ? '打包环境' : '开发环境'}`)
console.log(`[INFO] 数据目录: ${DATA_DIR}`)

// 动态加载数据库模块（需要在设置 DATA_DIR 之后）
const databaseModule = require('./database')
const { initDatabase } = databaseModule

const app = express()
const PORT = 3000

// 检查端口是否被占用
function isPortInUse(port) {
  const { execSync } = require('child_process')
  try {
    execSync(`netstat -ano | findstr :${port}`)
    return true
  } catch {
    return false
  }
}

// 自动打开浏览器（仅在打包环境下）
function openBrowser(url) {
  // 开发环境不自动打开浏览器
  if (!isPackaged) {
    return
  }

  if (noBrowser) {
    console.log(`[INFO] 已跳过自动打开浏览器（使用 --no-browser 参数）`)
    return
  }

  console.log(`[INFO] 正在打开浏览器...`)

  setTimeout(() => {
    const { exec } = require('child_process')
    const platform = process.platform

    let command
    if (platform === 'win32') {
      command = `start ${url}`
    } else if (platform === 'darwin') {
      command = `open ${url}`
    } else if (platform === 'linux') {
      command = `xdg-open ${url}`
    } else {
      console.warn(`[WARN] 不支持的操作系统: ${platform}`)
      return
    }

    try {
      exec(command)
      console.log(`[INFO] 浏览器已打开: ${url}`)
    } catch (error) {
      console.warn(`[WARN] 打开浏览器失败: ${error.message}`)
      console.log(`[INFO] 请手动访问: ${url}`)
    }
  }, 1500) // 延迟1.5秒，确保服务完全启动
}

app.use(cors())
app.use(express.json())

// 上传目录（打包后放在exe目录，开发时在server/uploads）
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads', 'files')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  console.log(`[INFO] 创建上传目录: ${UPLOAD_DIR}`)
}

// 提供上传文件访问
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')))

// 前端静态文件服务
let distPath
if (isPackaged) {
  // 打包后，dist 文件在 snapshot 中
  distPath = path.join(__dirname, '..', 'dist')
} else {
  // 开发环境
  distPath = path.join(__dirname, '..', 'dist')
}

if (fs.existsSync(distPath)) {
  console.log(`[INFO] 检测到前端构建目录: ${distPath}`)
  app.use(express.static(distPath))
  
  // 所有非API请求都返回index.html（支持前端路由）
  // Express 5.x 使用新的通配符语法 /{*path}
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next()
    } else {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
} else {
  console.warn(`[WARN] 未检测到前端构建目录: ${distPath}`)
}

// API路由
const router = require('./router')
app.use('/api', router)

async function startServer() {
  try {
    console.log('[INFO] 正在初始化数据库...')
    await initDatabase()
    console.log('[INFO] 数据库初始化完成')

    console.log('[INFO] 正在初始化解析器...')
    const parserFactory = require('./parser/factory')
    parserFactory.init({ unified: {} })
    console.log(`[INFO] 当前解析器: ${parserFactory.getCurrentParser()}`)
    console.log(`[INFO] 可用解析器: ${parserFactory.getAvailableParsers().join(', ')}`)

    // 检查端口
    if (isPortInUse(PORT)) {
      console.warn(`[WARN] 端口 ${PORT} 已被占用，尝试使用端口 ${PORT + 1}`)
    }

    const server = app.listen(PORT, () => {
      const url = `http://localhost:${PORT}`
      console.log('')
      console.log('==========================================')
      console.log('  招聘管理系统已启动')
      console.log('==========================================')
      console.log(`  访问地址: ${url}`)
      console.log(`  数据目录: ${DATA_DIR}`)
      console.log(`  数据库: ${path.join(DATA_DIR, 'resume.db')}`)
      console.log(`  上传目录: ${UPLOAD_DIR}`)
      console.log('')
      console.log('  支持的AI提供商:')
      console.log('    - 智谱GLM (zhipu)')
      console.log('    - MiniMax (minimax)')
      console.log('    - DeepSeek (deepseek)')
      console.log('    - OpenAI (openai)')
      console.log('==========================================')
      console.log('')
      console.log('按 Ctrl+C 停止服务')
      
      // 自动打开浏览器
      openBrowser(url)
    })

    // 处理退出信号
    const signals = ['SIGINT', 'SIGTERM']
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n[INFO] 正在停止服务...`)
        server.close(() => {
          console.log('[INFO] 服务已停止')
          process.exit(0)
        })
      })
    })

  } catch (error) {
    console.error('[ERROR] 启动服务器失败:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

startServer()
