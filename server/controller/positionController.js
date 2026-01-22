const { positionStmt, companyStmt } = require('../database')
const { success, error } = require('../utils/response')

const positionController = {
  getAll: (req, res) => {
    try {
      const activePositions = positionStmt.getActive()
      const archivedPositions = positionStmt.getArchived()
      success(res, {
        active: activePositions,
        archived: archivedPositions
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  getById: (req, res) => {
    try {
      const position = positionStmt.getById(req.params.id)
      if (position) {
        success(res, position)
      } else {
        error(res, '职位不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  create: (req, res) => {
    try {
      const { name, company, description, start_date } = req.body
      
      if (!name) {
        return error(res, '职位名称不能为空', 400)
      }
      
      if (company) {
        companyStmt.insert(company)
      }
      
      const result = positionStmt.insert(String(name), String(company || ''), String(description || ''), String(start_date || ''))
      const newPosition = positionStmt.getById(result.lastInsertRowid)
      
      success(res, newPosition)
    } catch (err) {
      error(res, err.message)
    }
  },

  update: (req, res) => {
    try {
      const position = positionStmt.getById(req.params.id)
      if (!position) {
        return error(res, '职位不存在', 404)
      }
      
      if (position.status === 'archived') {
        return error(res, '已归档的职位不能编辑', 400)
      }
      
      const { name, company, description, start_date } = req.body
      
      if (company) {
        companyStmt.insert(company)
      }
      
      const result = positionStmt.update(req.params.id, String(name), String(company || ''), String(description || ''), String(start_date || ''))
      
      if (result.changes) {
        const updatedPosition = positionStmt.getById(req.params.id)
        success(res, updatedPosition)
      } else {
        error(res, '职位不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  delete: (req, res) => {
    try {
      const result = positionStmt.delete(Number(req.params.id))
      if (result.changes) {
        success(res, null, '删除成功')
      } else {
        error(res, '职位不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  archive: (req, res) => {
    try {
      const { reason } = req.body
      const result = positionStmt.archive(req.params.id, reason)
      if (result.changes) {
        const position = positionStmt.getById(req.params.id)
        success(res, position)
      } else {
        error(res, '职位不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  restore: (req, res) => {
    try {
      const result = positionStmt.restore(req.params.id)
      if (result.changes) {
        const position = positionStmt.getById(req.params.id)
        success(res, position)
      } else {
        error(res, '职位不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = positionController
