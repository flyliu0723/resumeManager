const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const dbPath = path.join(__dirname, 'resume.db')

async function cleanupResumesTable() {
  const SQL = await initSqlJs()
  
  if (!fs.existsSync(dbPath)) {
    console.log('数据库不存在')
    return
  }
  
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)
  
  console.log('开始清理 resumes 表...\n')
  
  // 检查当前表结构
  const columns = db.exec("PRAGMA table_info(resumes)")
  const columnNames = columns[0]?.values.map(row => row[1]) || []
  console.log('当前 resumes 表字段:', columnNames)
  
  // 要删除的字段
  const fieldsToRemove = ['position_id', 'evaluation', 'match_score', 'questions', 'status']
  const existingFieldsToRemove = fieldsToRemove.filter(f => columnNames.includes(f))
  
  console.log('\n将删除的字段:', existingFieldsToRemove)
  
  if (existingFieldsToRemove.length === 0) {
    console.log('没有需要删除的字段')
    db.close()
    return
  }
  
  // SQLite 不支持直接删除列，需要重建表
  // 1. 创建新表
  const newTableSQL = `
    CREATE TABLE resumes_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      size TEXT,
      type TEXT,
      file_path TEXT,
      candidate_name TEXT,
      content TEXT,
      parsed_data TEXT,
      parsed_at DATETIME,
      parser TEXT,
      model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  db.run(newTableSQL)
  console.log('创建新表 resumes_new')
  
  // 2. 复制数据
  const remainingFields = columnNames.filter(f => !existingFieldsToRemove.includes(f))
  db.run(`INSERT INTO resumes_new (${remainingFields.join(', ')}) SELECT ${remainingFields.join(', ')} FROM resumes`)
  console.log('复制数据到新表')
  
  // 3. 删除旧表
  db.run('DROP TABLE resumes')
  console.log('删除旧表 resumes')
  
  // 4. 重命名新表
  db.run('ALTER TABLE resumes_new RENAME TO resumes')
  console.log('重命名新表为 resumes')
  
  // 保存数据库
  const exportData = db.export()
  const outputBuffer = Buffer.from(exportData)
  fs.writeFileSync(dbPath, outputBuffer)
  
  // 验证
  const newColumns = db.exec("PRAGMA table_info(resumes)")
  const newColumnNames = newColumns[0]?.values.map(row => row[1]) || []
  console.log('\n清理后 resumes 表字段:', newColumnNames)
  
  const count = db.exec("SELECT COUNT(*) as count FROM resumes")
  console.log('resumes 表记录数:', count[0].values[0][0])
  
  db.close()
  console.log('\n清理完成!')
}

cleanupResumesTable().catch(console.error)
