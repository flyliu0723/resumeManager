const axios = require('axios')
const promptService = require('./promptService')

class AIService {
  constructor(config) {
    this.config = config
    this.activeConfig = null
  }

  setActiveConfig(config) {
    this.activeConfig = config
  }

  async parseResume(text) {
    const prompt = promptService.getParseResumePrompt(text.slice(0, 3000))

    if (!this.activeConfig || !this.activeConfig.api_key) {
      throw new Error('未配置AI服务')
    }

    const { provider, api_key, api_url, model } = this.activeConfig

    switch (provider) {
      case 'zhipu':
        return this.parseWithZhipu(api_key, api_url, model, prompt)
      case 'minimax':
        return this.parseWithMinimax(api_key, api_url, model, prompt)
      case 'deepseek':
        return this.parseWithDeepseek(api_key, api_url, model, prompt)
      case 'openai':
        return this.parseWithOpenAI(api_key, api_url, model, prompt)
      default:
        throw new Error(`不支持的提供商: ${provider}`)
    }
  }

  async evaluateCandidate(resumeJson, jdText) {
    const prompt = promptService.getEvaluatePrompt(resumeJson, jdText)

    if (!this.activeConfig || !this.activeConfig.api_key) {
      throw new Error('未配置AI服务')
    }

    const { provider, api_key, api_url, model } = this.activeConfig

    switch (provider) {
      case 'zhipu':
        return this.evaluateWithZhipu(api_key, api_url, model, prompt)
      case 'minimax':
        return this.evaluateWithMinimax(api_key, api_url, model, prompt)
      case 'deepseek':
        return this.evaluateWithDeepseek(api_key, api_url, model, prompt)
      case 'openai':
        return this.evaluateWithOpenAI(api_key, api_url, model, prompt)
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
          messages: [{ role: 'user', content: prompt }],
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

  async evaluateWithZhipu(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'glm-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 3000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 90000
        }
      )
      return response.data.choices[0].message.content.trim()
    } catch (error) {
      console.error('智谱GLM评估失败:', error.response?.data || error.message)
      throw error
    }
  }

  async parseWithMinimax(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/text/chatcompletion_v2`,
        {
          model: model || 'abab6.5s-chat',
          messages: [{ role: 'user', content: prompt }],
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

  async evaluateWithMinimax(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/text/chatcompletion_v2`,
        {
          model: model || 'abab6.5s-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 3000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 90000
        }
      )
      return response.data.choices[0].message.content.trim()
    } catch (error) {
      console.error('MiniMax评估失败:', error.response?.data || error.message)
      throw error
    }
  }

  async parseWithDeepseek(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
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

  async evaluateWithDeepseek(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 3000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 90000
        }
      )
      return response.data.choices[0].message.content.trim()
    } catch (error) {
      console.error('DeepSeek评估失败:', error.response?.data || error.message)
      throw error
    }
  }

  async parseWithOpenAI(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
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

  async evaluateWithOpenAI(apiKey, apiUrl, model, prompt) {
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions`,
        {
          model: model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 3000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 90000
        }
      )
      return response.data.choices[0].message.content.trim()
    } catch (error) {
      console.error('OpenAI评估失败:', error.response?.data || error.message)
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
