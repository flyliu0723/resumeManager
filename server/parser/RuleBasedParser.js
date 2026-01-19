const fs = require('fs')
const path = require('path')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')

class RuleBasedParser {
  constructor(options = {}) {
    this.options = options || {}
    this.namePatterns = [
      /^姓\s*名[：:\s]*([^\s\u4e00-\u9fa5]{1,10})/i,
      /^Name[：:]\s*([^\s]+)/i,
      /^我叫\s*([^\s]+)/i,
      /^本人\s*[:：]?\s*([^\s]+)/i,
      /^应聘者[：:]\s*([^\s]+)/i,
      /^候选人[：:]\s*([^\s]+)/i
    ]

    this.sectionPatterns = {
      education: [
        /教育(?:背景|经历)?[：:\s]*(.+)/i,
        /(?:毕业|就读)于[：:\s]*([^\n]+)/i,
        /学历[：:\s]*([^\n]+)/i
      ],
      work_experience: [
        /(?:工作|职业)(?:经历|背景)?[：:\s]*(.+)/i,
        /(?:任职|就职)于[：:\s]*([^\n]+)/i,
        /公司[：:\s]*([^\n]+)/i
      ],
      skills: [
        /(?:专业)?技能[：:\s]*(.+)/i,
        /技术[：:\s]*(.+)/i,
        /掌握[：:\s]*(.+)/i
      ],
      contact: [
        /(?:联系|联系方式)[：:\s]*([^\n]+)/i,
        /电[话话][：:\s]*([^\n]+)/i,
        /邮箱[：:\s]*([^\n]+)/i,
        /[Ee]mail[：:\s]*([^\n]+)/i
      ]
    }
  }

  async parse(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase().slice(1)
    let text = ''

    try {
      switch (ext) {
        case 'pdf':
          text = await this.parsePDF(filePath)
          break
        case 'doc':
        case 'docx':
          text = await this.parseWord(filePath)
          break
        case 'txt':
        case 'md':
          text = fs.readFileSync(filePath, 'utf-8')
          break
        default:
          text = ''
      }
    } catch (error) {
      console.error(`文件解析失败 (${originalName}):`, error.message)
      text = ''
    }

    const nameFromFile = this.extractNameFromFileName(originalName)
    const nameFromContent = this.extractName(text)
    const candidateName = nameFromContent !== '未知' ? nameFromContent : nameFromFile

    const structuredData = this.extractStructuredData(text)

    return {
      candidateName,
      content: text,
      rawText: text,
      structuredData,
      parsedAt: new Date().toISOString(),
      parser: 'rule-based'
    }
  }

  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath)
      const data = await pdfParse(dataBuffer)
      return data.text || ''
    } catch (error) {
      console.error('PDF解析失败:', error.message)
      return ''
    }
  }

  async parseWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value || ''
    } catch (error) {
      console.error('Word解析失败:', error.message)
      return ''
    }
  }

  extractNameFromFileName(fileName) {
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    const cleaned = baseName.replace(/[-_\d]+/g, ' ').trim()
    return this.extractName(cleaned)
  }

  extractName(text) {
    if (!text || typeof text !== 'string') return '未知'

    const lines = text.split('\n').filter(line => line.trim())

    for (const line of lines.slice(0, 15)) {
      const cleanLine = line.trim()
      if (cleanLine.length < 1 || cleanLine.length > 50) continue

      for (const pattern of this.namePatterns) {
        const match = cleanLine.match(pattern)
        if (match && match[1]) {
          const name = match[1].trim().split(/\s+|、|/)[0]
          if (name.length >= 1 && name.length <= 10 && !/^\d+$/.test(name)) {
            return name
          }
        }
      }

      const chineseNamePattern = /^[\u4e00-\u9fa5]{2,4}$/
      if (chineseNamePattern.test(cleanLine)) {
        return cleanLine
      }

      const englishNamePattern = /^[A-Za-z]{2,}\s+[A-Za-z]{2,}$/
      if (englishNamePattern.test(cleanLine)) {
        return cleanLine
      }
    }

    return '未知'
  }

  extractStructuredData(text) {
    if (!text) return null

    const sections = {}
    const lines = text.split('\n')

    let currentSection = null
    let currentContent = []

    const sectionKeywords = {
      education: ['教育', '学历', '毕业', '学校', '大学', '学院'],
      work_experience: ['工作', '经历', '公司', '任职', '职业'],
      project_experience: ['项目', '项目经验'],
      skills: ['技能', '技术', '能力'],
      self_evaluation: ['自我', '评价', '简介', '总结'],
      contact: ['联系', '电话', '邮箱', '微信']
    }

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) continue

      let foundSection = null
      for (const [section, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(kw => trimmedLine.includes(kw))) {
          foundSection = section
          break
        }
      }

      if (foundSection && foundSection !== currentSection) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n')
        }
        currentSection = foundSection
        currentContent = [trimmedLine]
      } else if (currentSection) {
        currentContent.push(trimmedLine)
      }
    }

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n')
    }

    return Object.keys(sections).length > 0 ? sections : null
  }
}

module.exports = RuleBasedParser
