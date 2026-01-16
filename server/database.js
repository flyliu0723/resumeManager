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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id)
      )
    `)
    console.log('创建 resumes 表')
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
  delete: (id) => run('DELETE FROM resumes WHERE id = ?', [id]),
  getByPosition: (position_id) => all('SELECT * FROM resumes WHERE position_id = ? ORDER BY created_at DESC', [position_id]),
  getById: (id) => get('SELECT * FROM resumes WHERE id = ?', [id])
}

module.exports = {
  initDatabase,
  positionStmt,
  resumeStmt
}
