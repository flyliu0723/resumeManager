const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const dbPath = path.join(__dirname, 'resume.db')

async function migrate() {
  const SQL = await initSqlJs()
  
  if (!fs.existsSync(dbPath)) {
    console.log('数据库不存在')
    return
  }
  
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)
  
  console.log('开始迁移数据...\n')
  
  // 获取所有旧数据
  const oldResumes = db.exec(`
    SELECT id, position_id, candidate_name, parsed_data, content, 
           evaluation, match_score, questions, status, created_at
    FROM resumes 
    WHERE position_id IS NOT NULL
    ORDER BY id
  `)
  
  if (!oldResumes[0] || oldResumes[0].values.length === 0) {
    console.log('没有需要迁移的旧数据')
    db.close()
    return
  }
  
  const columns = oldResumes[0].columns
  const values = oldResumes[0].values
  
  console.log(`找到 ${values.length} 条需要迁移的记录\n`)
  
  let migrated = 0
  let skipped = 0
  
  for (const row of values) {
    const id = row[columns.indexOf('id')]
    const positionId = row[columns.indexOf('position_id')]
    const evaluation = row[columns.indexOf('evaluation')]
    const matchScore = row[columns.indexOf('match_score')]
    const questions = row[columns.indexOf('questions')]
    const status = row[columns.indexOf('status')]
    
    // 检查是否已存在
    const existing = db.exec(
      'SELECT id FROM position_resumes WHERE resume_id = ? AND position_id = ?',
      [id, positionId]
    )
    
    if (existing[0] && existing[0].values.length > 0) {
      console.log(`跳过: resume ${id} -> position ${positionId} (已存在)`)
      skipped++
      continue
    }
    
    // 插入到 position_resumes
    try {
      db.run(`
        INSERT INTO position_resumes (resume_id, position_id, evaluation, match_score, questions, status, matched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id, 
        positionId, 
        evaluation || '', 
        matchScore || 0, 
        questions || '[]', 
        status || '待沟通',
        row[columns.indexOf('created_at')] || 'CURRENT_TIMESTAMP'
      ])
      
      console.log(`迁移: resume ${id} -> position ${positionId}`)
      migrated++
    } catch (e) {
      console.error(`错误: ${e.message}`)
      skipped++
    }
  }
  
  // 保存数据库
  const exportData = db.export()
  const outputBuffer = Buffer.from(exportData)
  fs.writeFileSync(dbPath, outputBuffer)
  
  console.log(`\n迁移完成!`)
  console.log(`  成功: ${migrated}`)
  console.log(`  跳过: ${skipped}`)
  
  // 验证
  const newCount = db.exec('SELECT COUNT(*) FROM position_resumes')
  console.log(`\nposition_resumes 表现在有 ${newCount[0].values[0][0]} 条记录`)
  
  db.close()
}

migrate().catch(console.error)
