# 优化计划

本文档记录招聘管理系统的优化计划和实施进度。

---

## 目录

- [优化优先级](#优化优先级)
- [高优先级 - 立即实施](#高优先级---立即实施)
- [中优先级 - 近期实施](#中优先级---近期实施)
- [低优先级 - 长期规划](#低优先级---长期规划)
- [性能优化](#性能优化)
- [安全加固](#安全加固)
- [实施进度](#实施进度)

---

## 优化优先级

| 优先级 | 类别 | 预计工时 | 影响力 |
|--------|------|----------|--------|
| 🔴 高 | 配置管理、输入验证、错误处理 | 2-3天 | 高 |
| 🟡 中 | TypeScript、代码分割、测试 | 1-2周 | 中 |
| 🟢 低 | Docker、国际化、监控 | 持续 | 低 |

---

## 高优先级 - 立即实施

### 1. 配置管理 ✅ DONE

**问题**：API URL、密钥等硬编码在代码中

**当前代码**：
```javascript
// src/utils/api.js
const API_BASE = 'http://localhost:3000/api'
```

**优化方案**：
```bash
# .env 文件
VITE_API_BASE=http://localhost:3000/api
VITE_API_TIMEOUT=300000
```

```javascript
// src/utils/api.js
const API_BASE = import.meta.env.VITE_API_BASE
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 300000
```

**涉及文件**：
- `src/utils/api.js`
- `server/index.js` (可选 PORT 配置)

**验收标准**：
- [ ] API 地址可通过环境变量配置
- [ ] 开发环境使用默认配置
- [ ] 生产环境可自定义配置

---

### 2. 输入验证 ✅ DONE

**问题**：没有请求体验证，可能导致非法数据入库

**优化方案**：使用 Zod 或 Joi 进行 Schema 验证

```javascript
// server/middleware/validator.js
const Joi = require('joi')

const schemas = {
  updateStatus: Joi.object({
    mainStatus: Joi.string().valid(
      'resume_screening', 'interviewing', 
      'salary_negotiation', 'closed', 'rejected'
    ).required(),
    subStatus: Joi.string().required(),
    actionType: Joi.string().valid('status_change', 'reject', 'reopen'),
    note: Joi.string().max(500).optional()
  }),

  createPosition: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    company: Joi.string().max(100).optional(),
    description: Joi.string().max(5000).optional()
  })
}

const validate = (schemaName) => (req, res, next) => {
  const { error } = schemas[schemaName].validate(req.body)
  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    })
  }
  next()
}

module.exports = { validate, schemas }
```

**涉及文件**：
- `server/middleware/validator.js` (新建)
- `server/router/positionResumes.js`
- `server/router/positions.js`

**验收标准**：
- [ ] 状态变更接口有完整的 Schema 验证
- [ ] 非法请求返回 400 错误
- [ ] 验证错误消息清晰

---

### 3. 统一错误处理 DONE

**问题**：错误处理分散，且可能泄露敏感信息

**已创建文件**：
- `server/middleware/errorHandler.js` - 全局错误处理中间件
- `server/middleware/asyncHandler.js` - 异步错误捕获包装器

**功能特性**：
- 根据错误类型自动设置 HTTP 状态码
- 生产环境隐藏敏感堆栈信息
- 按状态码分级记录日志（error/warn/info）
- 404 统一处理
- Joi 验证错误自动识别

**已应用**：
- `server/index.js` - 错误处理中间件已挂载

**测试结果**：
```
// 404 错误
{"success":false,"code":"NOT_FOUND","message":"请求的资源不存在: GET /api/nonexistent"}

// 验证错误
{"success":false,"code":"VALIDATION_ERROR","message":"请求参数验证失败","errors":[...]}

// 生产环境不返回 stack
```

**验收标准**：
- [x] 全局错误处理中间件已创建
- [x] 生产环境不返回堆栈信息
- [x] 错误日志记录完整
- [ ] 所有控制器使用 asyncHandler 包装（可选优化）

---

### 4. API 响应标准化 ✅ DONE

**问题**：API 响应格式不统一

**已更新**：`server/utils/response.js`

**新增功能**：
- `success()` - 基础成功响应，支持 data、message、meta
- `error()` - 错误响应，支持自定义状态码
- `created()` - 201 状态码，用于创建操作
- `noContent()` - 204 状态码，用于删除操作
- `paginated()` - 分页响应，自动计算 totalPages
- `withMeta()` - 自定义元数据响应

**响应格式**：
```json
// 成功
{"success":true,"code":200,"data":{},"message":"操作成功"}

// 分页
{"success":true,"code":200,"data":[],"meta":{"page":1,"limit":20,"total":100,"totalPages":5}}

// 错误
{"success":false,"code":400,"message":"错误信息"}
```

**验收标准**：
- [x] 所有 API 使用统一响应格式
- [x] 列表接口支持分页信息
- [x] 错误响应包含清晰的消息

---

## 中优先级 - 近期实施

### 5. TypeScript 迁移

**问题**：纯 JavaScript 缺乏类型安全

**优化方案**：渐进式迁移

```typescript
// types/interview.ts
export type MainStatus = 
  | 'resume_screening' 
  | 'interviewing' 
  | 'salary_negotiation' 
  | 'closed' 
  | 'rejected'

export interface Candidate {
  id: number
  name: string
  mainStatus: MainStatus
  subStatus: string
  matchScore?: number
}

// src/composables/useDashboardData.ts
export interface DashboardActivity {
  id: number
  created_at: string
  candidate_name: string
  action_type: string
  main_status_from?: string
  main_status_to?: string
}

export function useDashboardData() {
  const activityItems = ref<DashboardActivity[]>([])
  // ...
}
```

**迁移顺序**：
1. 新增文件使用 TypeScript
2. 核心类型定义文件
3. 逐步迁移 utils 和 composables
4. 最后迁移 components 和 views

**涉及文件**：
- `src/types/` (新建)
- `src/composables/useDashboardData.ts`
- `src/utils/api.ts`

---

### 6. 代码分割与懒加载

**问题**：所有路由一次性加载

**当前代码**：
```javascript
import HomeView from '../views/HomeView.vue'
import DashboardView from '../views/DashboardView.vue'
// 全部立即加载
```

**优化方案**：
```javascript
// src/router/index.js
const routes = [
  {
    path: '/',
    component: () => import('../views/HomeView.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/HomeView.vue')
      }
    ]
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue')
  }
]
```

**验收标准**：
- [ ] 初始加载 JS 文件大小减少 30%
- [ ] 首屏渲染时间降低

---

### 7. 添加测试覆盖

**问题**：没有任何测试

**优化方案**：使用 Vitest + Vue Test Utils

```javascript
// tests/stores/position.spec.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePositionStore } from '@/stores/position'

describe('Position Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] })
    })
  })

  it('should fetch positions', async () => {
    const store = usePositionStore()
    await store.fetchPositions()
    expect(store.positions).toHaveLength(0)
  })

  it('should add resume', async () => {
    const store = usePositionStore()
    await store.addResume(1, { name: 'test.pdf' })
    expect(store.resumes).toHaveLength(1)
  })
})
```

**验收标准**：
- [ ] Store 测试覆盖率达到 80%
- [ ] 关键 API 控制器有集成测试
- [ ] GitHub Actions 自动运行测试

---

## 低优先级 - 长期规划

### 8. Docker 部署

**Dockerfile**：
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
RUN npm ci --production

EXPOSE 3000
CMD ["npm", "start"]
```

**docker-compose.yml**：
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - uploads:/app/server/uploads

volumes:
  uploads:
```

---

### 9. API 文档 (Swagger)

```javascript
// server/routes/positions.js
/**
 * @swagger
 * /api/positions:
 *   get:
 *     summary: 获取所有职位列表
 *     tags: [Positions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 职位状态过滤
 *     responses:
 *       200:
 *         description: 职位列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Position'
 */

router.get('/', positionController.getAll)
```

---

### 10. 国际化 (i18n)

```javascript
// src/locales/zh-CN.js
export default {
  dashboard: {
    title: '招聘管理中心',
    funnel: '招聘漏斗效率看板',
    conversion: '转化率',
    avgDays: '平均',
    days: '天',
    lost: '流失率'
  },
  status: {
    resume_screening: '简历筛选',
    interviewing: '面试中',
    salary_negotiation: '谈薪中',
    closed: '已成单',
    rejected: '不合适'
  }
}

// src/main.js
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'zh-CN',
  messages: { zhCN, en }
})

app.use(i18n)
```

---

## 性能优化

### 前端优化

| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 路由懒加载 | `import()` | JS 减少 30% |
| API 缓存 | SWR/TanStack Query | 请求减少 50% |
| 虚拟列表 | vue-virtual-scroller | 长列表流畅 |
| 图片优化 | WebP + 懒加载 | 带宽减少 40% |

### 后端优化

| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 数据库索引 | 添加复合索引 | 查询快 10x |
| 响应缓存 | 热点数据缓存 | QPS 提升 5x |
| AI 队列 | 异步处理 | 响应快 2s |

---

## 安全加固

### 1. 文件上传安全

```javascript
// 验证文件类型
const ALLOWED_TYPES = ['application/pdf', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// 限制大小
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// 保存时重命名
const timestamp = Date.now()
const safeName = `${timestamp}-${Buffer.from(originalName)
  .toString('base64')
  .slice(0, 32)}.${ext}`
```

### 2. CORS 配置

```javascript
// 生产环境限制域名
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || []

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
```

### 3. 速率限制

```javascript
const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP 100次请求
  message: { success: false, message: '请求过于频繁' }
})

app.use('/api/', apiLimiter)
```

---

## 实施进度

### 已完成 ✅

| 任务 | 完成日期 | 备注 |
|------|----------|------|
| 文件清理 - 删除无用文件 | 2026-02-05 | 删除 9 个无用文件 |
| 文件重命名 - 移除 New 后缀 | 2026-02-05 | 统一命名规范 |
| 引用更新 | 2026-02-05 | 更新所有 import |
| 时区修复 | 2026-02-05 | SQLite CURRENT_TIMESTAMP 修复 |
| 配置管理 (.env) | 2026-02-06 | 环境变量配置 |
| 输入验证 (Joi) | 2026-02-06 | Schema 验证中间件 |
| 统一错误处理 | 2026-02-06 | errorHandler + asyncHandler |

### 进行中 🔄

| 任务 | 开始日期 | 状态 |
|------|----------|------|
| - | - | 无进行中任务 |

### 待开始 ⏳

| 任务 | 优先级 | 预计工时 |
|------|--------|----------|
| TypeScript 迁移 | 中 | 3天 |
| 路由懒加载 | 中 | 1天 |
| 测试覆盖 | 中 | 2天 |
| Docker 部署 | 低 | 1天 |
| Swagger 文档 | 低 | 2天 |

---

## 贡献指南

1. **遵循代码风格**：使用 ESLint + Prettier
2. **提交前检查**：
   ```bash
   npm run lint    # 检查代码
   npm run type    # 类型检查 (TypeScript)
   npm run test    # 运行测试
   ```
3. **提交信息格式**：
   ```
   type(scope): subject
   
   - feat: 新功能
   - fix: 修复 Bug
   - docs: 文档更新
   - refactor: 重构
   - perf: 性能优化
   ```

---

## 总结

本优化计划按照 **影响度** 和 **实施难度** 进行优先级排序。建议按照以下顺序实施：

1. **第一阶段**（1周）：配置管理 + 输入验证 + 错误处理
2. **第二阶段**（2周）：TypeScript + 懒加载 + 测试
3. **第三阶段**（持续）：安全加固 + Docker + 文档

通过这些优化，系统将具备：
- ✅ 更好的可维护性
- ✅ 更高的安全性
- ✅ 更好的性能
- ✅ 更完善的测试覆盖
