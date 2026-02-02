/**
 * 添加 interview_rejections 表的迁移脚本
 * 用于记录各阶段拒绝/不合适的详细信息
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', 'resume.db');

async function addRejectionsTable() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('========================================');
  console.log('添加 interview_rejections 表');
  console.log('========================================\n');

  try {
    // 检查表是否已存在
    const checkResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='interview_rejections'");
    
    if (checkResult.length > 0) {
      console.log('⚠ interview_rejections 表已存在，跳过创建\n');
      return;
    }

    // 创建 interview_rejections 表
    db.run(`
      CREATE TABLE interview_rejections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        
        -- 拒绝时的状态信息
        rejected_at_stage TEXT NOT NULL,        -- 拒绝时所在的阶段：resume_screening, interviewing, salary_negotiation, closed
        rejected_at_sub_status TEXT,            -- 拒绝时的子状态
        
        -- 拒绝分类和原因
        rejection_category TEXT,                -- 拒绝分类：screening, interview, salary, onboard, other
        rejection_reason_code TEXT,             -- 拒绝原因代码：technical_not_pass, salary_not_agree 等
        rejection_reason_detail TEXT,           -- 详细拒绝原因描述
        
        -- 决策者信息
        rejected_by INTEGER,                    -- 拒绝操作人ID
        rejected_by_name TEXT,                  -- 拒绝操作人姓名
        rejected_by_role TEXT,                  -- 拒绝操作人角色：HR, 面试官, 主管等
        
        -- 备注和反馈
        internal_notes TEXT,                    -- 内部备注（不对候选人展示）
        candidate_feedback TEXT,                -- 给候选人的反馈（如"技术深度不够"等可对外信息）
        
        -- 是否可重新打开
        is_reopenable INTEGER DEFAULT 0,        -- 是否可重新打开流程（0=否，1=是）
        reopen_conditions TEXT,                 -- 重新打开的条件（如"3个月后可重新投递"）
        
        -- 关联的面试轮次（如果是面试阶段拒绝）
        related_round_id INTEGER,               -- 关联的面试轮次ID
        
        -- 时间戳
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        
        FOREIGN KEY (match_id) REFERENCES position_resumes(id),
        FOREIGN KEY (related_round_id) REFERENCES interview_rounds(id)
      )
    `);

    // 创建索引
    db.run('CREATE INDEX idx_rejections_match_id ON interview_rejections(match_id)');
    db.run('CREATE INDEX idx_rejections_stage ON interview_rejections(rejected_at_stage)');
    db.run('CREATE INDEX idx_rejections_category ON interview_rejections(rejection_category)');
    db.run('CREATE INDEX idx_rejections_created_at ON interview_rejections(created_at)');

    console.log('✓ interview_rejections 表创建成功');
    console.log('✓ 索引创建成功\n');

    // 保存数据库
    const data = db.export();
    const outputBuffer = Buffer.from(data);
    fs.writeFileSync(dbPath, outputBuffer);
    console.log('✓ 数据库已保存\n');

  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    process.exit(1);
  }

  console.log('========================================');
  console.log('interview_rejections 表创建完成！');
  console.log('========================================');
  console.log('\n表结构：');
  console.log('- 基本信息：match_id, rejected_at_stage, rejected_at_sub_status');
  console.log('- 拒绝原因：rejection_category, rejection_reason_code, rejection_reason_detail');
  console.log('- 决策者：rejected_by, rejected_by_name, rejected_by_role');
  console.log('- 备注：internal_notes, candidate_feedback');
  console.log('- 重新打开：is_reopenable, reopen_conditions');
  console.log('- 关联：related_round_id（面试阶段拒绝时关联）');
}

addRejectionsTable().catch(console.error);
