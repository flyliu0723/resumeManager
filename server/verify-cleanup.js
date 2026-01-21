const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const dbPath = path.join(__dirname, 'resume.db')

async function verify() {
  const SQL = await initSqlJs()
  
  if (!fs.existsSync(dbPath)) {
    console.log('数据库不存在')
    return
  }
  
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)
  
  console.log('验证数据库结构...\n')
  
  // 检查 resumes 表
  const resumeColumns = db.exec("PRAGMA table_info(resumes)")
  const resumeColumnNames = resumeColumns[0]?.values.map(row => row[1]) || []
  console.log('resumes 表字段:', resumeColumnNames)
  
  // 检查 position_resumes 表
  const prColumns = db.exec("PRAGMA table_info(position_resumes)")
  const prColumnNames = prColumns[0]?.values.map(row => row[1]) || []
  console.log('position_resumes 表字段:', prColumnNames)
  
  // 统计
  const resumeCount = db.exec("SELECT COUNT(*) FROM resumes")
  const matchCount = db.exec("SELECT COUNT(*) FROM position_resumes")
  console.log('\n记录数:')
  console.log('  resumes 表:', resumeCount[0].values[0][0])
  console.log('  position_resumes 表:', matchCount[0].values[0][0])
  
  // 测试 API 返回的数据格式
  const matches = db.exec(`
    SELECT pr.id, pr.resume_id, pr.position_id, pr.match_score, pr.status, 
           r.candidate_name, r.parsed_data
    FROM position_resumes pr
    JOIN resumes r ON pr.resume_id = r.id
    WHERE pr.position_id = 17
  `)
  
  console.log('\n职位 17 下的候选人 (来自 position_resumes):')
  if (matches[0] && matches[0].values.length > 0) {
    console.log(`找到 ${matches[0].values.length} 条记录`)
    console.table(matches[0].values.map(row => ({
      match_id: row[0],
      resume_id: row[1],
      candidate_name: row[5],
      match_score: row[3],
      status: row[4]
    })))
  } else {
    console.log('没有找到记录')
  }
  
  db.close()
}

verify().catch(console.error)
