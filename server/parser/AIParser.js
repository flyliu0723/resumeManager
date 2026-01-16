const BaseParser = require('./index')

class AIParser extends BaseParser {
  constructor(options = {}) {
    super(options)
    this.apiKey = options.apiKey || process.env.AI_API_KEY
    this.apiUrl = options.apiUrl || process.env.AI_API_URL
    this.model = options.model || 'gpt-3.5-turbo'
  }

  async parse(filePath, originalName) {
    const text = await this.extractText(filePath, originalName)
    
    const prompt = this.buildPrompt(text)
    const structuredData = await this.callAI(prompt)
    
    return {
      candidateName: structuredData.candidate_name || '未知',
      content: text,
      rawText: text,
      structuredData,
      parsedAt: new Date().toISOString(),
      parser: 'ai',
      model: this.model
    }
  }

  async extractText(filePath, originalName) {
    throw new Error('extractText must be implemented by subclass')
  }

  buildPrompt(text) {
    return {
      role: 'system',
      content: `你是一个简历解析专家。请从以下简历文本中提取结构化信息，返回JSON格式：

{
  "candidate_name": "候选人姓名",
  "email": "邮箱地址",
  "phone": "电话号码",
  "education": [{"school": "学校", "degree": "学历", "major": "专业", "time": "时间"}],
  "work_experience": [{"company": "公司", "position": "职位", "time": "时间", "description": "工作描述"}],
  "skills": ["技能列表"],
  "summary": "个人总结"
}

如果某项信息不存在，使用null。`
    }
  }

  async callAI(messages) {
    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3
        })
      })

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || '{}'
      
      return JSON.parse(content)
    } catch (error) {
      console.error('AI API调用失败:', error.message)
      return {}
    }
  }
}

module.exports = AIParser
