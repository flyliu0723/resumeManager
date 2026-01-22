const { positionNoteStmt } = require('../database')
const { success, error } = require('../utils/response')

const noteController = {
  getByPosition: (req, res) => {
    try {
      const notes = positionNoteStmt.getByPosition(req.params.positionId)
      success(res, notes)
    } catch (err) {
      error(res, err.message)
    }
  },

  create: (req, res) => {
    try {
      const { content } = req.body
      if (!content || !content.trim()) {
        return error(res, '补充内容不能为空', 400)
      }
      
      const result = positionNoteStmt.insert(req.params.positionId, content.trim())
      const note = positionNoteStmt.getById(result.lastInsertRowid)
      success(res, note)
    } catch (err) {
      error(res, err.message)
    }
  },

  update: (req, res) => {
    try {
      const { content } = req.body
      if (!content || !content.trim()) {
        return error(res, '补充内容不能为空', 400)
      }
      
      const note = positionNoteStmt.getById(req.params.noteId)
      if (!note) return error(res, '补充信息不存在', 404)
      
      const result = positionNoteStmt.update(req.params.noteId, content.trim())
      if (result.changes) {
        const updatedNote = positionNoteStmt.getById(req.params.noteId)
        success(res, updatedNote)
      } else {
        const refreshedNote = positionNoteStmt.getById(req.params.noteId)
        if (refreshedNote) success(res, refreshedNote)
        else success(res, null, '更新成功')
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  delete: (req, res) => {
    try {
      positionNoteStmt.delete(req.params.noteId)
      success(res, null, '删除成功')
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = noteController
