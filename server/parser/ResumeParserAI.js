const BaseParser = require('./index')

class ResumeParserAI extends BaseParser {
  constructor(options = {}) {
    super(options)
    this.apiUrl = options.apiUrl || 'http://localhost:5001'
    this.timeout = options.timeout || 30000
  }

  async parse(filePath, originalName) {
    const formData = new FormData()
    const fileBuffer = require('fs').readFileSync(filePath)
    const blob = new Blob([fileBuffer])
    formData.append('file', blob, originalName)

    try {
      const response = await fetch(`${this.apiUrl}/api/parse`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        return this.transformResult(result, originalName)
      } else {
        throw new Error(result.error || '解析失败')
      }
    } catch (error) {
      console.error('ResumeParser API调用失败:', error.message)
      return {
        candidateName: '解析失败',
        content: '',
        rawText: '',
        structuredData: { error: error.message },
        parsedAt: new Date().toISOString(),
        parser: 'resume-parser-ai',
        error: error.message
      }
    }
  }

  transformResult(apiResult, fileName) {
    const data = apiResult.data
    const metadata = apiResult.metadata

    return {
      candidateName: data.candidateName || '未知',
      content: data.rawText || '',
      rawText: data.rawText || '',
      structuredData: {
        name: data.candidateName,
        email: data.email,
        mobile: data.mobile,
        skills: data.skills,
        education: data.education,
        experience: data.experience,
        companies: data.companies,
        parser: 'resume-parser-ai',
        model: metadata.model
      },
      parsedAt: data.parsedAt || new Date().toISOString(),
      parser: 'resume-parser-ai',
      metadata: {
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        parser: metadata.parser,
        model: metadata.model
      }
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}

module.exports = ResumeParserAI
