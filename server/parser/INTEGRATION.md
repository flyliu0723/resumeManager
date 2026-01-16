# ResumeParser 集成指南

本项目集成了 [OmkarPathak/ResumeParser](https://github.com/OmkarPathak/ResumeParser) 的AI简历解析能力。

## 🚀 快速开始

### 1. 安装Python依赖

```bash
cd server/parser
pip install -r requirements.txt
```

### 2. 启动ResumeParser服务

```bash
python ResumeParserAPI.py
```

服务将在 `http://localhost:5001` 启动

### 3. 在Node.js中使用

```javascript
const { ParserFactory } = require('./parser/factory')

// 初始化工厂，添加ResumeParser配置
const factory = new ParserFactory.ParserFactory()
factory.init({
  resumeParserAI: {
    apiUrl: 'http://localhost:5001'
  }
})

// 检查可用的解析器
console.log('Available parsers:', factory.getAvailableParsers())

// 使用ResumeParser解析简历
const result = await factory.parseWith('./resume.pdf', 'resume.pdf', 'resume-parser-ai')
console.log(result)
```

## 📋 功能特性

- **AI驱动**: 使用本地LLM（Qwen2.5-1.5B）进行智能解析
- **结构化输出**: 返回标准化的JSON格式
- **零API成本**: 完全本地运行，无需OpenAI等外部API
- **隐私保护**: 简历数据不离开本地环境

## 📊 支持的解析字段

```json
{
  "candidateName": "候选人姓名",
  "email": "邮箱地址",
  "mobile": "电话号码",
  "skills": ["技能列表"],
  "education": "教育背景",
  "experience": "工作经历",
  "companies": ["公司列表"]
}
```

## 🔧 配置选项

```javascript
const options = {
  resumeParserAI: {
    apiUrl: 'http://localhost:5001',  // Python服务地址
    timeout: 30000                    // 超时时间（毫秒）
  }
}
```

## 🐳 Docker 部署

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5001

CMD ["python", "ResumeParserAPI.py"]
```

## ⚠️ 注意事项

1. **资源需求**: 本地LLM需要至少4GB RAM（推荐8GB）
2. **首次启动**: 模型下载可能需要几分钟时间
3. **备用方案**: 如果Python服务不可用，会自动降级到基于规则的解析

## 🔗 相关链接

- [ResumeParser项目](https://github.com/OmkarPathak/ResumeParser)
- [Qwen2.5模型](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- [llama-cpp-python](https://github.com/abetlen/llama-cpp-python)

## 📝 更新日志

- **v1.0.0**: 初始集成，支持基本的简历解析功能
- 支持PDF、Word、TXT格式
- 返回标准化的JSON输出
