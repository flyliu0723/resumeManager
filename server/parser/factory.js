const RuleBasedParser = require('./RuleBasedParser')
const AIParser = require('./AIParser')
const ResumeParserAI = require('./ResumeParserAI')

class ParserFactory {
  constructor() {
    this.parsers = {
      'rule-based': null,
      'ai': null,
      'resume-parser-ai': null
    }
    this.currentParser = 'resume-parser-ai'
  }

  init(options = {}) {
    this.parsers['rule-based'] = new RuleBasedParser(options.ruleBased)
    
    if (options.ai?.apiKey) {
      this.parsers['ai'] = new AIParser(options.ai)
    }

    // 配置 ResumeParserAI（统一解析接口）
    if (options.resumeParserAI?.apiUrl) {
      this.parsers['resume-parser-ai'] = new ResumeParserAI(options.resumeParserAI)
    } else {
      // 默认使用 localhost:5001
      this.parsers['resume-parser-ai'] = new ResumeParserAI({
        apiUrl: 'http://localhost:5001',
        timeout: 180000  // 3分钟
      })
    }
  }

  setParser(name) {
    if (this.parsers[name]) {
      this.currentParser = name
      return true
    }
    return false
  }

  getParser() {
    const parser = this.parsers[this.currentParser]
    if (parser) {
      return parser
    }

    if (this.parsers['rule-based']) {
      console.warn(`解析器 '${this.currentParser}' 未初始化，回退到 rule-based`)
      this.currentParser = 'rule-based'
      return this.parsers['rule-based']
    }

    console.warn(`所有解析器未初始化，使用默认 rule-based`)
    this.parsers['rule-based'] = new RuleBasedParser()
    this.currentParser = 'rule-based'
    return this.parsers['rule-based']
  }

  async parse(filePath, originalName) {
    const parser = this.getParser()
    return await parser.parse(filePath, originalName)
  }

  async parseWith(filePath, originalName, parserName) {
    const parser = this.parsers[parserName]
    if (!parser) {
      throw new Error(`Parser not found: ${parserName}`)
    }
    return await parser.parse(filePath, originalName)
  }

  getAvailableParsers() {
    const available = ['rule-based', 'resume-parser-ai']
    if (this.parsers['ai']) {
      available.push('ai')
    }
    return available
  }

  getCurrentParser() {
    return this.currentParser
  }
}

const factory = new ParserFactory()
factory.init()

module.exports = factory
module.exports.ParserFactory = ParserFactory
module.exports.RuleBasedParser = RuleBasedParser
module.exports.AIParser = AIParser
module.exports.ResumeParserAI = ResumeParserAI
