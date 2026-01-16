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
    this.currentParser = 'rule-based'
  }

  init(options = {}) {
    this.parsers['rule-based'] = new RuleBasedParser(options.ruleBased)
    
    if (options.ai?.apiKey) {
      this.parsers['ai'] = new AIParser(options.ai)
    }

    if (options.resumeParserAI?.apiUrl) {
      this.parsers['resume-parser-ai'] = new ResumeParserAI(options.resumeParserAI)
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
    if (!this.parsers[this.currentParser]) {
      this.parsers['rule-based'] = new RuleBasedParser()
    }
    return this.parsers[this.currentParser]
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
    const available = ['rule-based']
    if (this.parsers['ai']) {
      available.push('ai')
    }
    if (this.parsers['resume-parser-ai']) {
      available.push('resume-parser-ai')
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
