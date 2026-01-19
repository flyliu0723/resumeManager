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
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('创建 positions 表')
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
  db.run(sql, params)
  saveDatabase()
  return { changes: db.getRowsModified() }
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
  insert: (name, description) => {
    console.log('\n========== positionStmt.insert ==========')
    console.log('name:', name)
    console.log('description:', description)
    
    run('INSERT INTO positions (name, description) VALUES (?, ?)', [name, description])
    
    const lastId = lastInsertRowid()
    console.log('lastInsertRowid:', lastId)
    console.log('==========================================\n')
    
    return { lastInsertRowid: lastId }
  },
  update: (name, description, id) => run('UPDATE positions SET name = ?, description = ? WHERE id = ?', [name, description, id]),
  delete: (id) => run('DELETE FROM positions WHERE id = ?', [id]),
  getAll: () => all('SELECT * FROM positions ORDER BY created_at DESC'),
  getById: (id) => get('SELECT * FROM positions WHERE id = ?', [id])
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
    
    run('INSERT INTO resumes (position_id, name, size, type, file_path, candidate_name, content) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [String(position_id), String(name), String(size), String(type), String(file_path), String(candidate_name), String(content || '')])
    return { lastInsertRowid: lastInsertRowid() }
  },
  updateContent: (id, candidate_name, content) => run('UPDATE resumes SET candidate_name = ?, content = ? WHERE id = ?', [candidate_name, content, id]),
  updateParsedData: (id, parsed_data, candidate_name, content, parser, model) => {
    const sql = 'UPDATE resumes SET parsed_data = ?, candidate_name = ?, content = ?, parser = ?, model = ?, parsed_at = CURRENT_TIMESTAMP WHERE id = ?'
    run(sql, [String(parsed_data || ''), String(candidate_name || ''), String(content || ''), String(parser || ''), String(model || ''), id])
  },
  delete: (id) => run('DELETE FROM resumes WHERE id = ?', [id]),
  getByPosition: (position_id) => all('SELECT * FROM resumes WHERE position_id = ? ORDER BY created_at DESC', [position_id]),
  getById: (id) => get('SELECT * FROM resumes WHERE id = ?', [id])
}

const aiConfigStmt = {
  getAll: () => all('SELECT * FROM ai_configs ORDER BY priority ASC, created_at DESC'),
  
  getById: (id) => get('SELECT * FROM ai_configs WHERE id = ?', [id]),
  
  getActive: () => get('SELECT * FROM ai_configs WHERE is_active = 1 ORDER BY priority ASC LIMIT 1'),
  
  insert: (name, provider, api_key, api_url, model, priority) => {
    run('INSERT INTO ai_configs (name, provider, api_key, api_url, model, priority) VALUES (?, ?, ?, ?, ?, ?)',
      [String(name), String(provider), String(api_key || ''), String(api_url || ''), String(model || ''), Number(priority)])
    return { lastInsertRowid: lastInsertRowid() }
  },
  
  update: (id, name, provider, api_key, api_url, model, is_active, priority) => {
    const sql = `UPDATE ai_configs SET 
      name = ?, provider = ?, api_key = ?, api_url = ?, model = ?, 
      is_active = ?, priority = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`
    run(sql, [String(name), String(provider), String(api_key || ''), String(api_url || ''), 
      String(model || ''), Number(is_active), Number(priority), Number(id)])
    return { changes: db.getRowsModified() }
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
    
    if (config.provider === 'openai' && config.api_key) {
      // 测试 OpenAI API
      try {
        const response = require('axios').default.post(
          `${config.api_url}/chat/completions`,
          {
            model: config.model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5
          },
          {
            headers: { 'Authorization': `Bearer ${config.api_key}` },
            timeout: 10000
          }
        )
        return { success: true, message: '连接成功' }
      } catch (e) {
        return { success: false, error: e.message }
      }
    } else if (config.provider === 'ollama') {
      // 测试 Ollama
      try {
        const response = require('axios').default.post(
          `${config.api_url}/api/version`,
          {},
          { timeout: 5000 }
        )
        return { success: true, message: '连接成功' }
      } catch (e) {
        return { success: false, error: '无法连接到 Ollama 服务' }
      }
    }
    return { success: false, error: '无法测试此配置' }
  }
}

module.exports = {
  initDatabase,
  positionStmt,
  resumeStmt,
  aiConfigStmt
}
