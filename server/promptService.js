const fs = require('fs')
const path = require('path')

class PromptService {
  constructor() {
    this.prompts = {}
    this.promptsDir = path.join(__dirname, 'prompts')
  }

  loadPrompt(name) {
    if (this.prompts[name]) {
      return this.prompts[name]
    }

    const filePath = path.join(this.promptsDir, `${name}.md`)

    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompt文件不存在: ${filePath}`)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    this.prompts[name] = content
    return content
  }

  getParseResumePrompt(text) {
    const template = this.loadPrompt('parseResume')
    return template.replace('{text}', text)
  }

  getEvaluatePrompt(resumeJson, jdText) {
    const template = this.loadPrompt('evaluate')
    return template
      .replace('{resume_json}', JSON.stringify(resumeJson, null, 2))
      .replace('{jd_text}', jdText || '暂无职位描述')
  }

  getCombinedEvaluationPrompt(resumeJson, jdText) {
    const template = this.loadPrompt('combined_evaluation')
    return template
      .replace('{resume_json}', JSON.stringify(resumeJson, null, 2))
      .replace('{jd_text}', jdText || '暂无职位描述')
  }

  clearCache() {
    this.prompts = {}
  }

  getQuestionsPrompt(resumeText, jdText) {
    const template = this.loadPrompt('questions')
    return template
      .replace('{resume_text_or_structured_data}', resumeText || '暂无简历内容')
      .replace('{jd_text_or_structured_data}', jdText || '暂无职位描述')
  }

  getParseJDPrompt(text) {
    const template = this.loadPrompt('parseJD')
    return template.replace('{text}', text)
  }

  clearCache() {
    this.prompts = {}
  }
}

module.exports = new PromptService()
