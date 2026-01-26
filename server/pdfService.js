const fs = require('fs')
const path = require('path')

async function extractTextFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('文件不存在:', filePath)
    return ''
  }

  const ext = path.extname(filePath).toLowerCase()
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic']

  if (imageExts.includes(ext)) {
    console.error('不支持的图片文件格式:', ext)
    throw new Error(`不支持的图片格式 ${ext}，请上传 PDF、Word 或文本文件`)
  }

  if (ext === '.pdf' || isPdfByContent(filePath)) {
    return await extractTextFromPDF(filePath)
  } else if (ext === '.docx') {
    return await extractTextFromDocx(filePath)
  } else if (ext === '.doc') {
    return await extractTextFromDoc(filePath)
  } else {
    return extractTextFromText(filePath)
  }
}

function isPdfByContent(filePath) {
  try {
    const buffer = fs.readFileSync(filePath, null)
    return buffer.length > 4 && buffer.slice(0, 4).toString() === '%PDF'
  } catch (e) {
    return false
  }
}

async function extractTextFromPDF(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('PDF文件不存在:', filePath)
      return ''
    }

    const stats = fs.statSync(filePath)
    if (stats.size === 0) {
      console.error('PDF文件为空')
      return ''
    }

    console.log(`PDF文件大小: ${stats.size} bytes`)

    const dataBuffer = fs.readFileSync(filePath)

    // 验证PDF头
    if (dataBuffer.length < 5 || dataBuffer.slice(0, 4).toString() !== '%PDF') {
      console.error('不是有效的PDF文件')
      return ''
    }

    const pdf = require('pdf-parse')

    const data = await pdf(dataBuffer)

    let text = data.text || ''

    if (!text || text.trim().length < 10) {
      console.warn('pdf-parse提取结果过短，尝试直接解析...')
      text = await parsePDFDirectly(dataBuffer)
    }

    if (!text) {
      return ''
    }

    text = joinSplitChars(text)

    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    console.log(`最终提取长度: ${cleanText.length} 字符`)
    return cleanText

  } catch (error) {
    console.error('PDF解析错误:', error.message)
    return ''
  }
}

function joinSplitChars(text) {
  if (!text || text.length < 10) return text

  let result = text

  result = result.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')

  result = result.replace(/([a-zA-Z])\s+([a-zA-Z])/g, function(match, c1, c2) {
    const upperC1 = c1.toUpperCase()
    const upperC2 = c2.toUpperCase()

    if ((upperC1 === 'J' && upperC2 === 'S') ||
        (upperC1 === 'E' && upperC2 === 'S') ||
        (upperC1 === 'V' && upperC2 === 'U') ||
        (upperC1 === 'H' && upperC2 === 'T') ||
        (upperC1 === 'W' && upperC2 === 'E') ||
        (upperC1 === 'A' && upperC2 === 'N') ||
        (upperC1 === 'O' && upperC2 === 'S') ||
        (upperC1 === 'D' && upperC2 === 'B') ||
        (upperC1 === 'M' && upperC2 === 'Y') ||
        (upperC1 === 'S' && upperC2 === 'Q') ||
        (upperC1 === 'C' && upperC2 === 'S') ||
        (upperC1 === 'G' && upperC2 === 'I') ||
        (upperC1 === 'U' && upperC2 === 'I')) {
      return c1 + c2
    }

    if (/^[A-Z]{2,}$/.test(c1 + c2)) {
      return c1 + c2
    }

    return match
  })

  result = result.replace(/([A-Z])\s+([A-Z])\s+([A-Z])/g, '$1$2$3')

  return result
}

async function parsePDFDirectly(buffer) {
  try {
    const content = buffer.toString('utf-8', 0, Math.min(100000, buffer.length))

    let extractedText = ''

    const streamMatch = content.match(/stream\s*([\s\S]*?)endstream/g)
    if (streamMatch) {
      for (const stream of streamMatch.slice(0, 10)) {
        let clean = stream
          .replace(/stream\s*/, '')
          .replace(/endstream/, '')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          .trim()

        clean = clean.replace(/[^\x20-\x7E\u4e00-\u9fa5]/g, ' ')

        if (clean.length > 20 && clean.length < 2000) {
          if (/[\u4e00-\u9fa5]/.test(clean) || /[a-zA-Z]{2,}/.test(clean)) {
            extractedText += clean + ' '
          }
        }
      }
    }

    return extractedText
  } catch (error) {
    console.error('直接解析失败:', error.message)
    return ''
  }
}

async function extractTextFromDocx(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('DOCX文件不存在:', filePath)
      return ''
    }

    const stats = fs.statSync(filePath)
    console.log(`DOCX文件大小: ${stats.size} bytes`)

    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })

    let text = result.value || ''
    console.log(`mammoth提取文本长度: ${text.length} 字符`)

    if (!text || text.trim().length === 0) {
      console.warn('mammoth提取为空，尝试直接读取XML...')
      text = await extractDocxFromXML(filePath)
      console.log(`XML提取文本长度: ${text.length} 字符`)
    }

    // 更好的文本清理
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()

    console.log(`最终DOCX文本长度: ${cleanText.length} 字符`)
    return cleanText
  } catch (error) {
    console.error('DOCX解析错误:', error.message)
    // 尝试XML解析作为fallback
    try {
      console.log('尝试XML解析作为fallback...')
      return await extractDocxFromXML(filePath)
    } catch (fallbackError) {
      console.error('XML fallback也失败:', fallbackError.message)
      return ''
    }
  }
}

async function extractTextFromDoc(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('DOC文件不存在:', filePath)
      return ''
    }

    // .doc文件是二进制格式，需要特殊处理
    // 这里尝试使用antiword或类似工具，如果不可用则返回错误
    console.warn('DOC格式支持有限，建议转换为DOCX格式')
    
    // 尝试使用antiword（如果系统支持）
    const { exec } = require('child_process')
    const util = require('util')
    const execAsync = util.promisify(exec)
    
    try {
      const { stdout } = await execAsync(`antiword "${filePath}"`)
      const text = stdout.trim()
      if (text && text.length > 10) {
        console.log(`antiword提取DOC文本长度: ${text.length} 字符`)
        return text
      }
    } catch (antiwordError) {
      console.warn('antiword不可用或失败:', antiwordError.message)
    }

    // 如果antiword不可用，尝试其他方法
    console.error('无法解析DOC文件，请转换为DOCX或PDF格式')
    return ''
  } catch (error) {
    console.error('DOC解析错误:', error.message)
    return ''
  }
}

async function extractDocxFromXML(filePath) {
  try {
    const JSZip = require('jszip')
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath))

    if (!zip.file('word/document.xml')) {
      return ''
    }

    const xmlContent = await zip.file('word/document.xml').async('string')

    let text = xmlContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text
  } catch (error) {
    console.error('DOCX XML解析失败:', error.message)
    return ''
  }
}

function extractTextFromText(filePath) {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'utf-16le', 'latin1']

  for (const encoding of encodings) {
    try {
      const content = fs.readFileSync(filePath, encoding)
      const cleanText = content
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim()

      if (cleanText.length > 0) {
        return cleanText
      }
    } catch (e) {
      continue
    }
  }

  return ''
}

module.exports = {
  extractTextFromFile,
  extractTextFromPDF,
  extractTextFromDocx,
  extractTextFromDoc,
  extractTextFromText
}
