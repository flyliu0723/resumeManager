# 招聘日志页面开发计划

## 需求概述

### 模块一：个人复盘（"我的招聘教练"模式）
- **损耗诊断**：分析各阶段淘汰率，识别瓶颈
- **候选人预警中心**：列出超过3天无进展的优质候选人
- **渠道性价比**：各渠道的ROI转化率分析

### 模块二：老板日志/周报（"向上管理"模式）
- **量化苦劳**：展示工作量统计（筛选简历、深度沟通、面试安排）
- **核心职位进度条**：重点职位的完成百分比
- **市场反馈报告**：候选人负面反馈汇总，转化为公司竞争力问题

## 开发任务清单

### 阶段1：后端API开发 ✅ 已完成
**文件：`server/router/recruitLog.js`**
```
GET /api/recruit-log/bottleneck-analysis  - 损耗诊断
GET /api/recruit-log/candidate-warnings   - 候选人预警
GET /api/recruit-log/channel-roi          - 渠道ROI
GET /api/recruit-log/workload-stats       - 工作量统计
GET /api/recruit-log/position-progress    - 职位进度
GET /api/recruit-log/market-feedback     - 市场反馈
GET /api/recruit-log/weekly-report       - 综合周报
```

**文件：`server/controller/recruitLogController.js`**
- 损耗诊断：按main_status分组统计淘汰率
- 预警逻辑：筛选updated_at > 3天且match_score > 70的候选人
- ROI计算：按source字段分组计算转化率

### 状态判断逻辑修复 ✅ 已修复
1. **面试数统计**：只统计真正进行了面试的候选人
   - interviewing + round_scheduled/round_passed/all_rounds_passed 才计入面试数
   - 排除 round_pending（待安排但尚未面试）

2. **终态判断**：
   - 只有 closed + onboarded 才是真正的终态
   - closed + pending_onboard 不算终态（待入职可重新跟进）

3. **职位进度计算**：
   - 增加 subStages 子状态细分统计
   - progress = (已面试人数 + 已入职人数) / 总人数

### 阶段2：前端数据层 ✅ 已完成
**文件：`src/composables/useRecruitLog.js`**
- 参考useDashboardData.js模式
- 统一获取日志页面所需数据

### 阶段3：页面组件 ✅ 已完成
**文件：`src/views/RecruitLogView.vue`**
- 采用DashboardView卡片式设计
- Tab切换：个人复盘 / 老板日志

### 阶段4：路由配置 ✅ 已完成
**文件：`src/router/index.js`**
```javascript
{
  path: '/recruit-log',
  name: 'recruitLog',
  component: () => import('../views/RecruitLogView.vue')
}
```

## 文件创建清单

### 新建文件
- `server/router/recruitLog.js`
- `server/controller/recruitLogController.js`
- `src/views/RecruitLogView.vue`
- `src/composables/useRecruitLog.js`

### 修改文件
- `server/router/index.js` - 添加路由
- `src/router/index.js` - 添加路由
- `src/App.vue` - 添加侧边栏菜单
- `server/database.js` - 添加 interviewRejectionStmt.getAll()

## 技术细节

### 状态判断辅助函数
```javascript
// 判断是否为终态（只有 closed+onboarded 或 rejected 才是终态）
function isTerminalStatus(mainStatus, subStatus) {
  if (mainStatus === 'closed') return subStatus === 'onboarded'
  if (mainStatus === 'rejected') return true
  return false
}

// 判断是否成功入职
function isClosedSuccessfully(mainStatus, subStatus) {
  return mainStatus === 'closed' && subStatus === 'onboarded'
}

// 判断是否真正进行过面试
function hasInterviewed(match) {
  if (match.main_status === 'interviewing') {
    const interviewedSubStatuses = ['round_scheduled', 'round_passed', 'all_rounds_passed']
    return interviewedSubStatuses.includes(match.sub_status)
  }
  return ['salary_negotiation', 'closed'].includes(match.main_status)
}
```

### 子状态细分统计
```javascript
// 职位进度返回的 subStages 字段
subStages: {
  roundPending: 0,      // 待安排面试
  roundScheduled: 1,     // 已安排面试
  roundPassed: 0,       // 面试通过
  pendingOnboard: 0,    // 待入职
  onboarded: 1          // 已入职
}
```

### 渠道ROI计算
```javascript
{
  source: 'BOSS',
  totalResumes: 100,
  interviewCount: 5,    // 只统计已面试的候选人
  closedCount: 1,       // 只统计已入职的候选人
  interviewRate: '5%',  // 简历→面试转化率
  closeRate: '1%'       // 简历→成单转化率
}
```

## 验证结果 ✅

| API端点 | 状态 | 说明 |
|---------|------|------|
| GET /api/recruit-log/bottleneck-analysis | ✅ | 损耗诊断正常 |
| GET /api/recruit-log/candidate-warnings | ✅ | 预警逻辑正确 |
| GET /api/recruit-log/channel-roi | ✅ | 面试统计已修复 |
| GET /api/recruit-log/workload-stats | ✅ | 工作量统计正常 |
| GET /api/recruit-log/position-progress | ✅ | 包含子状态细分 |
| GET /api/recruit-log/market-feedback | ✅ | 市场反馈正常 |
| GET /api/recruit-log/weekly-report | ✅ | 周报数据准确 |

## 访问地址
- 前端页面：http://localhost:5174/recruit-log
- 后端API：http://localhost:3000/api/recruit-log/*
