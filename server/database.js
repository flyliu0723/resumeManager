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
  
  const resumeTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='resumes'")
  if (resumeTableCheck.length === 0) {
    db.run(`
      CREATE TABLE resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )
    `)
    console.log('创建 resumes 表')
  } else {
    // 检查是否需要添加新字段
    const columnCheck = db.exec("PRAGMA table_info(resumes)")
    const columns = columnCheck.length > 0 ? columnCheck[0].values.map(row => row[1]) : []
    
    if (!columns.includes('parsed_data')) {
      db.run('ALTER TABLE resumes ADD COLUMN parsed_data TEXT')
      console.log('添加 parsed_data 字段')
    }
    if (!columns.includes('parsed_at')) {
      db.run('ALTER TABLE resumes ADD COLUMN parsed_at DATETIME')
      console.log('添加 parsed_at 字段')
    }
    if (!columns.includes('parser')) {
      db.run('ALTER TABLE resumes ADD COLUMN parser TEXT')
      console.log('添加 parser 字段')
    }
    if (!columns.includes('model')) {
      db.run('ALTER TABLE resumes ADD COLUMN model TEXT')
      console.log('添加 model 字段')
    }
    if (!columns.includes('evaluation')) {
      db.run('ALTER TABLE resumes ADD COLUMN evaluation TEXT')
      console.log('添加 evaluation 字段')
    }
    if (!columns.includes('status')) {
      db.run('ALTER TABLE resumes ADD COLUMN status TEXT DEFAULT "未解析"')
      console.log('添加 status 字段')
    }
    if (!columns.includes('match_score')) {
      db.run('ALTER TABLE resumes ADD COLUMN match_score INTEGER')
      console.log('添加 match_score 字段')
    }
    if (!columns.includes('questions')) {
      db.run('ALTER TABLE resumes ADD COLUMN questions TEXT')
      console.log('添加 questions 字段')
    }
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
      ['智谱GLM-4', 'zhipu', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4', 1, 0])
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
  insert: (position_id, name, size, type, file_path, candidate_name, content) => {
    console.log('\n========== 数据库插入参数 ==========')
    console.log('position_id:', position_id, 'type:', typeof position_id)
    console.log('name:', name, 'type:', typeof name)
    console.log('size:', size, 'type:', typeof size)
    console.log('type:', type, 'type:', typeof type)
    console.log('file_path:', file_path, 'type:', typeof file_path)
    console.log('candidate_name:', candidate_name, 'type:', typeof candidate_name)
    console.log('content:', content?.substring(0, 100), 'type:', typeof content)
    console.log('====================================\n')
    
    const result = db.run('INSERT INTO resumes (position_id, name, size, type, file_path, candidate_name, content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
      [String(position_id), String(name), String(size), String(type), String(file_path), String(candidate_name), String(content || ''), '未解析'])
    
    let lastId = lastInsertRowid()
    console.log('lastInsertRowid:', lastId)
    
    saveDatabase()
    console.log('==========================================\n')
    
    return { lastInsertRowid: lastId }
  },
  updateContent: (id, candidate_name, content) => run('UPDATE resumes SET candidate_name = ?, content = ? WHERE id = ?', [candidate_name, content, Number(id)]),
  updateParsedData: (id, parsed_data, candidate_name, content, parser, model, evaluation) => {
    const sql = 'UPDATE resumes SET parsed_data = ?, candidate_name = ?, content = ?, parser = ?, model = ?, status = ?, parsed_at = CURRENT_TIMESTAMP WHERE id = ?'
    run(sql, [String(parsed_data || ''), String(candidate_name || ''), String(content || ''), String(parser || ''), String(model || ''), '已解析', Number(id)])
    if (evaluation) {
      run('UPDATE resumes SET evaluation = ? WHERE id = ?', [String(evaluation), Number(id)])
    }
  },
  updateStatus: (id, status) => run('UPDATE resumes SET status = ? WHERE id = ?', [String(status), Number(id)]),
  updateEvaluation: (id, evaluation, match_score = null, questions = null) => {
    let sql = 'UPDATE resumes SET evaluation = ?'
    const params = [String(evaluation)]
    if (match_score !== null) {
      sql += ', match_score = ?'
      params.push(Number(match_score))
    }
    if (questions !== null) {
      sql += ', questions = ?'
      params.push(String(questions))
    }
    sql += ' WHERE id = ?'
    params.push(Number(id))
    run(sql, params)
  },
  updateAllEvaluation: (id, evaluation, match_score, questions) => {
    const sql = 'UPDATE resumes SET evaluation = ?, match_score = ?, questions = ?, status = ? WHERE id = ?'
    run(sql, [String(evaluation), Number(match_score), String(questions), '待沟通', Number(id)])
  },
  delete: (id) => run('DELETE FROM resumes WHERE id = ?', [Number(id)]),
  getByPosition: (position_id) => all('SELECT * FROM resumes WHERE position_id = ? ORDER BY created_at DESC', [Number(position_id)]),
  getById: (id) => get('SELECT * FROM resumes WHERE id = ?', [Number(id)])
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
          model: config.model || (config.provider === 'zhipu' ? 'glm-4' : 'gpt-3.5-turbo'),
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
  aiConfigStmt
}
