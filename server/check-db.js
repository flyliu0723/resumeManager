const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const dbPath = path.join(__dirname, 'resume.db')

async function main() {
  const SQL = await initSqlJs()
  
  if (!fs.existsSync(dbPath)) {
    console.log('数据库不存在，将创建新数据库')
    return
  }
  
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)
  
  // 检查表结构
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
  console.log('当前表:', tables[0]?.values.map(v => v[0]))
  
  // 检查 resumes 表是否有 position_id 字段
  const resumeColumns = db.exec("PRAGMA table_info(resumes)")
  const resumeColumnNames = resumeColumns[0]?.values.map(row => row[1]) || []
  console.log('resumes 表字段:', resumeColumnNames)
  
  // 检查 position_resumes 表
  const prColumns = db.exec("PRAGMA table_info(position_resumes)")
  const prColumnNames = prColumns[0]?.values.map(row => row[1]) || []
  console.log('position_resumes 表字段:', prColumnNames)
  
  // 统计旧数据
  if (resumeColumnNames.includes('position_id')) {
    const oldResumes = db.exec("SELECT id, position_id FROM resumes WHERE position_id IS NOT NULL")
    console.log('resumes 表中有 position_id 的记录数:', oldResumes[0]?.values.length || 0)
  }
  
  // 统计新表数据
  const newMatches = db.exec("SELECT COUNT(*) as count FROM position_resumes")
  console.log('position_resumes 表记录数:', newMatches[0]?.values[0][0] || 0)
  
  // 检查数据
  const sampleOld = db.exec("SELECT id, position_id, candidate_name FROM resumes WHERE position_id IS NOT NULL LIMIT 5")
  if (sampleOld[0]) {
    console.log('旧数据示例:')
    console.table(sampleOld[0].values.map(row => ({ id: row[0], position_id: row[1], candidate_name: row[2] })))
  }
  
  const sampleNew = db.exec("SELECT id, resume_id, position_id FROM position_resumes LIMIT 5")
  if (sampleNew[0]) {
    console.log('新数据示例:')
    console.table(sampleNew[0].values.map(row => ({ id: row[0], resume_id: row[1], position_id: row[2] })))
  }
  
  db.close()
}

main().catch(console.error)
