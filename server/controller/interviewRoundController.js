/**
 * 面试轮次控制器
 * 支持多轮面试的完整管理
 */

const { 
  interviewRoundStmt, 
  interviewFeedbackStmt,
  positionResumeStmt,
  flowLogStmt 
} = require('../database')
const { success, error } = require('../utils/response')

const interviewRoundController = {
  
  // 获取指定match的所有面试轮次
  getByMatchId: (req, res) => {
    try {
      const { matchId } = req.params
      const rounds = interviewRoundStmt.getByMatchId(matchId)
      
      // 获取每轮的评价维度
      const roundsWithFeedback = rounds.map(round => {
        const feedbacks = interviewFeedbackStmt.getByRoundId(round.id)
        const scoreInfo = interviewFeedbackStmt.calculateWeightedScore(round.id)
        
        return {
          ...round,
          feedbacks,
          weighted_score: scoreInfo?.weightedScore || null,
          total_weight: scoreInfo?.totalWeight || null
        }
      })

      success(res, roundsWithFeedback)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取单个轮次详情
  getById: (req, res) => {
    try {
      const round = interviewRoundStmt.getById(req.params.id)
      if (!round) {
        return error(res, '面试轮次不存在', 404)
      }

      const feedbacks = interviewFeedbackStmt.getByRoundId(round.id)
      const scoreInfo = interviewFeedbackStmt.calculateWeightedScore(round.id)

      success(res, {
        ...round,
        feedbacks,
        weighted_score: scoreInfo?.weightedScore || null
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  // 创建面试轮次（安排面试）
  create: (req, res) => {
    try {
      const { matchId } = req.params
      const {
        roundNumber,       // 轮次编号（1, 2, 3...）
        roundType,         // 面试类型：技术面试、HR面试、总监面等
        interviewerId,     // 面试官ID
        interviewerName,   // 面试官姓名
        interviewerRole,   // 面试官角色
        scheduledAt,       // 预定时间
        durationMinutes,   // 预计时长
        location           // 地点或链接
      } = req.body

      // 验证match是否存在
      const match = positionResumeStmt.getById(matchId)
      if (!match) {
        return error(res, '匹配记录不存在', 404)
      }

      // 创建面试轮次
      const result = interviewRoundStmt.insert(matchId, roundNumber, {
        roundType,
        interviewerId,
        interviewerName,
        interviewerRole,
        scheduledAt,
        durationMinutes,
        location
      })

      // 更新match的当前轮次
      positionResumeStmt.updateInterviewRound(matchId, roundNumber, result.lastInsertRowid)

      // 更新match状态为"已安排"
      if (match.main_status === 'interviewing' && match.sub_status === 'round_pending') {
        positionResumeStmt.updateStatus(
          matchId,
          'round_scheduled',
          'interviewing',
          'round_scheduled',
          scheduledAt,
          false
        )

        // 记录流程日志
        flowLogStmt.insertWithNewStatus(
          matchId,
          'interviewing',
          'interviewing',
          'round_pending',
          'round_scheduled',
          {
            actionType: 'interview_scheduled',
            roundId: result.lastInsertRowid,
            note: `安排第${roundNumber}轮面试`,
            metadata: {
              round_number: roundNumber,
              round_type: roundType,
              interviewer: interviewerName,
              scheduled_at: scheduledAt
            }
          }
        )
      }

      success(res, { 
        id: result.lastInsertRowid,
        match_id: matchId,
        round_number: roundNumber,
        status: 'pending'
      }, '面试安排成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 更新面试轮次状态和结果（面试完成后）
  updateStatus: (req, res) => {
    try {
      const { id } = req.params
      const {
        status,           // pending, scheduled, completed, cancelled
        result,           // passed, failed, pending
        resultReason,     // 结果原因
        feedbackJson,     // 面试反馈JSON
        candidateFeedback // 候选人对面试的反馈
      } = req.body

      const round = interviewRoundStmt.getById(id)
      if (!round) {
        return error(res, '面试轮次不存在', 404)
      }

      // 更新轮次
      interviewRoundStmt.updateStatus(id, {
        status,
        result,
        resultReason,
        feedbackJson,
        candidateFeedback
      })

      // 如果面试完成且有结果，更新match状态
      if (status === 'completed' && result) {
        const match = positionResumeStmt.getById(round.match_id)
        
        if (result === 'passed') {
          // 本轮通过，准备进入下一轮或全部通过
          const allRounds = interviewRoundStmt.getByMatchId(round.match_id)
          const completedRounds = allRounds.filter(r => r.result === 'passed')
          
          // 检查是否还有更多轮次（简化逻辑：假设最多3轮）
          if (completedRounds.length >= 3) {
            // 全部通过
            positionResumeStmt.updateStatus(
              round.match_id,
              'all_rounds_passed',
              'interviewing',
              'all_rounds_passed',
              null,
              true
            )
          } else {
            // 本轮通过，等待安排下一轮
            positionResumeStmt.updateStatus(
              round.match_id,
              'round_passed',
              'interviewing',
              'round_passed',
              null,
              true
            )
          }
        } else if (result === 'failed') {
          // 面试不通过，进入不合适状态
          positionResumeStmt.updateStatus(
            round.match_id,
            'interview_rejected',
            'interviewing',
            'interview_rejected',
            null,
            true
          )
        }

        // 记录流程日志
        flowLogStmt.insertWithNewStatus(
          round.match_id,
          'interviewing',
          'interviewing',
          'round_scheduled',
          result === 'passed' ? 'round_passed' : 'interview_rejected',
          {
            actionType: 'interview_completed',
            roundId: id,
            note: `第${round.round_number}轮面试${result === 'passed' ? '通过' : '未通过'}`,
            metadata: {
              round_id: id,
              round_number: round.round_number,
              result,
              feedback: feedbackJson
            }
          }
        )
      }

      success(res, { id, status, result }, '面试状态更新成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 添加面试反馈（评价维度）
  addFeedback: (req, res) => {
    try {
      const { id } = req.params
      const { dimensions } = req.body  // [{ name, score, weight, comment }, ...]

      const round = interviewRoundStmt.getById(id)
      if (!round) {
        return error(res, '面试轮次不存在', 404)
      }

      // 批量创建评价维度
      const results = interviewFeedbackStmt.insertBatch(id, dimensions)

      // 计算加权平均分
      const scoreInfo = interviewFeedbackStmt.calculateWeightedScore(id)

      success(res, {
        round_id: id,
        feedbacks_created: results.length,
        weighted_score: scoreInfo?.weightedScore,
        dimensions: dimensions
      }, '面试反馈添加成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 更新面试反馈
  updateFeedback: (req, res) => {
    try {
      const { feedbackId } = req.params
      const { score, weight, comment } = req.body

      interviewFeedbackStmt.update(feedbackId, { score, weight, comment })

      success(res, { id: feedbackId }, '面试反馈更新成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取当前进行的面试轮次
  getCurrentRound: (req, res) => {
    try {
      const { matchId } = req.params
      const round = interviewRoundStmt.getCurrentRound(matchId)
      
      if (!round) {
        return success(res, null, '没有正在进行的面试轮次')
      }

      const feedbacks = interviewFeedbackStmt.getByRoundId(round.id)
      
      success(res, {
        ...round,
        feedbacks
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取已完成的面试轮次
  getCompletedRounds: (req, res) => {
    try {
      const { matchId } = req.params
      const rounds = interviewRoundStmt.getCompletedRounds(matchId)

      const roundsWithScores = rounds.map(round => {
        const scoreInfo = interviewFeedbackStmt.calculateWeightedScore(round.id)
        return {
          ...round,
          weighted_score: scoreInfo?.weightedScore
        }
      })

      success(res, roundsWithScores)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 删除面试轮次
  delete: (req, res) => {
    try {
      const { id } = req.params
      
      // 先删除关联的评价维度
      interviewFeedbackStmt.deleteByRoundId(id)
      
      // 删除轮次
      interviewRoundStmt.delete(id)

      success(res, null, '面试轮次删除成功')
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = interviewRoundController
