const { positionStmt, positionNoteStmt, aiConfigStmt } = require('../database')
const promptService = require('../promptService')
const AIService = require('../aiService')
const { success, error } = require('../utils/response')

/**
 * JD 解析控制器
 * 提取JD关键信息并存储到数据库
 */
const jdParseController = {
  
  /**
   * 解析职位JD
   * POST /api/positions/:id/parse-jd
   */
  parseJD: async (req, res) => {
    try {
      const { id } = req.params
      const { includeNotes = true } = req.body

      // 获取职位信息
      const position = positionStmt.getById(id)
      if (!position) {
        return error(res, '职位不存在', 404)
      }

      // 组合JD文本
      let jdText = position.description || ''
      
      // 如果需要，添加职位补充信息
      if (includeNotes) {
        const notes = positionNoteStmt.getByPosition(id)
        if (notes && notes.length > 0) {
          const notesText = notes.map(n => n.content).join('\n')
          jdText += `\n\n职位补充信息:\n${notesText}`
        }
      }

      if (!jdText.trim()) {
        return error(res, 'JD内容为空，无法解析', 400)
      }

      // 获取AI配置
      const aiConfig = aiConfigStmt.getActive()
      if (!aiConfig) {
        return error(res, '未配置AI服务', 500)
      }

      // 调用AI解析
      const aiService = new AIService(aiConfig)
      aiService.setActiveConfig(aiConfig)
      
      const prompt = promptService.getParseJDPrompt(jdText.slice(0, 5000))
      const { provider, api_key, api_url, model } = aiConfig

      let result
      switch (provider) {
        case 'zhipu':
          result = await aiService.parseWithZhipu(api_key, api_url, model, prompt)
          break
        case 'minimax':
          result = await aiService.parseWithMinimax(api_key, api_url, model, prompt)
          break
        case 'deepseek':
          result = await aiService.parseWithDeepseek(api_key, api_url, model, prompt)
          break
        case 'openai':
          result = await aiService.parseWithOpenAI(api_key, api_url, model, prompt)
          break
        default:
          throw new Error(`不支持的提供商: ${provider}`)
      }

      // 解析AI返回的结果
      let parsedData
      try {
        // AI返回可能是字符串或已解析的对象
        if (typeof result === 'string') {
          // 尝试从字符串中提取JSON
          const jsonMatch = result.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0])
          } else {
            // 尝试直接解析整个字符串
            parsedData = JSON.parse(result)
          }
        } else if (typeof result === 'object' && result !== null) {
          // 已经是对象，直接使用
          parsedData = result
        } else {
          throw new Error('AI返回格式错误')
        }
      } catch (parseError) {
        console.error('解析AI结果失败:', parseError)
        console.error('AI原始返回:', result)
        console.error('AI返回类型:', typeof result)
        return error(res, 'AI解析结果格式错误', 500)
      }

      // 保存解析结果到数据库
      positionStmt.updateParsedJD(id, {
        skills: parsedData.skills || [],
        education: parsedData.education || null,
        experience: parsedData.experience || null,
        companies: parsedData.companies || [],
        jdContent: position.description
      })

      // 返回解析结果
      return success(res, {
        skills: parsedData.skills || [],
        education: parsedData.education || null,
        experience: parsedData.experience || null,
        companies: parsedData.companies || [],
        parsedAt: new Date().toISOString()
      }, 'JD解析成功')

    } catch (err) {
      console.error('解析JD失败:', err)
      return error(res, err.message || '解析JD失败', 500)
    }
  },

  /**
   * 更新解析字段（用于编辑）
   * PUT /api/positions/:id/parsed-field
   */
  updateParsedField: (req, res) => {
    try {
      const { id } = req.params
      const { field, value } = req.body

      const allowedFields = ['parsed_skills', 'parsed_education', 'parsed_experience', 'parsed_companies']
      if (!allowedFields.includes(field)) {
        return error(res, '无效的字段名', 400)
      }

      positionStmt.updateParsedField(id, field, value)

      return success(res, null, '更新成功')
    } catch (err) {
      console.error('更新解析字段失败:', err)
      return error(res, err.message, 500)
    }
  },

  /**
   * 获取解析结果
   * GET /api/positions/:id/parsed-jd
   */
  getParsedJD: (req, res) => {
    try {
      const { id } = req.params
      const position = positionStmt.getById(id)
      
      if (!position) {
        return error(res, '职位不存在', 404)
      }

      return success(res, {
        skills: position.parsed_skills ? JSON.parse(position.parsed_skills) : [],
        education: position.parsed_education || null,
        experience: position.parsed_experience || null,
        companies: position.parsed_companies ? JSON.parse(position.parsed_companies) : [],
        parsedAt: position.parsed_at || null,
        jdContent: position.parsed_jd_content || null
      })
    } catch (err) {
      console.error('获取解析结果失败:', err)
      return error(res, err.message, 500)
    }
  }
}

module.exports = jdParseController
