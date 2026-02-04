const express = require('express')
const { SKILL_SYNONYMS, addSynonym, importSynonyms, exportSynonyms } = require('../constants/skillSynonyms')
const { success, error } = require('../utils/response')

const router = express.Router()

/**
 * 获取所有技能同义词
 * GET /api/skill-synonyms
 */
router.get('/', (req, res) => {
  try {
    const data = exportSynonyms()
    success(res, data)
  } catch (e) {
    res.status(500).json({ success: false, message: '获取技能同义词失败', error: e.message })
  }
})

/**
 * 添加技能同义词
 * POST /api/skill-synonyms
 */
router.post('/', (req, res) => {
  try {
    const { skill, synonyms, category } = req.body
    
    if (!skill) {
      return res.status(400).json({ success: false, message: '技能名称不能为空' })
    }

    addSynonym(skill, synonyms || [], category || '其他')
    success(res, null, '添加成功')
  } catch (e) {
    res.status(500).json({ success: false, message: '添加技能同义词失败', error: e.message })
  }
})

/**
 * 更新技能同义词
 * PUT /api/skill-synonyms/:skill
 */
router.put('/:skill', (req, res) => {
  try {
    const { skill } = req.params
    const { synonyms, category } = req.body

    if (!SKILL_SYNONYMS[skill]) {
      return res.status(404).json({ success: false, message: '技能不存在' })
    }

    SKILL_SYNONYMS[skill] = {
      synonyms: synonyms || [],
      category: category || SKILL_SYNONYMS[skill].category
    }

    success(res, null, '更新成功')
  } catch (e) {
    res.status(500).json({ success: false, message: '更新技能同义词失败', error: e.message })
  }
})

/**
 * 删除技能同义词
 * DELETE /api/skill-synonyms/:skill
 */
router.delete('/:skill', (req, res) => {
  try {
    const { skill } = req.params

    if (!SKILL_SYNONYMS[skill]) {
      return res.status(404).json({ success: false, message: '技能不存在' })
    }

    delete SKILL_SYNONYMS[skill]
    success(res, null, '删除成功')
  } catch (e) {
    res.status(500).json({ success: false, message: '删除技能同义词失败', error: e.message })
  }
})

/**
 * 批量导入技能同义词
 * POST /api/skill-synonyms/import
 */
router.post('/import', (req, res) => {
  try {
    const { format, data } = req.body

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, message: '数据格式不正确' })
    }

    let imported = 0

    if (format === 'csv') {
      // CSV 格式: [{ skill, synonyms, category }]
      for (const item of data) {
        if (item.skill) {
          addSynonym(
            item.skill,
            Array.isArray(item.synonyms) ? item.synonyms : item.synonyms?.split('|') || [],
            item.category || '其他'
          )
          imported++
        }
      }
    } else {
      // JSON 格式转换
      for (const item of data) {
        if (item.skill) {
          addSynonym(
            item.skill,
            item.synonyms || [],
            item.category || '其他'
          )
          imported++
        }
      }
    }

    success(res, { imported }, `成功导入 ${imported} 条记录`)
  } catch (e) {
    res.status(500).json({ success: false, message: '批量导入失败', error: e.message })
  }
})

/**
 * 保存所有技能同义词（覆盖式保存）
 * POST /api/skill-synonyms/save-all
 */
router.post('/save-all', (req, res) => {
  try {
    const data = req.body

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: '数据格式不正确' })
    }

    // 清空现有数据
    Object.keys(SKILL_SYNONYMS).forEach(key => {
      delete SKILL_SYNONYMS[key]
    })

    // 导入新数据
    importSynonyms(data)

    // TODO: 这里可以添加持久化到文件的逻辑
    // const fs = require('fs')
    // fs.writeFileSync('./constants/skillSynonyms.json', JSON.stringify(data, null, 2))

    success(res, null, '保存成功')
  } catch (e) {
    res.status(500).json({ success: false, message: '保存失败', error: e.message })
  }
})

/**
 * 获取所有分类列表
 * GET /api/skill-synonyms/categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = new Set()
    
    for (const data of Object.values(SKILL_SYNONYMS)) {
      if (data.category) {
        categories.add(data.category)
      }
    }

    success(res, [...categories])
  } catch (e) {
    res.status(500).json({ success: false, message: '获取分类列表失败', error: e.message })
  }
})

module.exports = router
