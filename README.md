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
│  - OpenAI (gpt-3.5-turbo)                           │
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
│   ├── components/
│   │   └── AIConfig.vue     # AI配置组件
│   ├── views/
│   │   └── AIConfigView.vue # AI配置页面
│   └── ...
├── server/
│   ├── index.js             # 后端入口
│   ├── database.js          # SQLite 数据库
│   ├── aiService.js         # AI API 调用服务
│   ├── pdfService.js        # PDF/DOCX 解析
│   └── parser/
│       └── UnifiedParser.js # 统一解析器
├── package.json
└── README.md
```

## 技术栈

- **前端**: Vue 3, Vite, Element Plus, Pinia, Vue Router
- **后端**: Node.js, Express, SQLite, Busboy
- **PDF处理**: pdf-parse, mammoth
- **AI服务**: 智谱GLM, MiniMax, DeepSeek, OpenAI

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


#D0ED35
#70D75C
#46AA8F
#0A594E
#FFB003