const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

// 检测是否在 pkg 打包环境中，决定数据库路径
const isPackaged = process.pkg !== undefined
const DATA_DIR = isPackaged 
  ? path.dirname(process.execPath)  // exe 所在目录
  : __dirname  // server 目录

const dbPath = path.join(DATA_DIR, 'resume.db')
let db = null

console.log(`[DB] 数据库路径: ${dbPath}`)

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
    
    // JD 解析相关字段
    if (!columns.includes('parsed_skills')) {
      db.run('ALTER TABLE positions ADD COLUMN parsed_skills TEXT')
      console.log('添加 parsed_skills 字段')
    }
    if (!columns.includes('parsed_education')) {
      db.run('ALTER TABLE positions ADD COLUMN parsed_education TEXT')
      console.log('添加 parsed_education 字段')
    }
    if (!columns.includes('parsed_experience')) {
      db.run('ALTER TABLE positions ADD COLUMN parsed_experience TEXT')
      console.log('添加 parsed_experience 字段')
    }
    if (!columns.includes('parsed_companies')) {
      db.run('ALTER TABLE positions ADD COLUMN parsed_companies TEXT')
      console.log('添加 parsed_companies 字段')
    }
    if (!columns.includes('parsed_at')) {
      db.run('ALTER TABLE positions ADD COLUMN parsed_at DATETIME')
      console.log('添加 parsed_at 字段')
    }
    if (!columns.includes('parsed_jd_content')) {
      db.run('ALTER TABLE positions ADD COLUMN parsed_jd_content TEXT')
      console.log('添加 parsed_jd_content 字段')
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
    
    if (!columns.includes('source')) {
      db.run('ALTER TABLE resumes ADD COLUMN source TEXT DEFAULT "other"')
      console.log('添加 source 字段到 resumes 表')
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
        -- 新状态系统字段
        main_status TEXT DEFAULT 'resume_screening',
        sub_status TEXT DEFAULT 'pending_review',
        interview_round INTEGER DEFAULT 0,
        current_round_id INTEGER,
        matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        flow_start_at DATETIME,
        update_time DATETIME,
        next_interview_at DATETIME,
        FOREIGN KEY (resume_id) REFERENCES resumes(id),
        FOREIGN KEY (position_id) REFERENCES positions(id),
        UNIQUE(resume_id, position_id)
      )
    `)
    console.log('创建 position_resumes 表（含新状态系统字段）')
  } else {
    // 检查并添加新状态系统字段
    const columnCheck = db.exec("PRAGMA table_info(position_resumes)")
    const columns = columnCheck.length > 0 ? columnCheck[0].values.map(row => row[1]) : []
    
    // 旧字段（保留兼容性）
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
    if (!columns.includes('next_interview_at')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN next_interview_at DATETIME')
      console.log('添加 next_interview_at 字段到 position_resumes 表')
    }
    
    // 新状态系统字段
    if (!columns.includes('main_status')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN main_status TEXT DEFAULT "resume_screening"')
      console.log('添加 main_status 字段到 position_resumes 表')
    }
    if (!columns.includes('sub_status')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN sub_status TEXT DEFAULT "pending_review"')
      console.log('添加 sub_status 字段到 position_resumes 表')
    }
    if (!columns.includes('interview_round')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN interview_round INTEGER DEFAULT 0')
      console.log('添加 interview_round 字段到 position_resumes 表')
    }
    if (!columns.includes('current_round_id')) {
      db.run('ALTER TABLE position_resumes ADD COLUMN current_round_id INTEGER')
      console.log('添加 current_round_id 字段到 position_resumes 表')
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
  } else {
    // 增强 flow_logs 表字段（新状态系统）
    const flowColumns = db.exec("PRAGMA table_info(position_resume_flow_logs)")
    const flowCols = flowColumns.length > 0 ? flowColumns[0].values.map(row => row[1]) : []
    
    if (!flowCols.includes('main_status_from')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN main_status_from TEXT')
      console.log('添加 main_status_from 字段到 flow_logs')
    }
    if (!flowCols.includes('main_status_to')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN main_status_to TEXT')
      console.log('添加 main_status_to 字段到 flow_logs')
    }
    if (!flowCols.includes('sub_status_from')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN sub_status_from TEXT')
      console.log('添加 sub_status_from 字段到 flow_logs')
    }
    if (!flowCols.includes('sub_status_to')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN sub_status_to TEXT')
      console.log('添加 sub_status_to 字段到 flow_logs')
    }
    if (!flowCols.includes('round_id')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN round_id INTEGER')
      console.log('添加 round_id 字段到 flow_logs')
    }
    if (!flowCols.includes('action_type')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN action_type TEXT')
      console.log('添加 action_type 字段到 flow_logs')
    }
    if (!flowCols.includes('metadata_json')) {
      db.run('ALTER TABLE position_resume_flow_logs ADD COLUMN metadata_json TEXT')
      console.log('添加 metadata_json 字段到 flow_logs')
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

  // 面试轮次表（新状态系统）
  const interviewRoundsCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_rounds'")
  if (interviewRoundsCheck.length === 0) {
    db.run(`
      CREATE TABLE interview_rounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        round_type TEXT,
        interviewer_id INTEGER,
        interviewer_name TEXT,
        interviewer_role TEXT,
        scheduled_at DATETIME,
        duration_minutes INTEGER,
        location TEXT,
        status TEXT DEFAULT 'pending',
        result TEXT,
        result_reason TEXT,
        feedback_json TEXT,
        candidate_feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (match_id) REFERENCES position_resumes(id)
      )
    `)
    console.log('创建 interview_rounds 表')
  }

  // 面试评价维度表（新状态系统）
  const interviewFeedbacksCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_feedbacks'")
  if (interviewFeedbacksCheck.length === 0) {
    db.run(`
      CREATE TABLE interview_feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        round_id INTEGER NOT NULL,
        dimension_name TEXT NOT NULL,
        score INTEGER,
        weight REAL DEFAULT 1.0,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (round_id) REFERENCES interview_rounds(id)
      )
    `)
    console.log('创建 interview_feedbacks 表')
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

  // 面试事件表 - 用于日志埋点和统计分析
  const interviewEventsTableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_events'")
  if (interviewEventsTableCheck.length === 0) {
    db.run(`
      CREATE TABLE interview_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        candidate_id INTEGER,
        position_id INTEGER,
        event_type TEXT NOT NULL,
        stage_before TEXT,
        stage_after TEXT,
        duration_seconds INTEGER,
        details TEXT,
        metric_value REAL,
        source TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('创建 interview_events 表')

    // 创建常用查询索引
    db.run('CREATE INDEX idx_interview_events_event_time ON interview_events(event_time)')
    db.run('CREATE INDEX idx_interview_events_event_type ON interview_events(event_type)')
    db.run('CREATE INDEX idx_interview_events_candidate_id ON interview_events(candidate_id)')
    db.run('CREATE INDEX idx_interview_events_position_id ON interview_events(position_id)')
    console.log('创建 interview_events 索引')
  }

  // 面试拒绝记录表（新状态系统）
  const interviewRejectionsCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_rejections'")
  if (interviewRejectionsCheck.length === 0) {
    db.run(`
      CREATE TABLE interview_rejections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        rejected_at_stage TEXT NOT NULL,
        rejected_at_sub_status TEXT,
        rejection_category TEXT,
        rejection_reason_code TEXT,
        rejection_reason_detail TEXT,
        rejected_by INTEGER,
        rejected_by_name TEXT,
        rejected_by_role TEXT,
        internal_notes TEXT,
        candidate_feedback TEXT,
        is_reopenable INTEGER DEFAULT 0,
        reopen_conditions TEXT,
        related_round_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (match_id) REFERENCES position_resumes(id),
        FOREIGN KEY (related_round_id) REFERENCES interview_rounds(id)
      )
    `)
    db.run('CREATE INDEX idx_rejections_match_id ON interview_rejections(match_id)')
    db.run('CREATE INDEX idx_rejections_stage ON interview_rejections(rejected_at_stage)')
    db.run('CREATE INDEX idx_rejections_category ON interview_rejections(rejection_category)')
    console.log('创建 interview_rejections 表')
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
  getById: (id) => get('SELECT * FROM positions WHERE id = ?', [Number(id)]),
  
  // 更新JD解析结果
  updateParsedJD: (id, parsedData) => {
    const { skills, education, experience, companies, jdContent } = parsedData
    run(
      'UPDATE positions SET parsed_skills = ?, parsed_education = ?, parsed_experience = ?, parsed_companies = ?, parsed_jd_content = ?, parsed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        skills ? JSON.stringify(skills) : null,
        education || null,
        experience || null,
        companies ? JSON.stringify(companies) : null,
        jdContent || null,
        Number(id)
      ]
    )
  },
  
  // 更新单个解析字段（用于编辑）
  updateParsedField: (id, field, value) => {
    const allowedFields = ['parsed_skills', 'parsed_education', 'parsed_experience', 'parsed_companies']
    if (!allowedFields.includes(field)) {
      throw new Error('Invalid field name')
    }
    
    if (field === 'parsed_skills' || field === 'parsed_companies') {
      // JSON字段
      run(`UPDATE positions SET ${field} = ? WHERE id = ?`, [value ? JSON.stringify(value) : null, Number(id)])
    } else {
      // 普通文本字段
      run(`UPDATE positions SET ${field} = ? WHERE id = ?`, [value || null, Number(id)])
    }
  }
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
  insert: (name, size, type, file_path, file_format, candidate_name, content, source = 'other', note = '') => {
    console.log('\n========== 数据库插入简历 ==========')
    console.log('name:', name)
    console.log('size:', size)
    console.log('type:', type)
    console.log('file_path:', file_path)
    console.log('file_format:', file_format)
    console.log('candidate_name:', candidate_name)
    console.log('source:', source)
    console.log('note:', note)
    
    const result = db.run('INSERT INTO resumes (name, size, type, file_path, file_format, candidate_name, content, source, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [String(name), String(size), String(type), String(file_path), String(file_format), String(candidate_name), String(content || ''), String(source), String(note || '')])
    
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
  getAll: () => {
    return all(`
      SELECT pr.*, r.name as resume_name, r.candidate_name, p.name as position_name
      FROM position_resumes pr
      JOIN resumes r ON pr.resume_id = r.id
      LEFT JOIN positions p ON pr.position_id = p.id
      ORDER BY pr.matched_at DESC
    `)
  },
  all: (sql, params = []) => {
    return all(sql, params)
  },
  get: (sql, params = []) => {
    return get(sql, params)
  },
  getByPosition: (positionId) => {
    return all(`
      SELECT pr.*, r.name as resume_name, r.name as file_name, r.candidate_name, r.parsed_data, r.content, r.file_path, r.type, r.file_format
      FROM position_resumes pr
      JOIN resumes r ON pr.resume_id = r.id
      WHERE pr.position_id = ?
      ORDER BY pr.matched_at DESC
    `, [Number(positionId)])
  },
  getById: (id) => {
    return get(`
      SELECT pr.*, r.name as resume_name, r.name as file_name, r.candidate_name, r.parsed_data, r.content, r.file_path, r.type, r.file_format
      FROM position_resumes pr
      JOIN resumes r ON pr.resume_id = r.id
      WHERE pr.id = ?
    `, [Number(id)])
  },
  updateEvaluation: (id, evaluation, match_score, questions) => {
    const sql = 'UPDATE position_resumes SET evaluation = ?, match_score = ?, questions = ? WHERE id = ?'
    run(sql, [String(evaluation), Number(match_score), String(questions), Number(id)])
  },
  // 旧版updateStatus（兼容）
  updateStatus: (id, status, note, jdSupplement, updateFlowStartAt = false, nextInterviewAt = null) => {
    let sql = 'UPDATE position_resumes SET current_status = ?, status = ?, jd_supplement = ?, update_time = CURRENT_TIMESTAMP'
    const params = [String(status), String(status), String(jdSupplement || ''), Number(id)]
    
    if (updateFlowStartAt) {
      sql += ', flow_start_at = CURRENT_TIMESTAMP'
    }
    
    if (nextInterviewAt) {
      sql += ', next_interview_at = ?'
      params.splice(params.length - 1, 0, String(nextInterviewAt))
    } else {
      sql += ', next_interview_at = NULL'
    }
    
    sql += ' WHERE id = ?'
    run(sql, params)
  },

  // 新版updateStatus（支持新状态系统）
  updateStatusNew: (id, mainStatus, subStatus, options = {}) => {
    const {
      interviewRound = null,
      currentRoundId = null,
      nextInterviewAt = null,
      updateFlowStartAt = false
    } = options

    let sql = 'UPDATE position_resumes SET main_status = ?, sub_status = ?, current_status = ?, status = ?, update_time = CURRENT_TIMESTAMP'
    const params = [String(mainStatus), String(subStatus), String(subStatus), String(subStatus)]

    if (interviewRound !== null) {
      sql += ', interview_round = ?'
      params.push(Number(interviewRound))
    }

    if (currentRoundId !== null) {
      sql += ', current_round_id = ?'
      params.push(Number(currentRoundId))
    }

    if (nextInterviewAt !== undefined) {
      if (nextInterviewAt) {
        sql += ', next_interview_at = ?'
        params.push(String(nextInterviewAt))
      } else {
        sql += ', next_interview_at = NULL'
      }
    }

    if (updateFlowStartAt) {
      sql += ', flow_start_at = CURRENT_TIMESTAMP'
    }

    sql += ' WHERE id = ?'
    params.push(Number(id))

    run(sql, params)
  },

  // 更新面试轮次信息
  updateInterviewRound: (id, interviewRound, currentRoundId) => {
    run('UPDATE position_resumes SET interview_round = ?, current_round_id = ? WHERE id = ?', 
      [Number(interviewRound), currentRoundId ? Number(currentRoundId) : null, Number(id)])
  },
  updateJdSupplement: (id, jdSupplement) => {
    run('UPDATE position_resumes SET jd_supplement = ? WHERE id = ?', [String(jdSupplement || ''), Number(id)])
  },
  delete: (id) => run('DELETE FROM position_resumes WHERE id = ?', [Number(id)]),
  getByResumeAndPosition: (resumeId, positionId) => get('SELECT * FROM position_resumes WHERE resume_id = ? AND position_id = ?', [Number(resumeId), Number(positionId)])
}

const flowLogStmt = {
  // 旧版insert（兼容）
  insert: (matchId, fromStatus, toStatus, note, jdSupplement) => {
    const result = db.run(
      'INSERT INTO position_resume_flow_logs (match_id, from_status, to_status, note, jd_supplement) VALUES (?, ?, ?, ?, ?)',
      [Number(matchId), String(fromStatus || ''), String(toStatus), String(note || ''), String(jdSupplement || '')]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },

  // 新版insert（支持新状态系统）
  insertWithNewStatus: (matchId, mainStatusFrom, mainStatusTo, subStatusFrom, subStatusTo, options = {}) => {
    const {
      actionType = 'status_change',
      note = '',
      roundId = null,
      metadata = null
    } = options

    const result = db.run(
      `INSERT INTO position_resume_flow_logs 
       (match_id, from_status, to_status, main_status_from, main_status_to, sub_status_from, sub_status_to, 
        action_type, note, round_id, metadata_json, jd_supplement) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(matchId),
        String(subStatusFrom || ''),
        String(subStatusTo || ''),
        String(mainStatusFrom || ''),
        String(mainStatusTo || ''),
        String(subStatusFrom || ''),
        String(subStatusTo || ''),
        String(actionType),
        String(note || ''),
        roundId ? Number(roundId) : null,
        metadata ? JSON.stringify(metadata) : null,
        ''
      ]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },

  getByMatchId: (matchId) => {
    return all('SELECT * FROM position_resume_flow_logs WHERE match_id = ? ORDER BY created_at ASC', [Number(matchId)])
  },

  getByMatchIdWithDetails: (matchId) => {
    return all(`
      SELECT 
        fl.*,
        ir.round_number as related_round_number
      FROM position_resume_flow_logs fl
      LEFT JOIN interview_rounds ir ON fl.round_id = ir.id
      WHERE fl.match_id = ?
      ORDER BY fl.created_at ASC
    `, [Number(matchId)])
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

// 面试事件操作语句
const interviewEventStmt = {
  // 插入事件
  insert: (eventType, candidateId, positionId, options = {}) => {
    const {
      eventTime = new Date().toISOString(),
      stageBefore = null,
      stageAfter = null,
      durationSeconds = null,
      details = null,
      metricValue = null,
      source = 'system'
    } = options

    const detailsJson = details ? JSON.stringify(details) : null

    const result = db.run(
      `INSERT INTO interview_events 
       (event_time, candidate_id, position_id, event_type, stage_before, stage_after, duration_seconds, details, metric_value, source) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(eventTime),
        candidateId ? Number(candidateId) : null,
        positionId ? Number(positionId) : null,
        String(eventType),
        stageBefore ? String(stageBefore) : null,
        stageAfter ? String(stageAfter) : null,
        durationSeconds ? Number(durationSeconds) : null,
        detailsJson,
        metricValue ? Number(metricValue) : null,
        String(source)
      ]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },

  // 根据ID查询
  getById: (id) => {
    return get(`SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      WHERE ie.id = ?`, [Number(id)])
  },

  // 查询候选人的所有事件
  getByCandidateId: (candidateId, limit = 100) => {
    return all(`SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      WHERE ie.candidate_id = ? 
      ORDER BY ie.event_time DESC 
      LIMIT ?`,
      [Number(candidateId), Number(limit)])
  },

  // 查询职位的所有事件
  getByPositionId: (positionId, limit = 100) => {
    return all(`SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      WHERE ie.position_id = ? 
      ORDER BY ie.event_time DESC 
      LIMIT ?`,
      [Number(positionId), Number(limit)])
  },

  // 按事件类型查询
  getByEventType: (eventType, startTime, endTime, limit = 100) => {
    let sql = `SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      WHERE ie.event_type = ?`
    const params = [String(eventType)]

    if (startTime) {
      sql += ' AND ie.event_time >= ?'
      params.push(String(startTime))
    }
    if (endTime) {
      sql += ' AND ie.event_time <= ?'
      params.push(String(endTime))
    }

    sql += ' ORDER BY ie.event_time DESC LIMIT ?'
    params.push(Number(limit))

    return all(sql, params)
  },

  // 查询时间范围内的事件（用于统计）
  getByTimeRange: (startTime, endTime, eventType = null) => {
    let sql = `SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      WHERE ie.event_time >= ? AND ie.event_time <= ?`
    const params = [String(startTime), String(endTime)]

    if (eventType) {
      sql += ' AND ie.event_type = ?'
      params.push(String(eventType))
    }

    sql += ' ORDER BY ie.event_time DESC'
    return all(sql, params)
  },

  // 按天统计事件数量
  getDailyStats: (startTime, endTime, eventType = null) => {
    let sql = `
      SELECT 
        date(event_time) as date,
        COUNT(*) as count
      FROM interview_events 
      WHERE event_time >= ? AND event_time <= ?`
    const params = [String(startTime), String(endTime)]

    if (eventType) {
      sql += ' AND event_type = ?'
      params.push(String(eventType))
    }

    sql += ' GROUP BY date(event_time) ORDER BY date'
    return all(sql, params)
  },

  // 统计各类型事件数量
  getEventTypeStats: (startTime, endTime) => {
    return all(
      `SELECT 
        event_type,
        COUNT(*) as count
      FROM interview_events 
      WHERE event_time >= ? AND event_time <= ?
      GROUP BY event_type
      ORDER BY count DESC`,
      [String(startTime), String(endTime)]
    )
  },

  // 按日期范围查询事件
  getByDateRange: (startTime, endTime) => {
    return all(
      `SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      WHERE ie.event_time >= ? AND ie.event_time <= ?
      ORDER BY ie.event_time DESC`,
      [String(startTime), String(endTime)]
    )
  },

  // 获取所有事件
  getAll: () => {
    return all(
      `SELECT 
        ie.*,
        p.name as position_name
      FROM interview_events ie
      LEFT JOIN positions p ON ie.position_id = p.id
      ORDER BY ie.event_time DESC
      LIMIT 1000`
    )
  },

  // 删除事件
  delete: (id) => {
    return run('DELETE FROM interview_events WHERE id = ?', [Number(id)])
  },

  // 删除候选人的所有事件
  deleteByCandidateId: (candidateId) => {
    return run('DELETE FROM interview_events WHERE candidate_id = ?', [Number(candidateId)])
  }
}

// 面试轮次表 DAO（新状态系统）
const interviewRoundStmt = {
  // 创建面试轮次
  insert: (matchId, roundNumber, options = {}) => {
    const {
      roundType = null,
      interviewerId = null,
      interviewerName = null,
      interviewerRole = null,
      scheduledAt = null,
      durationMinutes = null,
      location = null
    } = options

    const result = db.run(
      `INSERT INTO interview_rounds 
       (match_id, round_number, round_type, interviewer_id, interviewer_name, interviewer_role, 
        scheduled_at, duration_minutes, location, status, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        Number(matchId),
        Number(roundNumber),
        roundType ? String(roundType) : null,
        interviewerId ? Number(interviewerId) : null,
        interviewerName ? String(interviewerName) : null,
        interviewerRole ? String(interviewerRole) : null,
        scheduledAt ? String(scheduledAt) : null,
        durationMinutes ? Number(durationMinutes) : null,
        location ? String(location) : null
      ]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },

  // 更新面试轮次状态和结果
  updateStatus: (id, options = {}) => {
    const {
      status = null,
      result = null,
      resultReason = null,
      feedbackJson = null,
      candidateFeedback = null
    } = options

    let sql = 'UPDATE interview_rounds SET updated_at = CURRENT_TIMESTAMP'
    const params = []

    if (status) {
      sql += ', status = ?'
      params.push(String(status))
    }
    if (result) {
      sql += ', result = ?'
      params.push(String(result))
    }
    if (resultReason !== undefined) {
      sql += ', result_reason = ?'
      params.push(resultReason ? String(resultReason) : null)
    }
    if (feedbackJson !== undefined) {
      sql += ', feedback_json = ?'
      params.push(feedbackJson ? JSON.stringify(feedbackJson) : null)
    }
    if (candidateFeedback !== undefined) {
      sql += ', candidate_feedback = ?'
      params.push(candidateFeedback ? String(candidateFeedback) : null)
    }

    sql += ' WHERE id = ?'
    params.push(Number(id))

    return run(sql, params)
  },

  // 根据ID查询
  getById: (id) => {
    return get('SELECT * FROM interview_rounds WHERE id = ?', [Number(id)])
  },

  // 查询match的所有轮次
  getByMatchId: (matchId) => {
    return all(
      'SELECT * FROM interview_rounds WHERE match_id = ? ORDER BY round_number ASC, created_at ASC',
      [Number(matchId)]
    )
  },

  // 查询当前进行的轮次
  getCurrentRound: (matchId) => {
    return get(
      `SELECT * FROM interview_rounds 
       WHERE match_id = ? AND status IN ('pending', 'scheduled') 
       ORDER BY round_number ASC, created_at DESC 
       LIMIT 1`,
      [Number(matchId)]
    )
  },

  // 查询已完成的轮次
  getCompletedRounds: (matchId) => {
    return all(
      `SELECT * FROM interview_rounds 
       WHERE match_id = ? AND status = 'completed' 
       ORDER BY round_number ASC`,
      [Number(matchId)]
    )
  },

  // 删除轮次
  delete: (id) => {
    return run('DELETE FROM interview_rounds WHERE id = ?', [Number(id)])
  },

  // 删除match的所有轮次
  deleteByMatchId: (matchId) => {
    return run('DELETE FROM interview_rounds WHERE match_id = ?', [Number(matchId)])
  }
}

// 面试评价维度表 DAO（新状态系统）
const interviewFeedbackStmt = {
  // 创建评价维度
  insert: (roundId, dimensionName, options = {}) => {
    const { score = null, weight = 1.0, comment = null } = options

    const result = db.run(
      `INSERT INTO interview_feedbacks (round_id, dimension_name, score, weight, comment) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(roundId),
        String(dimensionName),
        score ? Number(score) : null,
        Number(weight),
        comment ? String(comment) : null
      ]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },

  // 批量创建评价维度
  insertBatch: (roundId, dimensions) => {
    const results = []
    for (const dim of dimensions) {
      const result = interviewFeedbackStmt.insert(roundId, dim.name, {
        score: dim.score,
        weight: dim.weight || 1.0,
        comment: dim.comment
      })
      results.push(result)
    }
    return results
  },

  // 更新评价
  update: (id, options = {}) => {
    const { score = null, weight = null, comment = null } = options

    let sql = 'UPDATE interview_feedbacks SET'
    const params = []
    const updates = []

    if (score !== undefined) {
      updates.push('score = ?')
      params.push(score ? Number(score) : null)
    }
    if (weight !== undefined) {
      updates.push('weight = ?')
      params.push(Number(weight))
    }
    if (comment !== undefined) {
      updates.push('comment = ?')
      params.push(comment ? String(comment) : null)
    }

    if (updates.length === 0) return { changes: 0 }

    sql += ' ' + updates.join(', ') + ' WHERE id = ?'
    params.push(Number(id))

    return run(sql, params)
  },

  // 根据ID查询
  getById: (id) => {
    return get('SELECT * FROM interview_feedbacks WHERE id = ?', [Number(id)])
  },

  // 查询轮次的所有评价维度
  getByRoundId: (roundId) => {
    return all(
      'SELECT * FROM interview_feedbacks WHERE round_id = ? ORDER BY created_at ASC',
      [Number(roundId)]
    )
  },

  // 计算加权平均分
  calculateWeightedScore: (roundId) => {
    const result = get(
      `SELECT 
        SUM(score * weight) as weighted_sum,
        SUM(weight) as total_weight,
        COUNT(*) as dimension_count
       FROM interview_feedbacks 
       WHERE round_id = ? AND score IS NOT NULL`,
      [Number(roundId)]
    )
    
    if (!result || !result.total_weight) return null
    
    return {
      weightedScore: result.weighted_sum / result.total_weight,
      totalWeight: result.total_weight,
      dimensionCount: result.dimension_count
    }
  },

  // 删除评价维度
  delete: (id) => {
    return run('DELETE FROM interview_feedbacks WHERE id = ?', [Number(id)])
  },

  // 删除轮次的所有评价
  deleteByRoundId: (roundId) => {
    return run('DELETE FROM interview_feedbacks WHERE round_id = ?', [Number(roundId)])
  }
}

// 面试拒绝记录表 DAO（新状态系统）
const interviewRejectionStmt = {
  // 创建拒绝记录
  insert: (matchId, options = {}) => {
    const {
      rejectedAtStage,
      rejectedAtSubStatus = null,
      rejectionCategory = null,
      rejectionReasonCode = null,
      rejectionReasonDetail = null,
      rejectedBy = null,
      rejectedByName = null,
      rejectedByRole = null,
      internalNotes = null,
      candidateFeedback = null,
      isReopenable = 0,
      reopenConditions = null,
      relatedRoundId = null
    } = options

    const result = db.run(
      `INSERT INTO interview_rejections (
        match_id, rejected_at_stage, rejected_at_sub_status,
        rejection_category, rejection_reason_code, rejection_reason_detail,
        rejected_by, rejected_by_name, rejected_by_role,
        internal_notes, candidate_feedback,
        is_reopenable, reopen_conditions, related_round_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        Number(matchId),
        String(rejectedAtStage),
        rejectedAtSubStatus ? String(rejectedAtSubStatus) : null,
        rejectionCategory ? String(rejectionCategory) : null,
        rejectionReasonCode ? String(rejectionReasonCode) : null,
        rejectionReasonDetail ? String(rejectionReasonDetail) : null,
        rejectedBy ? Number(rejectedBy) : null,
        rejectedByName ? String(rejectedByName) : null,
        rejectedByRole ? String(rejectedByRole) : null,
        internalNotes ? String(internalNotes) : null,
        candidateFeedback ? String(candidateFeedback) : null,
        isReopenable ? 1 : 0,
        reopenConditions ? String(reopenConditions) : null,
        relatedRoundId ? Number(relatedRoundId) : null
      ]
    )
    saveDatabase()
    return { lastInsertRowid: result.lastInsertRowid }
  },

  // 根据ID查询
  getById: (id) => {
    return get('SELECT * FROM interview_rejections WHERE id = ?', [Number(id)])
  },

  // 查询match的拒绝记录
  getByMatchId: (matchId) => {
    return all(
      'SELECT * FROM interview_rejections WHERE match_id = ? ORDER BY created_at DESC',
      [Number(matchId)]
    )
  },

  // 按拒绝阶段统计
  getStatsByStage: (startDate, endDate) => {
    return all(
      `SELECT 
        rejected_at_stage,
        rejection_category,
        COUNT(*) as count
      FROM interview_rejections 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY rejected_at_stage, rejection_category
      ORDER BY count DESC`,
      [String(startDate), String(endDate)]
    )
  },

  // 按拒绝原因统计
  getStatsByReason: (startDate, endDate) => {
    return all(
      `SELECT 
        rejection_reason_code,
        COUNT(*) as count
      FROM interview_rejections 
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY rejection_reason_code
      ORDER BY count DESC`,
      [String(startDate), String(endDate)]
    )
  },

  // 更新拒绝记录（如允许重新打开）
  update: (id, options = {}) => {
    const {
      isReopenable = null,
      reopenConditions = null,
      internalNotes = null
    } = options

    let sql = 'UPDATE interview_rejections SET updated_at = CURRENT_TIMESTAMP'
    const params = []

    if (isReopenable !== null) {
      sql += ', is_reopenable = ?'
      params.push(isReopenable ? 1 : 0)
    }
    if (reopenConditions !== undefined) {
      sql += ', reopen_conditions = ?'
      params.push(reopenConditions ? String(reopenConditions) : null)
    }
    if (internalNotes !== undefined) {
      sql += ', internal_notes = ?'
      params.push(internalNotes ? String(internalNotes) : null)
    }

    sql += ' WHERE id = ?'
    params.push(Number(id))

    return run(sql, params)
  },

  // 删除拒绝记录
  delete: (id) => {
    return run('DELETE FROM interview_rejections WHERE id = ?', [Number(id)])
  },

  // 删除match的所有拒绝记录
  deleteByMatchId: (matchId) => {
    return run('DELETE FROM interview_rejections WHERE match_id = ?', [Number(matchId)])
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
  aiConfigStmt,
  interviewEventStmt,
  interviewRoundStmt,      // 面试轮次表 DAO（新状态系统）
  interviewFeedbackStmt,   // 面试评价维度表 DAO（新状态系统）
  interviewRejectionStmt,  // 面试拒绝记录表 DAO（新状态系统）
  db
}
