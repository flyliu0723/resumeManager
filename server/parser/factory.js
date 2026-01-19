const RuleBasedParser = require('./RuleBasedParser')
const UnifiedParser = require('./UnifiedParser')

class ParserFactory {
  constructor() {
    this.parsers = {
      'rule-based': null,
      'unified': null
    }
    this.currentParser = 'unified'
  }

  init(options = {}) {
    this.parsers['rule-based'] = new RuleBasedParser(options.ruleBased)
    this.parsers['unified'] = new UnifiedParser(options.unified)
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

    console.warn(`所有解析器未初始化，使用默认 unified`)
    this.parsers['unified'] = new UnifiedParser()
    this.currentParser = 'unified'
    return this.parsers['unified']
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
    return ['unified', 'rule-based']
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
module.exports.UnifiedParser = UnifiedParser
