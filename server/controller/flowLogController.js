const { flowLogStmt, positionResumeStmt } = require('../database')
const { success, error } = require('../utils/response')

const flowLogController = {
  getByMatchId: (req, res) => {
    try {
      const logs = flowLogStmt.getByMatchId(req.params.matchId)
      success(res, logs)
    } catch (err) {
      error(res, err.message)
    }
  },

  create: (req, res) => {
    try {
      const { matchId, fromStatus, toStatus, note, jdSupplement } = req.body
      
      if (!matchId || !toStatus) {
        return error(res, '缺少必要参数', 400)
      }
      
      const match = positionResumeStmt.getById(matchId)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }
      
      const currentStatus = match.current_status || match.status || ''
      
      flowLogStmt.insert(matchId, currentStatus, toStatus, note, jdSupplement)
      positionResumeStmt.updateStatus(matchId, toStatus, note, jdSupplement)
      
      const updatedMatch = positionResumeStmt.getById(matchId)
      const newLogs = flowLogStmt.getByMatchId(matchId)
      
      success(res, {
        match: updatedMatch,
        logs: newLogs
      }, '状态更新成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  updateJdSupplement: (req, res) => {
    try {
      const { jdSupplement } = req.body
      
      positionResumeStmt.updateJdSupplement(req.params.matchId, jdSupplement)
      
      const match = positionResumeStmt.getById(req.params.matchId)
      success(res, match)
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = flowLogController
