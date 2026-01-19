const fs = require('fs')
const path = require('path')

async function extractTextFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.pdf') {
    return extractTextFromPDF(filePath)
  } else if (ext === '.docx') {
    return extractTextFromDocx(filePath)
  } else if (ext === '.doc') {
    return extractTextFromDocx(filePath)
  } else {
    return extractTextFromText(filePath)
  }
}

async function extractTextFromPDF(filePath) {
  try {
    const pdf = require('pdf-parse')
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)

    const text = data.text || ''
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()

    return cleanText
  } catch (error) {
    console.error('PDF解析错误:', error.message)
    return ''
  }
}

async function extractTextFromDocx(filePath) {
  try {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })

    const cleanText = result.value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '')
      .trim()

    return cleanText
  } catch (error) {
    console.error('DOCX解析错误:', error.message)
    return ''
  }
}

function extractTextFromText(filePath) {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'latin1']

  for (const encoding of encodings) {
    try {
      const content = fs.readFileSync(filePath, encoding)
      const cleanText = content
        .replace(/[\x00-\x1f\x7f]/g, '')
        .trim()

      return cleanText
    } catch (e) {
      continue
    }
  }

  return ''
}

module.exports = {
  extractTextFromFile
}
