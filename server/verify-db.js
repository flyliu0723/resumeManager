const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const dbPath = path.join(__dirname, 'resume.db')

async function verify() {
  const SQL = await initSqlJs()
  
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)
  
  // 检查迁移后的数据
  const matches = db.exec(`
    SELECT pr.id, pr.resume_id, pr.position_id, pr.match_score, pr.status, 
           r.candidate_name, r.parsed_data
    FROM position_resumes pr
    JOIN resumes r ON pr.resume_id = r.id
    ORDER BY pr.id
  `)
  
  console.log('迁移后的匹配数据:')
  if (matches[0]) {
    console.table(matches[0].values.map((row, i) => ({
      'match_id': row[0],
      'resume_id': row[1],
      'position_id': row[2],
      'match_score': row[3],
      'status': row[4],
      'candidate_name': row[5]
    })))
  }
  
  // 测试获取职位下的简历
  console.log('\n测试: 获取职位 17 下的简历')
  const pos17 = db.exec(`
    SELECT pr.id, r.candidate_name, pr.match_score, pr.status
    FROM position_resumes pr
    JOIN resumes r ON pr.resume_id = r.id
    WHERE pr.position_id = 17
  `)
  
  if (pos17[0] && pos17[0].values.length > 0) {
    console.log(`找到 ${pos17[0].values.length} 条记录:`)
    console.table(pos17[0].values.map(row => ({
      id: row[0],
      candidate_name: row[1],
      match_score: row[2],
      status: row[3]
    })))
  } else {
    console.log('没有找到记录')
  }
  
  db.close()
}

verify().catch(console.error)
