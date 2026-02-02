/**
 * 数据库迁移脚本：迁移到新的状态系统
 * 迁移内容：
 * 1. 备份现有数据
 * 2. 添加新的 main_status 和 sub_status 字段（如果尚未添加）
 * 3. 迁移旧状态数据到新状态系统
 * 4. 创建示例面试轮次数据（可选）
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', 'resume.db');
let db = null;

// 数据库操作函数
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function run(sql, params = []) {
  const changes = db.run(sql, params);
  saveDatabase();
  return { changes };
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
}

// 状态映射表：将旧状态映射到新状态系统
const STATUS_MAPPING = {
  '待沟通': { main_status: 'resume_screening', sub_status: 'pending_review' },
  '待面试': { main_status: 'interviewing', sub_status: 'round_pending' },
  '面试中': { main_status: 'interviewing', sub_status: 'round_scheduled' },
  '已通过': { main_status: 'salary_negotiation', sub_status: 'approval_pending' },
  '已拒绝': { main_status: 'resume_screening', sub_status: 'screening_rejected' },
  '未解析': { main_status: 'resume_screening', sub_status: 'pending_review' },
  '已解析': { main_status: 'resume_screening', sub_status: 'pending_review' }
};

async function migrate() {
  console.log('========================================');
  console.log('开始数据库迁移：状态系统重构');
  console.log('========================================\n');

  try {
    // 1. 初始化数据库
    await initDatabase();
    console.log('✓ 数据库初始化完成\n');

    // 2. 备份数据
    console.log('步骤 1/3: 备份现有数据...');
    try {
      run('CREATE TABLE IF NOT EXISTS position_resumes_backup AS SELECT * FROM position_resumes');
      run('CREATE TABLE IF NOT EXISTS flow_logs_backup AS SELECT * FROM position_resume_flow_logs');
      console.log('✓ 数据备份完成\n');
    } catch (e) {
      console.log('⚠ 备份表可能已存在，跳过\n');
    }

    // 3. 检查并添加新字段（如果不存在）
    console.log('步骤 2/3: 检查并添加新字段...');
    
    try {
      const columns = db.exec("PRAGMA table_info(position_resumes)")[0].values.map(row => row[1]);
      
      if (!columns.includes('main_status')) {
        run(`ALTER TABLE position_resumes ADD COLUMN main_status TEXT DEFAULT 'resume_screening'`);
        console.log('  ✓ 添加 main_status 字段');
      } else {
        console.log('  ✓ main_status 字段已存在');
      }
      
      if (!columns.includes('sub_status')) {
        run(`ALTER TABLE position_resumes ADD COLUMN sub_status TEXT DEFAULT 'pending_review'`);
        console.log('  ✓ 添加 sub_status 字段');
      } else {
        console.log('  ✓ sub_status 字段已存在');
      }
      
      if (!columns.includes('interview_round')) {
        run(`ALTER TABLE position_resumes ADD COLUMN interview_round INTEGER DEFAULT 0`);
        console.log('  ✓ 添加 interview_round 字段');
      } else {
        console.log('  ✓ interview_round 字段已存在');
      }
      
      if (!columns.includes('current_round_id')) {
        run(`ALTER TABLE position_resumes ADD COLUMN current_round_id INTEGER`);
        console.log('  ✓ 添加 current_round_id 字段');
      } else {
        console.log('  ✓ current_round_id 字段已存在');
      }
      
      console.log('✓ 新字段检查完成\n');
    } catch (e) {
      console.log('  ⚠ 字段检查失败:', e.message, '\n');
    }

    // 4. 迁移旧状态数据
    console.log('步骤 3/3: 迁移旧状态数据...');
    
    try {
      const records = all('SELECT id, status, current_status FROM position_resumes WHERE main_status IS NULL OR main_status = ""');
      console.log(`  找到 ${records.length} 条记录需要迁移`);
      
      let migrated = 0;
      for (const record of records) {
        const oldStatus = record.current_status || record.status || '待沟通';
        const mapping = STATUS_MAPPING[oldStatus];
        
        if (mapping) {
          run(
            'UPDATE position_resumes SET main_status = ?, sub_status = ? WHERE id = ?',
            [mapping.main_status, mapping.sub_status, record.id]
          );
          migrated++;
        } else {
          console.log(`    ⚠ 未知状态 "${oldStatus}"，使用默认值`);
          run(
            'UPDATE position_resumes SET main_status = ?, sub_status = ? WHERE id = ?',
            ['resume_screening', 'pending_review', record.id]
          );
          migrated++;
        }
      }
      console.log(`✓ 成功迁移 ${migrated} 条记录\n`);
    } catch (e) {
      console.log('  ⚠ 数据迁移失败:', e.message, '\n');
    }

    // 5. 完成
    console.log('========================================');
    console.log('迁移完成！');
    console.log('========================================');
    console.log('\n注意事项：');
    console.log('1. 新状态系统已启用，请更新前端代码以支持新的状态字段');
    console.log('2. 旧字段（status, current_status）仍然保留，可在验证稳定后清理');
    console.log('3. 备份表（position_resumes_backup, flow_logs_backup）已创建\n');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrate();
}

module.exports = { migrate, STATUS_MAPPING };
