class BaseParser {
  constructor(options = {}) {
    this.options = options
  }

  async parse(filePath, originalName) {
    throw new Error('parse method must be implemented')
  }

  async extractName(text) {
    throw new Error('extractName method must be implemented')
  }

  async extractStructuredData(text) {
    throw new Error('extractStructuredData method must be implemented')
  }
}

module.exports = BaseParser
