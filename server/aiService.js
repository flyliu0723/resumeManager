const axios = require('axios')

const PROMPT_TEMPLATE = `你是一个简历解析专家。请从以下简历文本中提取信息，返回JSON格式：

简历文本：
{text}

请提取以下信息（如果找不到某项信息，设置为null）：
{{
  "name": "姓名",
  "email": "邮箱地址",
  "mobile": "电话号码",
  "skills": ["技能列表"],
  "education": "教育背景",
  "experience": "工作经历",
  "companies": ["公司名称列表"]
}}

只返回JSON，不要其他内容。`

class AIService {
  constructor(config) {
    this.config = config
  }

  async parseWithProvider(provider, apiKey, apiUrl, model, text) {
    const prompt = PROMPT_TEMPLATE.replace('{text}', text.slice(0, 3000))

    switch (provider) {
      case 'zhipu':
        return this.parseWithZhipu(apiKey, apiUrl, model, prompt)
      case 'minimax':
        return this.parseWithMinimax(apiKey, apiUrl, model, prompt)
      case 'deepseek':
        return this.parseWithDeepseek(apiKey, apiUrl, model, prompt)
      case 'openai':
        return this.parseWithOpenAI(apiKey, apiUrl, model, prompt)
      default:
        throw new Error(`不支持的提供商: ${provider}`)
    }
  }

  async parseWithZhipu(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'glm-4',
          messages: [
            { role: 'system', content: '你是一个简历解析专家，擅长提取简历中的关键信息。只返回JSON格式。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 60000
        }
      )

      return this.parseResponse(response.data)
    } catch (error) {
      console.error('智谱GLM解析失败:', error.response?.data || error.message)
      throw error
    }
  }

  async parseWithMinimax(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/text/chatcompletion_v2`,
        {
          model: model || 'abab6.5s-chat',
          messages: [
            { role: 'system', content: '你是一个简历解析专家，擅长提取简历中的关键信息。只返回JSON格式。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 60000
        }
      )

      return this.parseMinimaxResponse(response.data)
    } catch (error) {
      console.error('MiniMax解析失败:', error.response?.data || error.message)
      throw error
    }
  }

  async parseWithDeepseek(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个简历解析专家，擅长提取简历中的关键信息。只返回JSON格式。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 60000
        }
      )

      return this.parseResponse(response.data)
    } catch (error) {
      console.error('DeepSeek解析失败:', error.response?.data || error.message)
      throw error
    }
  }

  async parseWithOpenAI(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '你是一个简历解析专家，擅长提取简历中的关键信息。只返回JSON格式。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 60000
        }
      )

      return this.parseResponse(response.data)
    } catch (error) {
      console.error('OpenAI解析失败:', error.response?.data || error.message)
      throw error
    }
  }

  parseResponse(data) {
    const content = data.choices[0].message.content.trim()

    let jsonStr = content
    if (content.startsWith('```json')) {
      jsonStr = content.slice(7)
    } else if (content.startsWith('```')) {
      jsonStr = content.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    try {
      return JSON.parse(jsonStr)
    } catch (e) {
      console.error('JSON解析失败:', jsonStr)
      throw new Error('AI返回内容格式错误')
    }
  }

  parseMinimaxResponse(data) {
    const content = data.choices[0].message.content.trim()

    let jsonStr = content
    if (content.startsWith('```json')) {
      jsonStr = content.slice(7)
    } else if (content.startsWith('```')) {
      jsonStr = content.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    try {
      return JSON.parse(jsonStr)
    } catch (e) {
      console.error('JSON解析失败:', jsonStr)
      throw new Error('AI返回内容格式错误')
    }
  }
}

module.exports = AIService
