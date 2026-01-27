const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const dbPath = path.join(__dirname, 'resume.db')
let db = null

async function initDatabase() {
  const SQL = await initSqlJs()
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('加载已有数据库')
  } else {
    db = new SQL.Database()
    console.log('创建新数据库')
  }
  
  // 检查表是否存在，不存在则创建
  const tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='positions'")
  if (tableCheck.length === 0) {
    db.run(`
      CREATE TABLE positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT,
        description TEXT,
        start_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('创建 positions 表')
  } else {
    const columnCheck = db.exec("PRAGMA table_info(positions)")
    const columns = columnCheck.length > 0 ? columnCheck[0].values.map(row => row[1]) : []
    
    if (!columns.includes('company')) {
      db.run('ALTER TABLE positions ADD COLUMN company TEXT')
      console.log('添加 company 字段')
    }
    if (!columns.includes('start_date')) {
      db.run('ALTER TABLE positions ADD COLUMN start_date DATE')
      console.log('添加 start_date 字段')
    }
    if (!columns.includes('status')) {
      db.run('ALTER TABLE positions ADD COLUMN status TEXT DEFAULT "active"')
      console.log('添加 status 字段')
    }
    if (!columns.includes('archive_reason')) {
      db.run('ALTER TABLE positions ADD COLUMN archive_reason TEXT')
      console.log('添加 archive_reason 字段')
    }
    if (!columns.includes('archived_at')) {
      db.run('ALTER TABLE positions ADD COLUMN archived_at DATETIME')
      console.log('添加 archived_at 字段')
    }
  }
  
  // 公司表
  const companyTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'")
  if (companyTableCheck.length === 0) {
    db.run(`
      CREATE TABLE companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('创建 companies 表')
  }
  
   // 简历表（存储简历文件信息，与职位解耦）
  const resumeTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='resumes'")
  if (resumeTableCheck.length === 0) {
    db.run(`
      CREATE TABLE resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        size TEXT,
        type TEXT,
        file_path TEXT,
        file_format TEXT,
        candidate_name TEXT,
        content TEXT,
        parsed_data TEXT,
        parsed_at DATETIME,
        parser TEXT,
        model TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('创建 resumes 表')
  } else {
    // 检查并添加 file_format 字段
    const columnCheck = db.exec("PRAGMA table_info(resumes)")
    const columns = columnCheck.length > 0 ? columnCheck[0].values.map(row => row[1]) : []
    
    if (!columns.includes('file_format')) {
      db.run('ALTER TABLE resumes ADD COLUMN file_format TEXT')
      console.log('添加 file_format 字段到 resumes 表')
      
      // 为现有记录根据文件名推断格式
      const existingResumes = all('SELECT id, name FROM resumes')
      for (const resume of existingResumes) {
        const ext = resume.name.split('.').pop().toLowerCase()
        const format = ext === 'pdf' ? 'PDF' : ext === 'docx' ? 'DOCX' : ext === 'doc' ? 'DOC' : 'OTHER'
        run('UPDATE resumes SET file_format = ? WHERE id = ?', [format, resume.id])
      }
      console.log('更新现有记录的 file_format')
    }
  }

  // 简历-职位匹配表（一个简历可匹配多个职位）
  const positionResumeTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='position_resumes'")
  if (positionResumeTableCheck.length === 0) {
    db.run(`
      CREATE TABLE position_resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id INTEGER NOT NULL,
        position_id INTEGER NOT NULL,
        evaluation TEXT,
        match_score INTEGER,
        questions TEXT,
        status TEXT DEFAULT '待沟通',
        current_status TEXT DEFAULT '待沟通',
        matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        flow_start_at DATETIME,
        FOREIGN KEY (resume_id) REFERENCES resumes(id),
        FOREIGN KEY (position_id) REFERENCES positions(id),
        UNIQUE(resume_id, position_id)
      )
    `)
    console.log('创建 position_resumes 表')
  } else {
    // 检查并添加 current_status 和 flow_start_at 字段
    const columnCheck = db.exec("PRAGMA table_info(position_resumes)")
    const columns = columnCheck.length > 0 ? columnCheck[0].values.map(row => row[1]) : []
    
    if (!columns.includes('current_status')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN current_status TEXT DEFAULT "待沟通"')
      console.log('添加 current_status 字段到 position_resumes 表')
    }
    if (!columns.includes('flow_start_at')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN flow_start_at DATETIME')
      console.log('添加 flow_start_at 字段到 position_resumes 表')
    }
    if (!columns.includes('update_time')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN update_time DATETIME')
      console.log('添加 update_time 字段到 position_resumes 表')
    }
  }

  // 流程日志表
  const flowLogTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='position_resume_flow_logs'")
  if (flowLogTableCheck.length === 0) {
    db.run(`
      CREATE TABLE position_resume_flow_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        note TEXT,
        jd_supplement TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES position_resumes(id)
      )
    `)
    console.log('创建 position_resume_flow_logs 表')
  }

  // 职位补充信息表
  const noteTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='position_notes'")
  if (noteTableCheck.length === 0) {
    db.run(`
      CREATE TABLE position_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )
    `)
    console.log('创建 position_notes 表')
  }

  // AI 配置表
  const configTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_configs'")
  if (configTableCheck.length === 0) {
    db.run(`
      CREATE TABLE ai_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        api_key TEXT,
        api_url TEXT,
        model TEXT,
        is_active INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('创建 ai_configs 表')

    // 添加默认配置 - 使用智谱GLM
    db.run(`INSERT INTO ai_configs (name, provider, api_url, model, is_active, priority) VALUES (?, ?, ?, ?, ?, ?)`,
      ['智谱GLM-4.7', 'zhipu', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4.7', 1, 0])
    console.log('添加默认智谱GLM配置')
  }
  
  saveDatabase()
  
  return db
}

function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

function run(sql, params = []) {
  const changes = db.run(sql, params)
  saveDatabase()
  return { changes }
}

function get(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

function all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function lastInsertRowid() {
  const stmt = db.prepare('SELECT last_insert_rowid() as id')
  stmt.bind()
  if (stmt.step()) {
    const id = stmt.getAsObject().id
    stmt.free()
    return id
  }
  stmt.free()
  return null
}

const positionStmt = {
  insert: (name, company, description, start_date) => {
    console.log('\n========== positionStmt.insert ==========')
    console.log('name:', name)
    console.log('company:', company)
    console.log('description:', description)
    console.log('start_date:', start_date)
    
    const result = db.run('INSERT INTO positions (name, company, description, start_date, status) VALUES (?, ?, ?, ?, ?)', [name, company || '', description || '', start_date || '', 'active'])
    
    console.log('插入结果:', result)
    let lastId = lastInsertRowid()
    console.log('lastInsertRowid:', lastId)
    
    saveDatabase()
    console.log('==========================================\n')
    
    return { lastInsertRowid: lastId }
  },
  update: (id, name, company, description, start_date) => run('UPDATE positions SET name = ?, company = ?, description = ?, start_date = ? WHERE id = ?', [name, company || '', description || '', start_date || '', Number(id)]),
  archive: (id, reason) => run('UPDATE positions SET status = ?, archive_reason = ?, archived_at = CURRENT_TIMESTAMP WHERE id = ?', ['archived', reason || '', Number(id)]),
  restore: (id) => run('UPDATE positions SET status = ?, archive_reason = ?, archived_at = ? WHERE id = ?', ['active', '', null, Number(id)]),
  delete: (id) => run('DELETE FROM positions WHERE id = ?', [Number(id)]),
  getAll: () => all('SELECT * FROM positions ORDER BY created_at DESC'),
  getActive: () => all("SELECT * FROM positions WHERE status = 'active' ORDER BY created_at DESC"),
  getArchived: () => all("SELECT * FROM positions WHERE status = 'archived' ORDER BY archived_at DESC"),
  getById: (id) => get('SELECT * FROM positions WHERE id = ?', [Number(id)])
}

const companyStmt = {
  insert: (name) => {
    run('INSERT OR IGNORE INTO companies (name) VALUES (?)', [name])
    return get('SELECT * FROM companies WHERE name = ?', [name])
  },
  getAll: () => all('SELECT * FROM companies ORDER BY name'),
  search: (keyword) => all('SELECT * FROM companies WHERE name LIKE ? ORDER BY name', [`%${keyword}%`]),
  getByName: (name) => get('SELECT * FROM companies WHERE name = ?', [name])
}

const positionNoteStmt = {
  insert: (positionId, content) => {
    const result = db.run('INSERT INTO position_notes (position_id, content) VALUES (?, ?)', [Number(positionId), String(content)])
    let lastId = lastInsertRowid()
    console.log('lastInsertRowid:', lastId)
    
    saveDatabase()
    console.log('==========================================\n')
    
    return { lastInsertRowid: lastId }
  },
  update: (id, content) => run('UPDATE position_notes SET content = ? WHERE id = ?', [String(content), Number(id)]),
  delete: (id) => run('DELETE FROM position_notes WHERE id = ?', [Number(id)]),
  getByPosition: (positionId) => all('SELECT * FROM position_notes WHERE position_id = ? ORDER BY created_at ASC', [Number(positionId)]),
  getById: (id) => get('SELECT * FROM position_notes WHERE id = ?', [Number(id)])
}

const resumeStmt = {
  insert: (name, size, type, file_path, file_format, candidate_name, content) => {
    console.log('\n========== 数据库插入简历 ==========')
    console.log('name:', name)
    console.log('size:', size)
    console.log('type:', type)
    console.log('file_path:', file_path)
    console.log('file_format:', file_format)
    console.log('candidate_name:', candidate_name)
    
    const result = db.run('INSERT INTO resumes (name, size, type, file_path, file_format, candidate_name, content) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [String(name), String(size), String(type), String(file_path), String(file_format), String(candidate_name), String(content || '')])
    
    let lastId = lastInsertRowid()
    console.log('lastInsertRowid:', lastId)
    saveDatabase()
    console.log('==========================================\n')
    
    return { lastInsertRowid: lastId }
  },
  updateContent: (id, candidate_name, content) => run('UPDATE resumes SET candidate_name = ?, content = ? WHERE id = ?', [candidate_name, content, Number(id)]),
  updateParsedData: (id, parsed_data, candidate_name, content, parser, model) => {
    const sql = 'UPDATE resumes SET parsed_data = ?, candidate_name = ?, content = ?, parser = ?, model = ?, parsed_at = CURRENT_TIMESTAMP WHERE id = ?'
    run(sql, [String(parsed_data || ''), String(candidate_name || ''), String(content || ''), String(parser || ''), String(model || ''), Number(id)])
  },
  delete: (id) => run('DELETE FROM resumes WHERE id = ?', [Number(id)]),
  getById: (id) => get('SELECT * FROM resumes WHERE id = ?', [Number(id)]),
  getAll: () => all('SELECT * FROM resumes ORDER BY created_at DESC')
}

const positionResumeStmt = {
  insert: (resumeId, positionId) => {
    const result = db.run('INSERT OR IGNORE INTO position_resumes (resume_id, position_id) VALUES (?, ?)', [Number(resumeId), Number(positionId)])
    let lastId = lastInsertRowid()
    if (lastId === null) {
      const existing = db.prepare('SELECT id FROM position_resumes WHERE resume_id = ? AND position_id = ?').bind([Number(resumeId), Number(positionId)])
      if (existing.step()) {
        lastId = existing.getAsObject().id
      }
      existing.free()
    }
    saveDatabase()
    return { lastInsertRowid: lastId }
  },
  all: (sql, params = []) => {
    return all(sql, params)
  },
  get: (sql, params = []) => {
    return get(sql, params)
  },
  getByPosition: (positionId) => {
    return all(`
      SELECT pr.*, r.name as resume_name, r.candidate_name, r.parsed_data, r.content, r.file_path, r.type
      FROM position_resumes pr
      JOIN resumes r ON pr.resume_id = r.id
      WHERE pr.position_id = ?
      ORDER BY pr.matched_at DESC
    `, [Number(positionId)])
  },
  getById: (id) => {
    return get(`
      SELECT pr.*, r.name as resume_name, r.candidate_name, r.parsed_data, r.content, r.file_path, r.type
      FROM position_resumes pr
      JOIN resumes r ON pr.resume_id = r.id
      WHERE pr.id = ?
    `, [Number(id)])
  },
  updateEvaluation: (id, evaluation, match_score, questions) => {
    const sql = 'UPDATE position_resumes SET evaluation = ?, match_score = ?, questions = ? WHERE id = ?'
    run(sql, [String(evaluation), Number(match_score), String(questions), Number(id)])
  },
  updateStatus: (id, status, note, jdSupplement, updateFlowStartAt = false) => {
    let sql = 'UPDATE position_resumes SET current_status = ?, status = ?, jd_supplement = ?, update_time = CURRENT_TIMESTAMP'
    const params = [String(status), String(status), String(jdSupplement || ''), Number(id)]
    
    if (updateFlowStartAt) {
      sql += ', flow_start_at = CURRENT_TIMESTAMP'
    }
    
    sql += ' WHERE id = ?'
    run(sql, params)
  },
  updateJdSupplement: (id, jdSupplement) => {
    run('UPDATE position_resumes SET jd_supplement = ? WHERE id = ?', [String(jdSupplement || ''), Number(id)])
  },
  delete: (id) => run('DELETE FROM position_resumes WHERE id = ?', [Number(id)]),
  getByResumeAndPosition: (resumeId, positionId) => get('SELECT * FROM position_resumes WHERE resume_id = ? AND position_id = ?', [Number(resumeId), Number(positionId)])
}

const flowLogStmt = {
  insert: (matchId, fromStatus, toStatus, note, jdSupplement) => {
    const result = db.run(
      'INSERT INTO position_resume_flow_logs (match_id, from_status, to_status, note, jd_supplement) VALUES (?, ?, ?, ?, ?)',
      [Number(matchId), String(fromStatus || ''), String(toStatus), String(note || ''), String(jdSupplement || '')]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },
  getByMatchId: (matchId) => {
    return all('SELECT * FROM position_resume_flow_logs WHERE match_id = ? ORDER BY created_at ASC', [Number(matchId)])
  },
  delete: (id) => run('DELETE FROM position_resume_flow_logs WHERE id = ?', [Number(id)])
}

const candidateJdSupplementStmt = {
  insert: (matchId, content) => {
    const result = db.run(
      'INSERT INTO candidate_jd_supplements (match_id, content) VALUES (?, ?)',
      [Number(matchId), String(content)]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },
  getByMatchId: (matchId) => {
    return all('SELECT * FROM candidate_jd_supplements WHERE match_id = ? ORDER BY created_at ASC', [Number(matchId)])
  },
  delete: (id) => run('DELETE FROM candidate_jd_supplements WHERE id = ?', [Number(id)])
}

const aiConfigStmt = {
  getAll: () => all('SELECT * FROM ai_configs ORDER BY priority ASC, created_at DESC'),
  
  getById: (id) => get('SELECT * FROM ai_configs WHERE id = ?', [Number(id)]),
  
  getActive: () => get('SELECT * FROM ai_configs WHERE is_active = 1 ORDER BY priority ASC LIMIT 1'),
  
  insert: (name, provider, api_key, api_url, model, priority) => {
    const result = db.run('INSERT INTO ai_configs (name, provider, api_key, api_url, model, priority) VALUES (?, ?, ?, ?, ?, ?)',
      [String(name), String(provider), String(api_key || ''), String(api_url || ''), String(model || ''), Number(priority)])
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },
  
  update: (id, name, provider, api_key, api_url, model, is_active, priority) => {
    const sql = `UPDATE ai_configs SET 
      name = ?, provider = ?, api_key = ?, api_url = ?, model = ?, 
      is_active = ?, priority = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`
    return run(sql, [String(name), String(provider), String(api_key || ''), String(api_url || ''), 
      String(model || ''), Number(is_active), Number(priority), Number(id)])
  },
  
  setActive: (id) => {
    run('UPDATE ai_configs SET is_active = 0')
    run('UPDATE ai_configs SET is_active = 1 WHERE id = ?', [Number(id)])
    return { changes: db.getRowsModified() }
  },
  
  delete: (id) => run('DELETE FROM ai_configs WHERE id = ?', [Number(id)]),

  test: (id) => {
    const config = get('SELECT * FROM ai_configs WHERE id = ?', [Number(id)])
    if (!config) return { success: false, error: '配置不存在' }

    if (!config.api_key) {
      return { success: false, error: '缺少 API Key' }
    }

    const providers = ['zhipu', 'minimax', 'deepseek', 'openai']
    if (!providers.includes(config.provider)) {
      return { success: false, error: '不支持的提供商' }
    }

    try {
      const axios = require('axios')
      const apiUrl = config.api_url || {
        zhipu: 'https://open.bigmodel.cn/api/paas/v4',
        minimax: 'https://api.minimax.chat/v1',
        deepseek: 'https://api.deepseek.com',
        openai: 'https://api.openai.com/v1'
      }[config.provider]

      const response = axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: config.model || (config.provider === 'zhipu' ? 'glm-4.7' : 'gpt-3.5-turbo'),
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.api_key}`
          },
          timeout: 10000
        }
      )
      return { success: true, message: '连接成功' }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
}

module.exports = {
  initDatabase,
  positionStmt,
  companyStmt,
  positionNoteStmt,
  resumeStmt,
  positionResumeStmt,
  flowLogStmt,
  aiConfigStmt
}
