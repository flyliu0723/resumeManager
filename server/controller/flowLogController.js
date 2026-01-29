const { flowLogStmt, positionResumeStmt, interviewEventStmt } = require('../database')
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
      const { matchId, fromStatus, toStatus, note, jdSupplement, nextInterviewAt } = req.body
      
      if (!matchId || !toStatus) {
        return error(res, '缺少必要参数', 400)
      }
      
      const match = positionResumeStmt.getById(matchId)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }
      
      const currentStatus = match.current_status || match.status || ''
      
      // 如果切换到待面试状态且没有流程开始时间，则记录流程开始时间
      let updateFlowStartAt = false
      if (toStatus === '待面试' && !match.flow_start_at) {
        updateFlowStartAt = true
      }
      
      // 如果切换到待面试状态且有面试时间，则更新面试时间
      const interviewTime = (toStatus === '待面试' && nextInterviewAt) ? nextInterviewAt : null
      
      flowLogStmt.insert(matchId, currentStatus, toStatus, note, jdSupplement)
      positionResumeStmt.updateStatus(matchId, toStatus, note, jdSupplement, updateFlowStartAt, interviewTime)

      // 记录状态变更事件
      try {
        // 计算在当前阶段的停留时长（如果有流程开始时间）
        let durationSeconds = null
        if (match.flow_start_at && toStatus !== '待面试') {
          const flowStartTime = new Date(match.flow_start_at).getTime()
          const now = Date.now()
          durationSeconds = Math.floor((now - flowStartTime) / 1000)
        }

        // 确定事件类型
        let eventType = 'status_change'
        if (toStatus === '待面试') {
          eventType = 'interview_scheduled'
        } else if (toStatus === '面试中') {
          eventType = 'interview_started'
        } else if (toStatus === '谈薪中') {
          eventType = 'salary_discussed'
        } else if (toStatus === '已成单') {
          eventType = 'offer_accepted'
        } else if (toStatus === '已拒绝') {
          eventType = 'candidate_rejected'
        } else if (toStatus === '已通过') {
          eventType = 'interview_passed'
        }

        interviewEventStmt.insert(eventType, matchId, match.position_id, {
          eventTime: new Date().toISOString(),
          stageBefore: currentStatus || null,
          stageAfter: toStatus,
          durationSeconds,
          details: {
            note: note || null,
            jdSupplement: jdSupplement || null,
            nextInterviewAt: interviewTime || null,
            matchId,
            candidateName: match.candidate_name || '未知'
          }
        })
        console.log('记录状态变更事件成功:', { matchId, eventType, from: currentStatus, to: toStatus })
      } catch (eventErr) {
        console.error('记录状态变更事件失败:', eventErr)
      }

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
