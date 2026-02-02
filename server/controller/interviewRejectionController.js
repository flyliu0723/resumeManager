/**
 * 面试拒绝记录控制器
 * 用于管理各阶段流向"不合适"的记录
 */

const { interviewRejectionStmt, positionResumeStmt } = require('../database')
const { REJECTION_REASONS, StatusUtils } = require('../constants/interviewStatus')
const { success, error } = require('../utils/response')

const interviewRejectionController = {
  
  // 获取指定match的拒绝记录
  getByMatchId: (req, res) => {
    try {
      const { matchId } = req.params
      const records = interviewRejectionStmt.getByMatchId(matchId)
      
      // 增强返回数据
      const data = records.map(record => ({
        ...record,
        rejection_reason_label: REJECTION_REASONS[record.rejection_reason_code]?.label || record.rejection_reason_code,
        stage_label: StatusUtils.getMainStatus(record.rejected_at_stage)?.label || record.rejected_at_stage
      }))

      success(res, data)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取单个拒绝记录详情
  getById: (req, res) => {
    try {
      const record = interviewRejectionStmt.getById(req.params.id)
      if (!record) {
        return error(res, '拒绝记录不存在', 404)
      }

      success(res, {
        ...record,
        rejection_reason_label: REJECTION_REASONS[record.rejection_reason_code]?.label,
        stage_label: StatusUtils.getMainStatus(record.rejected_at_stage)?.label
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  // 创建拒绝记录（通常通过 updateStatus 自动创建，但也可以手动创建）
  create: (req, res) => {
    try {
      const { matchId } = req.params
      const {
        rejectedAtStage,
        rejectedAtSubStatus,
        rejectionCategory,
        rejectionReasonCode,
        rejectionReasonDetail,
        rejectedBy,
        rejectedByName,
        rejectedByRole,
        internalNotes,
        candidateFeedback,
        isReopenable,
        reopenConditions,
        relatedRoundId
      } = req.body

      // 验证match是否存在
      const match = positionResumeStmt.getById(matchId)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      // 验证拒绝原因代码是否有效
      if (!REJECTION_REASONS[rejectionReasonCode]) {
        return error(res, '无效的拒绝原因代码', 400)
      }

      const result = interviewRejectionStmt.insert(matchId, {
        rejectedAtStage,
        rejectedAtSubStatus,
        rejectionCategory,
        rejectionReasonCode,
        rejectionReasonDetail,
        rejectedBy,
        rejectedByName,
        rejectedByRole,
        internalNotes,
        candidateFeedback,
        isReopenable,
        reopenConditions,
        relatedRoundId
      })

      success(res, { 
        id: result.lastInsertRowid,
        match_id: matchId 
      }, '拒绝记录创建成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 更新拒绝记录（如修改重新打开条件）
  update: (req, res) => {
    try {
      const { id } = req.params
      const { isReopenable, reopenConditions, internalNotes } = req.body

      interviewRejectionStmt.update(id, {
        isReopenable,
        reopenConditions,
        internalNotes
      })

      success(res, { id }, '拒绝记录更新成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取拒绝统计（按阶段）
  getStatsByStage: (req, res) => {
    try {
      const { startDate, endDate } = req.query
      
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const end = endDate || new Date().toISOString().split('T')[0]

      const stats = interviewRejectionStmt.getStatsByStage(start, end)

      // 增强数据
      const data = stats.map(stat => ({
        ...stat,
        stage_label: StatusUtils.getMainStatus(stat.rejected_at_stage)?.label || stat.rejected_at_stage
      }))

      success(res, {
        date_range: { start, end },
        stats: data
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取拒绝统计（按原因）
  getStatsByReason: (req, res) => {
    try {
      const { startDate, endDate, category } = req.query
      
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const end = endDate || new Date().toISOString().split('T')[0]

      const stats = interviewRejectionStmt.getStatsByReason(start, end)

      // 增强数据并筛选
      let data = stats.map(stat => ({
        ...stat,
        reason_info: REJECTION_REASONS[stat.rejection_reason_code]
      }))

      if (category) {
        data = data.filter(d => d.reason_info?.category === category)
      }

      success(res, {
        date_range: { start, end },
        category: category || 'all',
        stats: data
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取可重新打开的流程列表
  getReopenableList: (req, res) => {
    try {
      const { matchId } = req.query
      
      let sql = `
        SELECT 
          ir.*,
          pr.candidate_name,
          pr.position_id,
          p.name as position_name
        FROM interview_rejections ir
        JOIN position_resumes pr ON ir.match_id = pr.id
        JOIN positions p ON pr.position_id = p.id
        WHERE ir.is_reopenable = 1
      `
      const params = []

      if (matchId) {
        sql += ' AND ir.match_id = ?'
        params.push(Number(matchId))
      }

      sql += ' ORDER BY ir.created_at DESC'

      const records = all(sql, params)

      success(res, records)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 删除拒绝记录
  delete: (req, res) => {
    try {
      const { id } = req.params
      interviewRejectionStmt.delete(id)
      success(res, null, '拒绝记录删除成功')
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = interviewRejectionController
