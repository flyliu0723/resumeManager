# 招聘管理系统服务端接口文档与优化建议

## 一、接口概览

### 1.1 技术栈信息

| 技术项 | 说明 |
|--------|------|
| 后端框架 | Express.js (Node.js) |
| 数据库 | SQLite (resume.db) |
| 前端框架 | Vue 3 + Element Plus |
| API 风格 | RESTful API |
| 参数验证 | Joi |
| 接口基础路径 | /api |
| 服务端口 | 3000 |
| 接口总数 | 约 105 个 |

### 1.2 接口模块分类

| 模块名称 | 接口数量 | 主要功能 |
|----------|----------|----------|
| 职位管理 (Positions) | 10 | 职位CRUD、JD解析 |
| 简历管理 (Resumes) | 7 | 简历CRUD、预览、下载 |
| 匹配管理 (Position Resumes) | 8 | 简历-职位匹配、状态流转 |
| AI配置 (AI Configs) | 10 | AI服务配置管理 |
| 公司管理 (Companies) | 2 | 公司信息管理 |
| 流程日志 (Flow Logs) | 3 | 流程变更记录 |
| 面试流程 (Interview Flow) | 6 | 面试流程看板 |
| 面试事件 (Interviews) | 5 | 面试事件管理 |
| 面试轮次 (Interview Rounds) | 9 | 面试轮次管理 |
| 拒绝记录 (Interview Rejections) | 8 | 候选人拒绝管理 |
| 统计 (Stats) | 5 | 数据统计 |
| 动态流 (Activities) | 1 | 实时动态 |
| 备注 (Notes) | 4 | 职位备注管理 |
| 推荐 (Recommend) | 4 | AI推荐匹配 |
| 仪表盘 (Dashboard) | 8 | 综合仪表盘 |
| 技能同义词 (Skill Synonyms) | 7 | 技能同义词管理 |
| 招聘日志 (Recruit Log) | 8 | 招聘报表分析 |

### 1.3 HTTP方法分布

| HTTP方法 | 接口数量 | 占比 |
|----------|----------|------|
| GET | 约 55 | 52% |
| POST | 约 25 | 24% |
| PUT | 约 15 | 14% |
| DELETE | 约 10 | 10% |

## 二、详细接口清单

### 2.1 职位管理模块 (Positions)

**路由文件**: `server/router/positions.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/positions` | 获取所有职位列表 | 无 | JSON: `{active: [], archived: []}` |
| 2 | GET | `/api/positions/:id` | 获取单个职位详情 | `id` (路径参数) | JSON: 职位对象 |
| 3 | POST | `/api/positions` | 创建新职位 | `name, company, description, start_date` | JSON: 新建职位对象 |
| 4 | PUT | `/api/positions/:id` | 更新职位信息 | `id` + `name, company, description, start_date` | JSON: 更新后职位对象 |
| 5 | DELETE | `/api/positions/:id` | 删除职位 | `id` (路径参数) | JSON: `{success: true}` |
| 6 | POST | `/api/positions/:id/archive` | 归档职位 | `id` + `reason` | JSON: 归档后职位对象 |
| 7 | POST | `/api/positions/:id/restore` | 恢复职位 | `id` (路径参数) | JSON: 恢复后职位对象 |
| 8 | POST | `/api/positions/:id/parse-jd` | 解析职位JD | `id` + `jd_text` | JSON: 解析结果 |
| 9 | GET | `/api/positions/:id/parsed-jd` | 获取解析后的JD | `id` (路径参数) | JSON: 解析后数据 |
| 10 | PUT | `/api/positions/:id/parsed-field` | 更新解析字段 | `id` + `field_name, field_value` | JSON: 更新结果 |

**控制器文件**: `server/controller/positionController.js`
**验证规则**: `createPositionSchema`, `updatePositionSchema`

### 2.2 简历管理模块 (Resumes)

**路由文件**: `server/router/resumes.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/resumes/:id` | 获取简历详情 | `id` (路径参数) | JSON: 简历对象 + parsed_data_obj |
| 2 | GET | `/api/resumes/:id/content` | 获取简历文本内容 | `id` (路径参数) | JSON: `{candidateName, content}` |
| 3 | GET | `/api/resumes/:id/preview` | 预览简历文件 | `id` (路径参数) | 文件流 (inline) |
| 4 | GET | `/api/resumes/:id/download` | 下载简历文件 | `id` (路径参数) | 文件流 (attachment) |
| 5 | GET | `/api/resumes/:id/extract-text` | 提取简历文本 | `id` (路径参数) | JSON: `{candidateName, content, fileFormat}` |
| 6 | POST | `/api/resumes/:id/parse` | 解析简历 | `id` + `positionId` (query) | JSON: 解析后简历对象 |
| 7 | DELETE | `/api/resumes/:id` | 删除简历 | `id` (路径参数) | JSON: `{success: true}` |

**控制器文件**: `server/controller/resumeController.js`

### 2.3 职位-简历匹配模块 (Position Resumes)

**路由文件**: `server/router/positionResumes.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/positions/:positionId/resumes` | 获取职位下的简历列表 | `positionId` (路径参数) + 筛选参数 | JSON: 简历匹配列表 |
| 2 | POST | `/api/positions/:positionId/resumes` | 上传简历到职位 | `positionId` + `file, source, note` | JSON: 匹配对象 |
| 3 | GET | `/api/positions/position-resumes/:id` | 获取匹配详情 | `id` (路径参数) | JSON: 匹配对象 |
| 4 | PUT | `/api/positions/position-resumes/:id/status` | 更新匹配状态 | `id` + `mainStatus, subStatus, actionType` | JSON: 更新后对象 |
| 5 | POST | `/api/positions/position-resumes/:id/reopen` | 重新打开流程 | `id` (路径参数) | JSON: 重新打开结果 |
| 6 | GET | `/api/positions/position-resumes/:id/next-options` | 获取下一个状态选项 | `id` (路径参数) | JSON: 可选状态列表 |
| 7 | GET | `/api/positions/rejection-reasons` | 获取拒绝原因列表 | 无 | JSON: 拒绝原因列表 |
| 8 | DELETE | `/api/positions/position-resumes/:id` | 删除匹配记录 | `id` (路径参数) | JSON: `{success: true}` |

**控制器文件**: `server/controller/positionResumeController.js`
**验证规则**: `updateStatusSchema`, `uploadResumeSchema`

### 2.4 AI配置模块 (AI Configs)

**路由文件**: `server/router/aiConfigs.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/ai-configs` | 获取所有AI配置 | 无 | JSON: 配置列表 |
| 2 | GET | `/api/ai-configs/:id` | 获取单个配置 | `id` (路径参数) | JSON: 配置对象 |
| 3 | GET | `/api/ai-configs/active/current` | 获取当前激活配置 | 无 | JSON: 当前配置 |
| 4 | GET | `/api/ai-configs/providers` | 获取AI提供商列表 | 无 | JSON: [{value, label, fields, apiUrl}] |
| 5 | GET | `/api/ai-configs/models` | 获取模型列表 | `provider` (query) | JSON: 模型列表 |
| 6 | POST | `/api/ai-configs` | 创建AI配置 | `name, provider, api_key, api_url, model` | JSON: 新建配置 |
| 7 | PUT | `/api/ai-configs/:id` | 更新AI配置 | `id` + `name, provider, api_key, api_url, model` | JSON: 更新后配置 |
| 8 | POST | `/api/ai-configs/:id/set-active` | 设置激活配置 | `id` (路径参数) | JSON: 激活后配置 |
| 9 | POST | `/api/ai-configs/:id/test` | 测试API连接 | `id` (路径参数) | JSON: 测试结果 |
| 10 | DELETE | `/api/ai-configs/:id` | 删除AI配置 | `id` (路径参数) | JSON: `{success: true}` |

**控制器文件**: `server/controller/aiConfigController.js`
**验证规则**: `createAIConfigSchema`
**支持的AI提供商**: 智谱GLM, MiniMax, DeepSeek, OpenAI

### 2.5 公司管理模块 (Companies)

**路由文件**: `server/router/companies.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/companies` | 获取所有公司 | 无 | JSON: 公司列表 |
| 2 | GET | `/api/companies/search` | 搜索公司 | `search` (query) | JSON: 搜索结果 |

**控制器文件**: `server/controller/companyController.js`

### 2.6 流程日志模块 (Flow Logs)

**路由文件**: `server/router/flowLogs.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/flow-logs/match/:matchId/flow-logs` | 获取匹配的流程日志 | `matchId` (路径参数) | JSON: 流程日志列表 |
| 2 | POST | `/api/flow-logs/match/flow-log` | 创建流程日志 | `match_id, action, details` | JSON: 新建日志 |
| 3 | PUT | `/api/flow-logs/match/:matchId/jd-supplement` | 更新JD补充信息 | `matchId` + `supplement` | JSON: 更新结果 |

**控制器文件**: `server/controller/flowLogController.js`

### 2.7 面试流程模块 (Interview Flow)

**路由文件**: `server/router/interviewFlow.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/interview-flow/candidates` | 获取候选人列表 | 无 | JSON: 候选人列表 |
| 2 | GET | `/api/interview-flow/overview` | 获取流程概览 | 无 | JSON: 概览数据 |
| 3 | GET | `/api/interview-flow/risk-factors` | 获取风险因素 | 无 | JSON: 风险因素列表 |
| 4 | GET | `/api/interview-flow/timeline` | 获取时间线 | 无 | JSON: 时间线数据 |
| 5 | GET | `/api/interview-flow/dashboard-stats` | 获取仪表盘统计 | 无 | JSON: 统计数据 |
| 6 | GET | `/api/interview-flow/candidates-by-status` | 按状态获取候选人 | `status` (query) | JSON: 候选人列表 |

**控制器文件**: `server/controller/interviewFlowController.js`

### 2.8 面试事件模块 (Interviews)

**路由文件**: `server/router/interviews.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/interviews` | 获取面试事件列表 | 筛选参数 | JSON: 事件列表 |
| 2 | GET | `/api/interviews/:id` | 获取单个事件详情 | `id` (路径参数) | JSON: 事件对象 |
| 3 | GET | `/api/interviews/stats/daily` | 获取每日统计 | 无 | JSON: 每日统计数据 |
| 4 | GET | `/api/interviews/stats/types` | 获取事件类型统计 | 无 | JSON: 类型统计数据 |
| 5 | POST | `/api/interviews` | 创建面试事件 | `interviewRound, interviewType, scheduledAt` | JSON: 新建事件 |

**控制器文件**: `server/controller/interviewsController.js`
**验证规则**: `scheduleInterviewSchema`

### 2.9 面试轮次模块 (Interview Rounds)

**路由文件**: `server/router/interviewRounds.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/interview-rounds/match/:matchId` | 获取所有面试轮次 | `matchId` (路径参数) | JSON: 轮次列表 |
| 2 | GET | `/api/interview-rounds/match/:matchId/current` | 获取当前轮次 | `matchId` (路径参数) | JSON: 当前轮次 |
| 3 | GET | `/api/interview-rounds/match/:matchId/completed` | 获取已完成轮次 | `matchId` (路径参数) | JSON: 已完成轮次 |
| 4 | GET | `/api/interview-rounds/:id` | 获取轮次详情 | `id` (路径参数) | JSON: 轮次对象 |
| 5 | POST | `/api/interview-rounds/match/:matchId` | 创建面试轮次 | `matchId` + 轮次信息 | JSON: 新建轮次 |
| 6 | PUT | `/api/interview-rounds/:id/status` | 更新轮次状态 | `id` + `status, result` | JSON: 更新后轮次 |
| 7 | POST | `/api/interview-rounds/:id/feedback` | 添加面试反馈 | `id` + 反馈信息 | JSON: 反馈对象 |
| 8 | PUT | `/api/interview-rounds/feedback/:feedbackId` | 更新面试反馈 | `feedbackId` + 反馈内容 | JSON: 更新结果 |
| 9 | DELETE | `/api/interview-rounds/:id` | 删除面试轮次 | `id` (路径参数) | JSON: `{success: true}` |

**控制器文件**: `server/controller/interviewRoundController.js`

### 2.10 拒绝记录模块 (Interview Rejections)

**路由文件**: `server/router/interviewRejections.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/interview-rejections/match/:matchId` | 获取拒绝记录 | `matchId` (路径参数) | JSON: 拒绝记录列表 |
| 2 | GET | `/api/interview-rejections/:id` | 获取单个拒绝记录 | `id` (路径参数) | JSON: 拒绝记录对象 |
| 3 | POST | `/api/interview-rejections/match/:matchId` | 创建拒绝记录 | `matchId` + `reason, stage` | JSON: 新建记录 |
| 4 | PUT | `/api/interview-rejections/:id` | 更新拒绝记录 | `id` + 记录信息 | JSON: 更新后记录 |
| 5 | GET | `/api/interview-rejections/stats/by-stage` | 按阶段统计拒绝 | 无 | JSON: 阶段统计 |
| 6 | GET | `/api/interview-rejections/stats/by-reason` | 按原因统计拒绝 | 无 | JSON: 原因统计 |
| 7 | GET | `/api/interview-rejections/list/reopenable` | 获取可重新打开列表 | 无 | JSON: 可重新打开列表 |
| 8 | DELETE | `/api/interview-rejections/:id` | 删除拒绝记录 | `id` (路径参数) | JSON: `{success: true}` |

**控制器文件**: `server/controller/interviewRejectionController.js`

### 2.11 统计模块 (Stats)

**路由文件**: `server/router/stats.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/stats/daily` | 获取今日统计 | 无 | JSON: 今日数据 |
| 2 | GET | `/api/stats/heat` | 获取职位热度 | 无 | JSON: 热度排行 |
| 3 | GET | `/api/stats/source` | 获取简历来源分布 | 无 | JSON: 来源分布 |
| 4 | GET | `/api/stats/trend` | 获取近30天趋势 | 无 | JSON: 趋势数据 |
| 5 | GET | `/api/stats/funnel` | 获取招聘漏斗数据 | 无 | JSON: 漏斗数据 |

**控制器文件**: `server/controller/statsController.js`

### 2.12 动态流模块 (Activities)

**路由文件**: `server/router/activities.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/activities` | 获取实时动态流 | 无 | JSON: 动态列表 |

### 2.13 备注模块 (Notes)

**路由文件**: `server/router/notes.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/positions/:positionId/notes` | 获取职位备注 | `positionId` (路径参数) | JSON: 备注列表 |
| 2 | POST | `/api/positions/:positionId/notes` | 创建备注 | `positionId` + `content` | JSON: 新建备注 |
| 3 | PUT | `/api/positions/:positionId/notes/:noteId` | 更新备注 | `positionId, noteId` + `content` | JSON: 更新后备注 |
| 4 | DELETE | `/api/positions/:positionId/notes/:noteId` | 删除备注 | `positionId, noteId` (路径参数) | JSON: `{success: true}` |

**控制器文件**: `server/controller/noteController.js`

### 2.14 推荐模块 (Recommend)

**路由文件**: `server/router/recommend.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | POST | `/api/positions/:id/recommend` | 触发推荐计算 | `id` (路径参数) | JSON: 触发结果 |
| 2 | GET | `/api/positions/:id/recommendations` | 获取推荐列表 | `id` (路径参数) + `page, limit` | JSON: 推荐列表 |
| 3 | GET | `/api/positions/:id/recommendations/status` | 获取计算状态 | `id` (路径参数) | JSON: 计算状态 |
| 4 | POST | `/api/positions/:id/recommendations/:resumeId/accept` | 接受推荐 | `id, resumeId` (路径参数) | JSON: 接受结果 |

**控制器文件**: `server/controller/recommendController.js`

### 2.15 仪表盘模块 (Dashboard)

**路由文件**: `server/router/dashboard.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/dashboard/stats` | 获取仪表盘统计 | 无 | JSON: 统计数据 |
| 2 | GET | `/api/dashboard/funnel-data` | 获取漏斗数据 | 无 | JSON: 漏斗数据 |
| 3 | GET | `/api/dashboard/funnel-metrics` | 获取漏斗指标 | 无 | JSON: 漏斗指标 |
| 4 | GET | `/api/dashboard/heat-data` | 获取热度数据 | 无 | JSON: 热度数据 |
| 5 | GET | `/api/dashboard/source-data` | 获取来源数据 | 无 | JSON: 来源数据 |
| 6 | GET | `/api/dashboard/trend-data` | 获取趋势数据 | 无 | JSON: 趋势数据 |
| 7 | GET | `/api/dashboard/activities` | 获取操作动态 | 无 | JSON: 动态列表 |
| 8 | GET | `/api/dashboard/candidates-by-main-status` | 按状态获取候选人 | `mainStatus` (query) | JSON: 候选人列表 |

**控制器文件**: `server/controller/dashboardController.js`

### 2.16 技能同义词模块 (Skill Synonyms)

**路由文件**: `server/router/skillSynonyms.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/skill-synonyms` | 获取所有同义词 | 无 | JSON: 同义词对象 |
| 2 | POST | `/api/skill-synonyms` | 添加同义词 | `skill, synonyms, category` | JSON: 添加结果 |
| 3 | PUT | `/api/skill-synonyms/:skill` | 更新同义词 | `skill` + `synonyms, category` | JSON: 更新结果 |
| 4 | DELETE | `/api/skill-synonyms/:skill` | 删除同义词 | `skill` (路径参数) | JSON: `{success: true}` |
| 5 | POST | `/api/skill-synonyms/import` | 批量导入 | `format, data` | JSON: 导入统计 |
| 6 | POST | `/api/skill-synonyms/save-all` | 保存所有(覆盖) | `data` 对象 | JSON: `{success: true}` |
| 7 | GET | `/api/skill-synonyms/categories` | 获取分类列表 | 无 | JSON: 分类列表 |

### 2.17 招聘日志模块 (Recruit Log)

**路由文件**: `server/router/recruitLog.js`

| 序号 | HTTP方法 | 路由路径 | 接口功能 | 输入参数 | 输出格式 |
|------|----------|----------|----------|----------|----------|
| 1 | GET | `/api/recruit-log/bottleneck-analysis` | 瓶颈分析 | 无 | JSON: 瓶颈分析数据 |
| 2 | GET | `/api/recruit-log/candidate-warnings` | 候选人预警 | 无 | JSON: 预警列表 |
| 3 | GET | `/api/recruit-log/channel-roi` | 渠道ROI | 无 | JSON: ROI数据 |
| 4 | GET | `/api/recruit-log/workload-stats` | 工作量统计 | 无 | JSON: 工作量统计 |
| 5 | GET | `/api/recruit-log/position-progress` | 职位进度 | 无 | JSON: 进度数据 |
| 6 | GET | `/api/recruit-log/market-feedback` | 市场反馈 | 无 | JSON: 反馈数据 |
| 7 | GET | `/api/recruit-log/weekly-report` | 周报 | 无 | JSON: 周报数据 |
| 8 | GET | `/api/recruit-log/daily-report` | 日报 | 无 | JSON: 日报数据 |

**控制器文件**: `server/controller/recruitLogController.js`

## 三、响应格式规范

### 3.1 成功响应

```json
{
  "success": true,
  "code": 200,
  "data": { ... },
  "message": "操作成功",
  "meta": { ... }
}
```

### 3.2 错误响应

```json
{
  "success": false,
  "code": 400,
  "message": "错误信息",
  "errors": [ ... ]
}
```

### 3.3 分页响应

```json
{
  "success": true,
  "code": 200,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 3.4 主状态流转系统

系统支持以下主状态流转：

```
resume_screening (简历筛选)
    ↓
interviewing (面试中)
    ↓
salary_negotiation (薪资谈判)
    ↓
closed (录用/关闭)
    ↓
rejected (拒绝)
```

每个主状态包含多个子状态，支持拒绝和重新打开功能。

## 四、优化建议

### 4.1 接口设计优化

#### 4.1.1 路由规范化问题

**问题**: 部分路由命名不一致，如：
- `/api/positions/:id/parsed-jd` (GET)
- `/api/positions/:id/parsed-field` (PUT)

**建议**: 统一使用 RESTful 设计模式

```
GET    /api/positions/:id/jd           -> 获取JD
PUT    /api/positions/:id/jd           -> 更新JD
GET    /api/positions/:id/jd/parsed    -> 获取解析后的JD
```

#### 4.1.2 嵌套路由过深

**问题**: 部分接口嵌套层级过深，如：
- `/api/positions/:positionId/resumes`
- `/api/positions/position-resumes/:id`

**建议**: 扁平化路由设计

```
GET    /api/matches/:id                -> 匹配详情
GET    /api/matches?positionId=:id     -> 职位下的匹配列表
```

#### 4.1.3 缺少API版本控制

**问题**: 所有接口直接使用 `/api` 前缀，无版本控制

**建议**: 添加版本控制

```
/api/v1/positions
/api/v2/positions
```

### 4.2 性能优化

#### 4.2.1 数据库查询优化

**问题**: 部分查询缺少索引，可能导致大数据量下性能下降

**建议**: 为常用查询字段添加索引

```sql
-- positions表
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_company ON positions(company);

-- resumes表
CREATE INDEX idx_resumes_candidate_name ON resumes(candidate_name);
CREATE INDEX idx_resumes_created_at ON resumes(created_at);

-- position_resumes表
CREATE INDEX idx_position_resumes_main_status ON position_resumes(main_status);
CREATE INDEX idx_position_resumes_sub_status ON position_resumes(sub_status);
```

#### 4.2.2 缺少缓存机制

**问题**: 仪表盘、统计等接口每次请求都实时计算

**建议**: 实现缓存策略

- 仪表盘数据缓存 5-10 分钟
- 统计接口按日期缓存
- AI配置等静态数据长期缓存

#### 4.2.3 大文件传输优化

**问题**: 简历预览/下载接口直接传输文件

**建议**: 实现断点续传和压缩

```javascript
// 支持 Range 请求
// 添加 Content-Encoding: gzip
// 实现文件分块传输
```

### 4.3 安全性优化

#### 4.3.1 缺少认证授权

**问题**: 所有接口均为公开访问，无身份验证

**建议**: 实现认证机制

```javascript
// 添加 JWT 认证中间件
// 实现基于角色的访问控制 (RBAC)
// 敏感操作添加操作日志
```

#### 4.3.2 API Key 暴露风险

**问题**: AI配置的 api_key 在某些接口响应中可能暴露

**建议**: 敏感字段脱敏

```javascript
// GET /api/ai-configs 时，api_key 返回脱敏后的值
// 实际API调用在服务端完成
```

#### 4.3.3 输入验证加强

**问题**: 部分接口验证规则不完整

**建议**: 统一使用 Joi 进行全面验证

```javascript
const schema = Joi.object({
  name: Joi.string().max(100).required(),
  company: Joi.string().max(200),
  description: Joi.string().max(5000),
  start_date: Joi.date().iso()
});
```

### 4.4 可维护性优化

#### 4.4.1 接口文档缺失

**问题**: 缺少完整的 API 文档

**建议**: 使用 Swagger/OpenAPI 自动生成文档

```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '招聘管理系统 API',
      version: '1.0.0',
      description: '招聘管理系统的服务端接口文档'
    }
  },
  apis: ['./server/routes/*.js']
};
```

#### 4.4.2 错误处理不统一

**问题**: 部分接口错误处理不一致

**建议**: 统一错误处理规范

```javascript
// 定义标准错误代码
const ERROR_CODES = {
  VALIDATION_ERROR: '参数验证错误',
  NOT_FOUND: '资源不存在',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '禁止访问',
  INTERNAL_ERROR: '服务器内部错误'
};
```

#### 4.4.3 缺少接口日志

**问题**: 无法追踪接口调用情况

**建议**: 实现请求日志中间件

```javascript
// 记录请求耗时
// 记录请求参数和响应
// 实现请求追踪 ID
```

### 4.5 功能扩展建议

#### 4.5.1 批量操作接口

**建议**: 增加批量处理能力

```
POST /api/positions/batch     -> 批量创建职位
POST /api/resumes/batch       -> 批量上传简历
PUT  /api/matches/batch/status -> 批量更新状态
```

#### 4.5.2 异步任务接口

**建议**: 对于耗时的AI操作，实现异步任务

```
POST /api/jobs/parse-jd       -> 创建解析任务
GET  /api/jobs/:id/status      -> 查询任务状态
GET  /api/jobs/:id/result      -> 获取任务结果
```

#### 4.5.3 导出功能

**建议**: 增加数据导出接口

```
GET  /api/positions/:id/export     -> 导出职位下的简历
GET  /api/stats/export             -> 导出统计数据
```

#### 4.5.4 Webhook 支持

**建议**: 集成外部系统

```
POST /api/webhooks/register        -> 注册 Webhook
GET  /api/webhooks                 -> 查看已注册的 Webhook
DELETE /api/webhooks/:id           -> 删除 Webhook
```

### 4.6 数据库优化

#### 4.6.1 连接池配置

**当前问题**: SQLite 不支持连接池，但内存模式无连接管理

**建议**: 对于生产环境，迁移到 MySQL/PostgreSQL

```javascript
// 使用数据库连接池
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'resume_db'
});
```

#### 4.6.2 分表策略

**建议**: 当数据量大时，实现分表

```
resumes_2024_01, resumes_2024_02, ...
position_resumes_2024_01, position_resumes_2024_02, ...
```

#### 4.6.3 数据归档

**建议**: 实现历史数据归档策略

```sql
-- 归档 2 年前的数据
INSERT INTO positions_archive SELECT * FROM positions WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
DELETE FROM positions WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

### 4.7 监控与日志

#### 4.7.1 接口监控

**建议**: 添加接口性能监控

```javascript
// APM 集成
// 接口响应时间统计
// 错误率监控
// 业务指标监控
```

#### 4.7.2 日志规范

**建议**: 统一日志格式

```javascript
// 结构化日志输出
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO",
  "traceId": "xxx",
  "spanId": "yyy",
  "method": "GET",
  "path": "/api/positions",
  "duration": 45,
  "statusCode": 200
}
```

## 五、实施优先级

### 高优先级 (立即实施)

| 序号 | 优化项 | 说明 |
|------|--------|------|
| 1 | 统一错误处理 | 完善错误处理中间件 |
| 2 | 完善输入验证 | 全面使用 Joi 验证 |
| 3 | 添加常用查询索引 | 优化数据库查询性能 |
| 4 | API Key 脱敏 | 保护敏感信息 |
| 5 | 接口日志记录 | 追踪接口调用情况 |

### 中优先级 (1-2周内)

| 序号 | 优化项 | 说明 |
|------|--------|------|
| 1 | Swagger 文档生成 | 自动生成 API 文档 |
| 2 | 缓存策略实现 | 减少重复计算 |
| 3 | 批量操作接口 | 提高操作效率 |
| 4 | 数据归档策略 | 管理历史数据 |
| 5 | 异步任务系统 | 处理耗时操作 |

### 低优先级 (长期规划)

| 序号 | 优化项 | 说明 |
|------|--------|------|
| 1 | JWT 认证授权 | 增加安全性 |
| 2 | API 版本控制 | 支持多版本共存 |
| 3 | 数据库迁移方案 | 支持生产环境部署 |
| 4 | Webhook 支持 | 集成外部系统 |
| 5 | 监控系统集成 | 性能监控和告警 |

## 六、关键文件路径

### 路由文件

| 文件路径 | 说明 |
|----------|------|
| `server/router/index.js` | 主路由入口 |
| `server/router/positions.js` | 职位管理路由 |
| `server/router/resumes.js` | 简历管理路由 |
| `server/router/aiConfigs.js` | AI配置路由 |
| `server/router/companies.js` | 公司管理路由 |
| `server/router/flowLogs.js` | 流程日志路由 |
| `server/router/interviewFlow.js` | 面试流程路由 |
| `server/router/interviews.js` | 面试事件路由 |
| `server/router/interviewRounds.js` | 面试轮次路由 |
| `server/router/interviewRejections.js` | 拒绝记录路由 |
| `server/router/positionResumes.js` | 匹配管理路由 |
| `server/router/stats.js` | 统计路由 |
| `server/router/activities.js` | 动态流路由 |
| `server/router/notes.js` | 备注路由 |
| `server/router/recommend.js` | 推荐路由 |
| `server/router/dashboard.js` | 仪表盘路由 |
| `server/router/skillSynonyms.js` | 技能同义词路由 |
| `server/router/recruitLog.js` | 招聘日志路由 |

### 控制器文件

| 文件路径 | 说明 |
|----------|------|
| `server/controller/positionController.js` | 职位控制器 |
| `server/controller/resumeController.js` | 简历控制器 |
| `server/controller/aiConfigController.js` | AI配置控制器 |
| `server/controller/companyController.js` | 公司控制器 |
| `server/controller/flowLogController.js` | 流程日志控制器 |
| `server/controller/interviewFlowController.js` | 面试流程控制器 |
| `server/controller/interviewsController.js` | 面试事件控制器 |
| `server/controller/interviewRoundController.js` | 面试轮次控制器 |
| `server/controller/interviewRejectionController.js` | 拒绝记录控制器 |
| `server/controller/positionResumeController.js` | 匹配管理控制器 |
| `server/controller/statsController.js` | 统计控制器 |
| `server/controller/noteController.js` | 备注控制器 |
| `server/controller/recommendController.js` | 推荐控制器 |
| `server/controller/dashboardController.js` | 仪表盘控制器 |
| `server/controller/recruitLogController.js` | 招聘日志控制器 |

### 基础设施

| 文件路径 | 说明 |
|----------|------|
| `server/index.js` | 服务入口 |
| `server/database.js` | 数据库操作 |
| `server/middleware/validator.js` | 参数验证 |
| `server/middleware/errorHandler.js` | 错误处理 |
| `server/utils/response.js` | 响应封装 |

## 七、数据库表结构

### 7.1 核心表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| positions | 职位表 | id, name, company, description, start_date, status |
| resumes | 简历表 | id, name, file_path, content, parsed_data, candidate_name |
| position_resumes | 匹配表 | id, resume_id, position_id, main_status, sub_status, match_score |
| companies | 公司表 | id, name |
| position_notes | 备注表 | id, position_id, content |

### 7.2 面试相关表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| interview_rounds | 面试轮次表 | id, match_id, round_number, status, result |
| interview_feedbacks | 面试评价表 | id, round_id, dimension_name, score, comment |
| interview_rejections | 拒绝记录表 | id, match_id, rejection_reason, is_reopenable |
| interview_events | 面试事件表 | id, event_type, candidate_id, position_id |

### 7.3 配置相关表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| ai_configs | AI配置表 | id, name, provider, api_key, model, is_active |
| skill_synonyms | 技能同义词表 | skill_name, synonyms, category |

### 7.4 日志表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| position_resume_flow_logs | 流程日志表 | id, match_id, main_status_from, main_status_to, action_type |
| jd_resume_matches | JD匹配结果表 | id, position_id, resume_id, match_score |
| skill_resume_index | 技能索引表 | skill_name, resume_id |

## 八、常见问题

### 8.1 如何添加新的API接口？

1. 在 `server/router/` 目录下创建或编辑路由文件
2. 定义路由和HTTP方法
3. 在 `server/controller/` 目录下创建或编辑控制器
4. 添加参数验证规则（如需要）
5. 在 `server/router/index.js` 中注册路由

### 8.2 如何修改数据库表结构？

1. 在 `server/database.js` 中找到对应的表创建代码
2. 使用 `ALTER TABLE` 语句添加新字段
3. 重启服务后自动执行迁移

### 8.3 如何调试API接口？

1. 使用 Postman 或 curl 测试接口
2. 查看控制台日志输出
3. 使用 `console.log` 调试控制器逻辑
4. 检查数据库数据是否正确

### 8.4 如何处理跨域问题？

项目已配置 CORS 中间件，允许跨域请求。如需修改，请编辑 `server/index.js`。

### 8.5 如何添加参数验证？

1. 在 `server/middleware/validator.js` 中定义验证 schema
2. 在路由中使用 `validate('schemaName')` 中间件

## 九、测试建议

### 9.1 接口测试清单

| 模块 | 测试项 | 优先级 |
|------|--------|--------|
| 职位管理 | CRUD操作、状态流转 | 高 |
| 简历管理 | 文件上传、预览、下载 | 高 |
| 匹配管理 | 状态更新、流程日志 | 高 |
| AI配置 | API测试、配置切换 | 中 |
| 面试轮次 | 反馈添加、状态更新 | 中 |

### 9.2 性能测试建议

- 使用 wrk 或 ab 进行压力测试
- 测试并发请求下的响应时间
- 验证大数据量下的查询性能
- 测试文件上传下载性能

---

**文档版本**: 1.0
**最后更新**: 2024年
**维护者**: 招聘管理系统开发团队
