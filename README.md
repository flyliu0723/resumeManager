# Resume Parser System

简历解析系统 - 集成 OmkarPathak/ResumeParser 本地AI解析

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
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│  简历解析服务 (Python)    http://localhost:5001      │
│  - ResumeParser AI (Qwen2.5-1.5B 本地模型)          │
│  - Fallback 规则解析器                               │
└─────────────────────────────────────────────────────┘
```

## 快速启动

### 方式一：手动启动（推荐）

**1. 启动简历解析服务（必需）**
```bash
cd server/parser
python ResumeParserAPI.py
```
服务运行在 http://localhost:5001

**2. 启动后端 API**
```bash
cd server
node index.js
```
服务运行在 http://localhost:3000

**3. 启动前端**
```bash
npm run dev
```
服务运行在 http://localhost:5173

---

### 方式二：一键启动（Windows）

```bash
start.bat
```

---

### 方式三：使用 npm scripts

```bash
# 启动所有服务
npm start

# 仅启动后端
npm run start:server

# 启动前端开发服务器
npm run dev
```

## API 接口

### 简历解析
- `POST /api/positions/:positionId/resumes` - 上传并解析简历
- `POST /api/resumes/:id/parse` - 重新解析简历

### 健康检查
- `GET /api/health` - 后端健康检查
- `GET http://localhost:5001/api/health` - 简历解析服务健康检查

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RESUME_PARSER_URL` | 简历解析服务地址 | `http://localhost:5001` |

### 解析器选择

系统支持三种解析器，按准确性排序：
1. **resume-parser-ai** - 本地AI解析（需下载模型，约2GB）
2. **ai** - OpenAI API 解析（需配置API Key）
3. **rule-based** - 规则解析（内置，无需配置）

修改 `server/parser/factory.js` 中的 `currentParser` 来切换解析器。

## 安装依赖

### Python 依赖
```bash
cd server/parser
pip install -r requirements.txt
```

### 下载AI模型（可选，约2GB）
```bash
cd server/parser
python download_models.py
```
下载后解析准确性会显著提升。

### Node.js 依赖
```bash
npm install
```

## 目录结构

```
resume1/
├── src/                    # Vue 前端源码
├── server/
│   ├── index.js           # 后端入口
│   ├── database.js        # SQLite 数据库
│   ├── parser/            # 简历解析模块
│   │   ├── factory.js     # 解析器工厂
│   │   ├── ResumeParserAPI.py  # Python API 服务
│   │   └── resume_parser/ # ResumeParser 项目
│   │       └── models/    # AI 模型文件
│   └── uploads/           # 上传文件存储
├── package.json           # 前端配置
└── README.md
```

## 常见问题

### Q: 解析准确性低？
A: 运行 `python download_models.py` 下载AI模型，然后重启解析服务。

### Q: Python 服务启动失败？
A: 检查是否安装了所有Python依赖：
```bash
pip install flask flask-cors PyPDF2 python-docx
```

### Q: 端口被占用？
A: 修改对应服务的端口：
- Python: 修改 `ResumeParserAPI.py` 中的 `port=5001`
- Node.js: 修改 `server/index.js` 中的 `PORT=3000`

## 技术栈

- **前端**: Vue 3, Vite, Element Plus, Pinia, Vue Router
- **后端**: Node.js, Express, SQLite, Busboy
- **简历解析**: Python, Flask, ResumeParser (Qwen2.5-1.5B)
- **PDF处理**: PyPDF2, pdf.js

## 参考项目

- [OmkarPathak/ResumeParser](https://github.com/OmkarPathak/ResumeParser)
