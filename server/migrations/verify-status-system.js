/**
 * 验证新的状态系统数据库结构
 */

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', 'resume.db');

async function verify() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('========================================');
  console.log('验证新的状态系统数据库结构');
  console.log('========================================\n');

  // 1. 检查 position_resumes 表结构
  console.log('1. position_resumes 表结构:');
  const prColumns = db.exec("PRAGMA table_info(position_resumes)")[0].values;
  const newFields = ['main_status', 'sub_status', 'interview_round', 'current_round_id'];
  newFields.forEach(field => {
    const col = prColumns.find(c => c[1] === field);
    if (col) {
      console.log(`   ✓ ${field}: ${col[2]}`);
    } else {
      console.log(`   ✗ ${field}: 不存在`);
    }
  });

  // 2. 检查 interview_rounds 表
  console.log('\n2. interview_rounds 表:');
  try {
    const irColumns = db.exec("PRAGMA table_info(interview_rounds)")[0].values;
    console.log(`   ✓ 表存在，共 ${irColumns.length} 个字段`);
    console.log('   关键字段:');
    ['match_id', 'round_number', 'round_type', 'status', 'result', 'feedback_json'].forEach(field => {
      const col = irColumns.find(c => c[1] === field);
      if (col) console.log(`     - ${field}: ${col[2]}`);
    });
  } catch (e) {
    console.log('   ✗ 表不存在');
  }

  // 3. 检查 interview_feedbacks 表
  console.log('\n3. interview_feedbacks 表:');
  try {
    const ifColumns = db.exec("PRAGMA table_info(interview_feedbacks)")[0].values;
    console.log(`   ✓ 表存在，共 ${ifColumns.length} 个字段`);
  } catch (e) {
    console.log('   ✗ 表不存在');
  }

  // 4. 检查 flow_logs 增强字段
  console.log('\n4. flow_logs 增强字段:');
  const flColumns = db.exec("PRAGMA table_info(position_resume_flow_logs)")[0].values;
  const enhancedFields = ['main_status_from', 'main_status_to', 'sub_status_from', 'sub_status_to', 'round_id', 'action_type', 'metadata_json'];
  enhancedFields.forEach(field => {
    const col = flColumns.find(c => c[1] === field);
    if (col) {
      console.log(`   ✓ ${field}`);
    } else {
      console.log(`   ✗ ${field}: 不存在`);
    }
  });

  // 5. 检查数据迁移状态
  console.log('\n5. 数据迁移状态:');
  const result = db.exec("SELECT COUNT(*) as total FROM position_resumes");
  const total = result[0].values[0][0];
  console.log(`   总记录数: ${total}`);

  const migratedResult = db.exec("SELECT COUNT(*) as migrated FROM position_resumes WHERE main_status IS NOT NULL AND main_status != ''");
  const migrated = migratedResult[0].values[0][0];
  console.log(`   已迁移记录数: ${migrated}`);

  // 6. 显示状态分布
  console.log('\n6. 新状态系统分布:');
  const statusDist = db.exec(`
    SELECT main_status, sub_status, COUNT(*) as count 
    FROM position_resumes 
    GROUP BY main_status, sub_status
  `);
  if (statusDist.length > 0) {
    statusDist[0].values.forEach(row => {
      console.log(`   ${row[0]} / ${row[1]}: ${row[2]} 条`);
    });
  }

  console.log('\n========================================');
  console.log('验证完成！');
  console.log('========================================');
}

verify().catch(console.error);
