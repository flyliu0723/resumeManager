const { extractTextFromFile } = require('../pdfService')
const AIService = require('../aiService')

class UnifiedParser {
  constructor(options = {}) {
    this.aiService = new AIService(options)
    this.useFallback = options.useFallback !== false
    this.activeConfig = null
  }

  async parse(filePath, originalName) {
    const startTime = Date.now()

    console.log(`\n========== 开始解析简历 ==========`)
    console.log(`文件名: ${originalName}`)
    console.log(`文件路径: ${filePath}`)

    try {
      const text = await extractTextFromFile(filePath)
      console.log(`提取文本长度: ${text?.length || 0} 字符`)

      if (!text || (text.trim && text.trim().length < 10)) {
        throw new Error('无法提取足够的文本内容')
      }

      const result = await this.parseWithAI(text)

      const duration = (Date.now() - startTime) / 1000

      const finalResult = {
        candidateName: result.name || '未知',
        content: text.slice(0, 5000),
        structuredData: {
          email: result.email,
          mobile: result.mobile,
          skills: result.skills || [],
          education: result.education,
          experience: result.experience,
          companies: result.companies || [],
          ai_summary: result.experience
        },
        parser: 'unified-nodejs',
        model: result._model || 'unknown',
        parsingTime: `${duration.toFixed(2)}s`
      }

      console.log(`\n========== 解析结果 ==========`)
      console.log(`候选人姓名: ${finalResult.candidateName}`)
      console.log(`邮箱: ${finalResult.structuredData.email}`)
      console.log(`手机: ${finalResult.structuredData.mobile}`)
      console.log(`技能: ${finalResult.structuredData.skills}`)
      console.log(`解析器: unified-nodejs, 模型: ${finalResult.model}`)
      console.log(`耗时: ${finalResult.parsingTime}`)
      console.log('='.repeat(50))

      return finalResult

    } catch (error) {
      console.error('解析失败:', error.message)

      if (this.useFallback) {
        console.log('使用 Fallback 规则解析...')
        return this.parseWithFallback(filePath, startTime)
      }

      throw error
    }
  }

  async parseWithAI(text) {
    const activeConfig = this.getActiveConfig()

    if (!activeConfig || !activeConfig.api_key) {
      console.log('未找到有效的AI配置，使用 Fallback')
      return this.fallbackParse(text)
    }

    const { provider, api_key, api_url, model } = activeConfig

    console.log(`使用AI解析: ${provider} - ${model}`)

    try {
      const result = await this.aiService.parseWithProvider(
        provider,
        api_key,
        api_url || this.getDefaultApiUrl(provider),
        model,
        text
      )

      result._model = model
      return result

    } catch (error) {
      console.error(`AI解析失败: ${error.message}`)
      throw error
    }
  }

  getActiveConfig() {
    if (this.activeConfig) {
      return this.activeConfig
    }

    try {
      const db = require('../database')
      const config = db.aiConfigStmt.getActive()
      return config
    } catch (e) {
      console.error('获取活跃配置失败:', e.message)
      return null
    }
  }

  setActiveConfig(config) {
    this.activeConfig = config
  }

  getDefaultApiUrl(provider) {
    const urls = {
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      minimax: 'https://api.minimax.chat/v1',
      deepseek: 'https://api.deepseek.com',
      openai: 'https://api.openai.com/v1'
    }
    return urls[provider] || ''
  }

  async parseWithFallback(filePath, startTime) {
    const text = await extractTextFromFile(filePath)
    const result = this.fallbackParse(text)

    const duration = (Date.now() - startTime) / 1000

    return {
      candidateName: result.name || '未知',
      content: text?.slice(0, 5000) || '',
      structuredData: {
        email: result.email,
        mobile: result.mobile_number,
        skills: result.skills,
        education: result.education,
        experience: result.experience,
        companies: result.company_names,
        ai_summary: result.experience
      },
      parser: 'fallback',
      model: 'rule-based',
      parsingTime: `${duration.toFixed(2)}s`
    }
  }

  fallbackParse(text) {
    if (!text) {
      return {
        name: '未知',
        email: null,
        mobile_number: null,
        skills: [],
        education: null,
        experience: null,
        company_names: []
      }
    }

    const info = {
      name: this.extractName(text),
      email: null,
      mobile_number: null,
      skills: [],
      education: null,
      experience: null,
      company_names: []
    }

    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const emails = text.match(emailPattern)
    if (emails) {
      info.email = emails[0]
    }

    const phonePattern = /(?:\+?86)?1[3-9]\d{9}/
    const phones = text.match(phonePattern)
    if (phones) {
      info.mobile_number = phones[0]
    }

    info.skills = this.extractSkills(text)
    info.education = this.extractEducation(text)
    info.experience = this.extractExperience(text)
    info.company_names = this.extractCompanies(text)

    return info
  }

  extractName(text) {
    const patterns = [
      /姓\s*名[：:\s]*([^\s\u4e00-\u9fa5]{1,10})/,
      /Name[：:]\s*([^\s]+)/,
      /^([\u4e00-\u9fa5]{2,4})$/
    ]

    const lines = text.split('\n').slice(0, 15)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.length > 50) continue

      for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match) {
          const name = match[1].trim()
          if (name.length >= 1 && name.length <= 10 && !/^\d+$/.test(name)) {
            return name
          }
        }
      }
    }

    return '未知'
  }

  extractSkills(text) {
    const skills = []
    const skillPatterns = [
      { name: 'Python', pattern: /Python/i },
      { name: 'Java', pattern: /Java(?!Script)/i },
      { name: 'JavaScript', pattern: /JavaScript/i },
      { name: 'TypeScript', pattern: /TypeScript/i },
      { name: 'C++', pattern: /C\+\+/i },
      { name: 'C#', pattern: /C#/i },
      { name: 'Go', pattern: /\bGo\b/i },
      { name: 'Rust', pattern: /Rust/i },
      { name: 'React', pattern: /React/i },
      { name: 'Vue', pattern: /Vue(?!e)/i },
      { name: 'Angular', pattern: /Angular/i },
      { name: 'Node.js', pattern: /Node\.js/i },
      { name: 'Django', pattern: /Django/i },
      { name: 'Flask', pattern: /Flask/i },
      { name: 'Spring Boot', pattern: /Spring Boot/i },
      { name: 'MySQL', pattern: /MySQL/i },
      { name: 'PostgreSQL', pattern: /PostgreSQL/i },
      { name: 'MongoDB', pattern: /MongoDB/i },
      { name: 'Redis', pattern: /Redis/i },
      { name: 'Docker', pattern: /Docker/i },
      { name: 'Kubernetes', pattern: /Kubernetes/i },
      { name: 'AWS', pattern: /AWS/i },
      { name: 'Machine Learning', pattern: /Machine Learning/i },
      { name: 'Deep Learning', pattern: /Deep Learning/i },
      { name: 'Git', pattern: /Git/i },
      { name: 'Linux', pattern: /Linux/i }
    ]

    for (const { name, pattern } of skillPatterns) {
      if (pattern.test(text) && !skills.includes(name)) {
        skills.push(name)
      }
    }

    return skills
  }

  extractEducation(text) {
    const patterns = [
      /(?:教育|学历)[：:\s]*([^\n]{10,200})/i,
      /(?:毕业|就读)于[：:\s]*([^\n]{10,200})/i
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return null
  }

  extractExperience(text) {
    const keywords = ['工作经历', '职业经历', '任职', '工作经验']
    const lines = text.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (keywords.some(kw => line.includes(kw))) {
        const exp = []
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].trim()) {
            exp.push(lines[j].trim())
          }
        }
        return exp.slice(0, 8).join('\n') || null
      }
    }

    return null
  }

  extractCompanies(text) {
    const companies = []
    const pattern = /(?:公司|企业|集团)[^\n]{0,30}/g

    let match
    while ((match = pattern.exec(text)) !== null) {
      const company = match[0].trim()
      if (company.length > 2 && company.length < 50 && !companies.includes(company)) {
        companies.push(company)
      }
    }

    return companies.slice(0, 5)
  }
}

module.exports = UnifiedParser
