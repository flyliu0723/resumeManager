const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const serverFile = path.join(__dirname, 'index.js')
const watchDirs = [__dirname]
const ignoreDirs = ['node_modules', 'uploads', '.git']
const ignoreExtensions = ['.db', '.log', '.tmp']

let server = null

function log(message) {
  const time = new Date().toLocaleTimeString('zh-CN')
  console.log(`[${time}] ${message}`)
}

function startServer() {
  if (server) {
    server.kill('SIGTERM')
    log('停止旧服务...')
  }
  
  log('启动服务...')
  
  server = spawn('node', [serverFile], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  })
  
  server.on('error', (err) => {
    log(`启动错误: ${err.message}`)
  })
  
  server.on('exit', (code) => {
    if (code !== null && code !== 0) {
      log(`服务异常退出，代码: ${code}`)
    }
  })
}

function shouldIgnore(file) {
  const relativePath = path.relative(__dirname, file)
  const parts = relativePath.split(path.sep)
  
  if (parts.some(part => ignoreDirs.includes(part))) return true
  
  const ext = path.extname(file)
  if (ignoreExtensions.includes(ext)) return true
  
  return false
}

function watchFiles() {
  log('开始监听文件变化...')
  
  watchDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return
    
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return
      
      const filePath = path.join(dir, filename)
      
      if (shouldIgnore(filePath)) return
      
      log(`检测到变化: ${filename} (${eventType})`)
      startServer()
    })
  })
}

console.log(`
╔══════════════════════════════════════╗
║     后端热重载服务                    ║
╚══════════════════════════════════════╝
`)
console.log('按 Ctrl+C 停止服务')
console.log('')

startServer()
watchFiles()
