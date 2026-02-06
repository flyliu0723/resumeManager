# Resume Parser System

简历解析系统 - 基于云端AI的简历解析

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   用户浏览器                         │
└─────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────┐
│  前端 (Vue 3 + Vite)     http://localhost:5173      │
└─────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────┐
│  后端 API (Node.js)      http://localhost:3000      │
│  - 简历解析 (集成AI API调用)                         │
│  - PDF/DOCX文本提取                                 │
│  - SQLite 数据库                                    │
└─────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────┐
│  云端AI服务                                         │
│  - 智谱GLM (glm-4)                                  │
│  - MiniMax (abab6.5s-chat)                          │
│  - DeepSeek (deepseek-chat)                         │
│  - OpenAI (gpt-3.5-turbo)                          │
└─────────────────────────────────────────────────────┘
```

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动后端服务

```bash
npm start
```

服务运行在 http://localhost:3000

### 3. 启动前端开发服务器

```bash
npm run dev
```

服务运行在 http://localhost:5173

## API 接口

### 简历解析
- `POST /api/positions/:positionId/resumes` - 上传并解析简历
- `POST /api/resumes/:id/parse` - 重新解析简历

### AI配置
- `GET /api/ai-configs` - 获取所有AI配置
- `POST /api/ai-configs` - 创建AI配置
- `PUT /api/ai-configs/:id` - 更新AI配置
- `DELETE /api/ai-configs/:id` - 删除AI配置
- `POST /api/ai-configs/:id/set-active` - 设置活跃配置
- `POST /api/ai-configs/:id/test` - 测试配置连接

### 提供商列表
- `GET /api/ai-providers` - 获取支持的AI提供商
- `GET /api/ai-models?provider=xxx` - 获取指定提供商的模型列表

## 支持的AI提供商

| 提供商 | 默认模型 | 特点 | 价格参考 |
|--------|----------|------|----------|
| 智谱GLM | glm-4 | 国产，推理能力强 | ¥0.01/1k tokens |
| MiniMax | abab6.5s-chat | 快速，便宜 | ¥0.002/1k tokens |
| DeepSeek | deepseek-chat | 性价比高 | ¥0.001/1k tokens |
| OpenAI | gpt-3.5-turbo | 稳定可靠 | $0.0005/1k tokens |

## 配置说明

### 1. 访问配置页面

打开 http://localhost:5173/config

### 2. 添加AI配置

选择提供商，填写API Key，选择模型，设置优先级。

### 3. 测试连接

保存配置后可以测试连接是否正常。

## 目录结构

```
resume1/
├── src/
│   ├── components/         # Vue 组件
│   │   ├── interviewFlow/  # 面试流程相关组件
│   │   ├── AIConfig.vue     # AI配置组件
│   │   ├── CandidateList.vue # 候选人列表组件
│   │   ├── FilePreviewDialog.vue # 文件预览组件
│   │   └── ...
│   ├── views/              # 页面视图
│   │   ├── HomeView.vue     # 首页 - 简历管理
│   │   ├── DashboardView.vue # 数据看板
│   │   ├── FlowDashboardView.vue # 流程看板
│   │   ├── InterviewsView.vue # 面试事件管理
│   │   ├── InterviewFlowView.vue # 面试流程管理
│   │   └── AIConfigView.vue  # AI配置页面
│   ├── stores/              # Pinia 状态管理
│   │   ├── position.js      # 职位、简历、流程状态
│   │   └── interviews.js    # 面试事件状态
│   ├── composables/        # Vue 组合式函数
│   │   └── useDashboardData.js # 数据看板数据获取
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAsync.js      # 异步操作
│   │   ├── useForm.js       # 表单操作
│   │   ├── useList.js       # 列表操作
│   │   ├── useMessage.js    # 消息提示
│   │   ├── useUpload.js     # 文件上传
│   │   └── useInterviewFlow.js # 面试流程
│   ├── router/              # Vue Router 路由配置
│   ├── utils/              # 工具函数
│   │   ├── api.js           # API 调用封装
│   │   └── interviewFlowApi.js # 面试流程 API
│   └── constants/           # 常量定义
│       └── interviewStatus.js # 面试状态定义
├── server/
│   ├── index.js            # Express 服务入口
│   ├── database.js          # SQLite 数据库层 (DAO模式)
│   ├── aiService.js         # AI 服务集成
│   ├── pdfService.js        # PDF/DOCX 解析服务
│   ├── controller/          # 控制器 (业务逻辑)
│   │   ├── positionController.js      # 职位管理
│   │   ├── positionResumeController.js # 简历匹配
│   │   ├── resumeController.js        # 简历管理
│   │   ├── dashboardController.js      # 数据看板
│   │   ├── interviewsController.js     # 面试事件
│   │   ├── interviewFlowController.js   # 面试流程
│   │   ├── flowLogController.js       # 流程日志
│   │   ├── aiConfigController.js      # AI配置
│   │   └── ...
│   ├── router/              # Express 路由模块
│   ├── parser/              # 简历解析器
│   │   ├── UnifiedParser.js  # 统一解析器
│   │   ├── RuleBasedParser.js # 规则解析器
│   │   └── factory.js       # 解析器工厂
│   ├── services/             # 业务服务层
│   ├── constants/           # 常量定义
│   ├── migrations/          # 数据库迁移脚本
│   ├── uploads/files/      # 上传文件存储
│   └── utils/              # 工具函数
│       └── response.js       # 响应封装
├── dist/                    # 构建输出
├── package.json
└── README.md
```

## 技术栈

- **前端**: Vue 3, Vite, Element Plus, Pinia, Vue Router
- **后端**: Node.js, Express, SQLite (sql.js), Busboy
- **PDF处理**: pdf-parse, mammoth
- **AI服务**: 智谱GLM, MiniMax, DeepSeek, OpenAI

---

## 代码理解

### 前端架构 (Vue 3)

#### 1. 组件层次结构

```
App.vue (根组件)
│
├── Sidebar (侧边栏导航)
│
├── Main Content Area (主内容区)
│
└── Router View (路由视图)
    │
    ├── HomeView (首页 - 简历管理)
    │   ├── PositionNav (左侧职位导航)
    │   ├── CandidateList (中间候选人列表)
    │   └── CandidateDetail (右侧候选人详情)
    │
    ├── DashboardView (数据看板)
    │   ├── ActivityFeed (操作动态)
    │   ├── FunnelChart (漏斗图表)
    │   ├── HeatChart (热度图表)
    │   └── SourceChart (来源图表)
    │
    ├── InterviewsView (面试事件)
    ├── InterviewFlowView (面试流程)
    └── AIConfigView (AI配置)
```

#### 2. 状态管理 (Pinia)

**position.js 核心职责**：
```javascript
// 状态
positions: []           // 所有职位列表
currentPositionId: null // 当前选中职位
resumes: []            // 当前职位候选人
flowLogs: {}           // 流程日志

// 操作
fetchPositions()       // 获取职位列表
fetchResumes(id)      // 获取职位下的简历
addResume(id, data)   // 上传并解析简历
updateMatchStatus(id, status) // 更新候选人状态
parseJD(id)           // 解析职位JD
generateRecommendations(id) // AI推荐匹配
```

**数据流向**：
```
用户操作 → Store Action → API 调用 → 状态更新 → 组件响应式更新
```

#### 3. API 调用模式

**统一 API 封装** (src/utils/api.js)：
```javascript
// GET 请求
const data = await api.get('/positions')

// POST 请求
const result = await api.post('/positions', { name: '新职位' })

// 文件上传
const result = await api.upload(`/positions/${id}/resumes`, formData)

// 响应格式
{
  success: true,
  data: {...},
  message: '操作成功'
}
```

#### 4. 路由配置

```javascript
// src/router/index.js
routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView },
  { path: '/flow-dashboard', component: FlowDashboardView },
  { path: '/interviews', component: InterviewsView },
  { path: '/interview-flow', component: InterviewFlowView },
  { path: '/config', component: AIConfigView }
]
```

---

### 后端架构 (Node.js)

#### 1. Express 应用结构

```
server/index.js
│
├── Middleware (中间件)
│   ├── cors()              # 跨域支持
│   ├── express.json()       # JSON 解析
│   └── express.static()    # 静态文件服务
│
├── Static Files (静态资源)
│   ├── /uploads           # 上传文件
│   └── /dist              # 前端构建文件
│
└── API Routes (API 路由)
    └── /api
        ├── /positions          # 职位管理
        ├── /resumes           # 简历管理
        ├── /position-resumes  # 职位-简历匹配
        ├── /interviews        # 面试事件
        ├── /interview-flow    # 面试流程
        ├── /dashboard         # 数据看板
        ├── /ai-configs        # AI配置
        └── ...
```

#### 2. 控制器模式

**标准控制器结构**：
```javascript
// controller/xxxController.js
const xxxController = {
  getAll: (req, res) => {
    try {
      // 获取数据
      const data = xxxStmt.all(...)
      // 返回响应
      success(res, data)
    } catch (err) {
      error(res, err.message)
    }
  },
  
  getById: (req, res) => { ... },
  
  create: (req, res) => { ... },
  
  update: (req, res) => { ... },
  
  delete: (req, res) => { ... }
}
```

#### 3. 数据库层 (DAO模式)

**database.js 结构**：
```javascript
// 表定义 + DAO 方法
const positionStmt = {
  insert: (name, company, ...) => { ... },
  getAll: () => { ... },
  getById: (id) => { ... },
  update: (id, ...) => { ... },
  delete: (id) => { ... }
}

const resumeStmt = {
  insert: (name, size, type, ...) => { ... },
  getById: (id) => { ... },
  updateParsedData: (id, ...) => { ... }
}

const positionResumeStmt = {
  insert: (resumeId, positionId) => { ... },
  getByPosition: (positionId) => { ... },
  updateStatusNew: (id, mainStatus, subStatus, ...) => { ... }
}
```

#### 4. 请求处理流程

```
HTTP Request
    │
    ▼
Express Router (路由匹配)
    │
    ▼
Controller (业务逻辑处理)
    │
    ▼
Database Layer (数据操作)
    │
    ▼
Response (JSON响应)
```

#### 5. 文件上传处理

```javascript
// POST /api/positions/:positionId/resumes
│
├── busboy 解析 multipart/form-data
│
├── 文件保存到 uploads/files/
│
├── AI 解析简历内容
│
├── 插入 resumes 表
│
├── 插入 position_resumes 表
│
└── 返回解析结果
```

---

### 面试状态流转系统

#### 主状态 + 子状态设计

```javascript
// src/constants/interviewStatus.js

// 主状态
MAIN_STATUS = {
  RESUME_SCREENING: { code: 'resume_screening', label: '简历筛选' },
  INTERVIEWING: { code: 'interviewing', label: '面试中' },
  SALARY_NEGOTIATION: { code: 'salary_negotiation', label: '谈薪中' },
  CLOSED: { code: 'closed', label: '已成单' },
  REJECTED: { code: 'rejected', label: '不合适' }
}

// 子状态 (按主状态分组)
SUB_STATUS = {
  resume_screening: {
    pending_review: { label: '待筛选', action: '进入筛选' },
    screening_passed: { label: '筛选通过', action: '筛选通过' },
    screening_rejected: { label: '不合适', action: '不合适' }
  },
  interviewing: {
    round_pending: { label: '待安排', action: '安排面试' },
    round_scheduled: { label: '已安排', action: '面试已安排' },
    round_passed: { label: '面试通过', action: '面试通过' },
    interview_rejected: { label: '不合适', action: '不合适' }
  },
  salary_negotiation: {
    approval_pending: { label: '待审批', action: '进入谈薪' },
    offer_sent: { label: 'Offer已发', action: '发送Offer' },
    offer_accepted: { label: '接受Offer', action: '接受Offer' },
    offer_rejected: { label: '拒绝Offer', action: '拒绝Offer' }
  },
  closed: {
    pending_onboard: { label: '待入职', action: '待入职' },
    onboarded: { label: '已入职', action: '已入职' }
  },
  rejected: {
    screening_rejected: { label: '简历不合适', action: '不合适' },
    interview_rejected: { label: '面试不合适', action: '不合适' },
    offer_rejected: { label: '拒绝Offer', action: '不合适' },
    onboard_abandoned: { label: '放弃入职', action: '放弃' }
  }
}
```

#### 状态流转规则

```
简历筛选阶段 (resume_screening)
  ├─ pending_review → screening_passed → interviewing
  └─ pending_review → screening_rejected (终态)

面试阶段 (interviewing)
  ├─ round_pending → round_scheduled → round_passed → salary_negotiation
  ├─ round_pending → round_scheduled → interview_rejected (终态)
  └─ round_passed → interview_rejected (终态)

谈薪阶段 (salary_negotiation)
  ├─ approval_pending → offer_sent → offer_accepted → closed (终态)
  └─ offer_sent → offer_rejected (终态)

已成单阶段 (closed)
  ├─ pending_onboard → onboarded (终态)
  └─ pending_onboard → onboard_abandoned (终态)
```

---

### 数据流图

#### 简历上传流程

```
用户拖拽简历
    │
    ▼
HomeView.handleFileChange() → 验证文件格式/大小
    │
    ▼
HomeView.confirmUpload() → store.addResume()
    │
    ▼
api.upload('/positions/:id/resumes', formData)
    │
    ▼
positionResumeController.create()
    │
    ├─→ busboy 接收文件 → 保存到 uploads/files/
    │
    ├─→ parserFactory.parse() → AI 解析内容
    │
    ├─→ resumeStmt.insert() → 插入 resumes 表
    │
    ├─→ positionResumeStmt.insert() → 插入 position_resumes 表
    │
    └─→ interviewEventStmt.insert() → 插入面试事件记录

    │
    ▼
store.fetchResumes() → 更新前端列表
```

#### 状态变更流程

```
用户选择新状态 → CandidateActionDialog.handleSubmit()
    │
    ▼
api.put('/position-resumes/:id/status', params)
    │
    ▼
positionResumeController.updateStatus()
    │
    ├─→ positionResumeStmt.updateStatusNew()
    │       └─→ 更新 position_resumes 表 (main_status, sub_status, update_time)
    │
    ├─→ flowLogStmt.insertWithNewStatus()
    │       └─→ 插入 position_resume_flow_logs 表
    │
    └─→ interviewEventStmt.insert()
            └─→ 插入 interview_events 表

    │
    ▼
store.fetchResumes() → 更新前端数据
```

---

### AI 集成架构

#### AI 服务支持

```javascript
// server/aiService.js

// 支持的提供商
const PROVIDERS = {
  ZHIPU: { name: '智谱GLM', model: 'glm-4' },
  MINIMAX: { name: 'MiniMax', model: 'abab6.5s-chat' },
  DEEPSEEK: { name: 'DeepSeek', model: 'deepseek-chat' },
  OPENAI: { name: 'OpenAI', model: 'gpt-3.5-turbo' }
}

// 统一调用接口
class AIService {
  async parse(content, options) { ... }
  async evaluate(parsedData, jdText) { ... }
  async generateQuestions(parsedData, jdText) { ... }
}
```

#### 简历解析流程

```
上传文件
    │
    ▼
PDFService.extract() → 提取文本
    │
    ▼
AI.parse() → 结构化数据
    │
    ├─→ 候选人姓名
    ├─→ 联系方式
    ├─→ 技能标签
    ├─→ 教育背景
    ├─→ 工作经历
    └─→ 项目经验
```

---

## 常见问题

### Q: 解析速度慢？
A: 云端解析通常需要5-15秒。可尝试MiniMax或DeepSeek，速度更快。

### Q: 解析结果不准确？
A: 1. 检查API Key是否有效；2. 尝试不同模型；3. 使用规则解析作为备选。

### Q: 端口被占用？
A: 修改 `server/index.js` 中的 `PORT` 变量。

## 参考文档

- [智谱AI开放平台](https://open.bigmodel.cn/doc/)
- [MiniMax API文档](https://api.minimax.chat/docs)
- [DeepSeek API文档](https://platform.deepseek.com/api-docs)
- [OpenAI API文档](https://platform.openai.com/docs)

---

## 配色方案

#D0ED35
#70D75C
#46AA8F
#0A594E
#FFB003
