const matchService = require('../services/matchService')
const { positionStmt, jdResumeMatchStmt, positionResumeStmt } = require('../database')
const { success, error } = require('../utils/response')

// 计算任务状态存储（内存中，实际生产环境应使用Redis等）
const calculationTasks = new Map()

const recommendController = {
  // POST /api/positions/:id/recommend
  // 触发推荐计算（异步）
  triggerRecommend: async (req, res) => {
    try {
      const positionId = parseInt(req.params.id)
      
      // 检查职位是否存在
      const position = positionStmt.getById(positionId)
      if (!position) {
        return error(res, '职位不存在', 404)
      }

      // 检查JD是否已解析
      if (!position.parsed_skills) {
        return error(res, 'JD尚未解析，请先解析JD后再进行推荐', 400)
      }

      // 生成任务ID
      const taskId = `recommend_${positionId}_${Date.now()}`
      
      // 设置任务状态为处理中
      calculationTasks.set(taskId, {
        status: 'processing',
        positionId,
        startTime: new Date().toISOString(),
        endTime: null,
        error: null,
        totalCount: 0,
        processedCount: 0
      })

      // 启动后台计算（异步）
      setImmediate(async () => {
        try {
          const recommendations = await matchService.recommendResumesForJD(positionId)
          
          // 更新任务状态为完成
          calculationTasks.set(taskId, {
            status: 'completed',
            positionId,
            startTime: calculationTasks.get(taskId).startTime,
            endTime: new Date().toISOString(),
            error: null,
            totalCount: recommendations.length,
            processedCount: recommendations.length
          })
        } catch (e) {
          // 更新任务状态为失败
          calculationTasks.set(taskId, {
            status: 'failed',
            positionId,
            startTime: calculationTasks.get(taskId).startTime,
            endTime: new Date().toISOString(),
            error: e.message,
            totalCount: 0,
            processedCount: 0
          })
        }
      })

      // 立即返回任务ID
      success(res, { taskId, status: 'processing' }, '推荐计算已启动')
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // GET /api/positions/:id/recommendations?page=1&limit=10
  // 获取推荐列表
  getRecommendations: async (req, res) => {
    try {
      const positionId = parseInt(req.params.id)
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10

      // 检查职位是否存在
      const position = positionStmt.getById(positionId)
      if (!position) {
        return error(res, '职位不存在', 404)
      }

      // 获取推荐列表
      const result = await matchService.getRecommendations(positionId, page, limit)

      success(res, {
        positionId,
        page,
        limit,
        total: result.total,
        passingScore: matchService.PASSING_SCORE,
        list: result.list
      })
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // GET /api/positions/:id/recommendations/status
  // 获取计算状态（用于轮询）
  getRecommendStatus: async (req, res) => {
    try {
      const positionId = parseInt(req.params.id)

      // 查找该职位最新的任务
      let latestTask = null
      for (const [taskId, task] of calculationTasks) {
        if (task.positionId === positionId) {
          if (!latestTask || new Date(task.startTime) > new Date(latestTask.startTime)) {
            latestTask = { taskId, ...task }
          }
        }
      }

      if (!latestTask) {
        // 检查是否有已计算的推荐结果
        const hasRecommendations = jdResumeMatchStmt.getRecommendationCount(positionId, 0) > 0
        
        if (hasRecommendations) {
          return success(res, {
            status: 'completed',
            message: '已有推荐结果',
            progress: 100
          })
        }

        return success(res, {
          status: 'idle',
          message: '尚未开始计算',
          progress: 0
        })
      }

      // 计算进度
      let progress = 0
      if (latestTask.status === 'completed') {
        progress = 100
      } else if (latestTask.status === 'processing') {
        progress = latestTask.totalCount > 0 
          ? Math.round((latestTask.processedCount / latestTask.totalCount) * 100)
          : 0
      }

      success(res, {
        taskId: latestTask.taskId,
        status: latestTask.status,
        message: latestTask.error || getStatusMessage(latestTask.status),
        progress,
        startTime: latestTask.startTime,
        endTime: latestTask.endTime,
        totalCount: latestTask.totalCount
      })
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // POST /api/positions/:id/recommendations/:resumeId/accept
  // 接受推荐（推进入职流程）
  acceptRecommendation: async (req, res) => {
    try {
      const positionId = parseInt(req.params.id)
      const resumeId = parseInt(req.params.resumeId)
      const { note } = req.body || {}

      // 检查职位是否存在
      const position = positionStmt.getById(positionId)
      if (!position) {
        return error(res, '职位不存在', 404)
      }

      // 检查推荐是否存在
      const matchRecord = jdResumeMatchStmt.getByPositionAndResume(positionId, resumeId)
      if (!matchRecord) {
        return error(res, '推荐记录不存在', 404)
      }

      // 检查推荐分数是否达标
      if (matchRecord.match_score < matchService.PASSING_SCORE) {
        return error(res, `推荐分数(${matchRecord.match_score})未达到及格线(${matchService.PASSING_SCORE})`, 400)
      }

      // 创建或获取 position_resume 记录
      let positionResume = positionResumeStmt.getByResumeAndPosition(resumeId, positionId)
      let matchId

      if (!positionResume) {
        // 创建新记录
        const result = positionResumeStmt.insert(resumeId, positionId)
        matchId = result.lastInsertRowid
        positionResume = positionResumeStmt.getById(matchId)
      } else {
        matchId = positionResume.id
      }

      // 更新匹配状态为 accepted
      jdResumeMatchStmt.updateStatus(positionId, resumeId, 'accepted')

      // 更新 position_resume 的评价和匹配分数
      const evaluation = generateEvaluation(matchRecord)
      positionResumeStmt.updateEvaluation(
        matchId,
        evaluation,
        matchRecord.match_score,
        null // questions 暂不设置
      )

      success(res, {
        matchId,
        positionId,
        resumeId,
        status: 'accepted',
        matchScore: matchRecord.match_score,
        message: '已接受推荐，候选人已进入入职流程'
      }, '接受推荐成功')
    } catch (err) {
      error(res, err.message)
    }
  }
}

/**
 * 获取状态描述消息
 * @param {string} status - 状态
 * @returns {string} 消息
 */
function getStatusMessage(status) {
  const messages = {
    'processing': '正在计算推荐结果...',
    'completed': '计算完成',
    'failed': '计算失败',
    'idle': '等待开始'
  }
  return messages[status] || '未知状态'
}

/**
 * 生成评价文本
 * @param {Object} matchRecord - 匹配记录
 * @returns {string} 评价文本
 */
function generateEvaluation(matchRecord) {
  const parts = []
  
  parts.push(`匹配分数: ${matchRecord.match_score}/100`)
  parts.push(`技能匹配: ${matchRecord.skill_score}/100`)
  parts.push(`经验匹配: ${matchRecord.experience_score}/100`)
  parts.push(`学历匹配: ${matchRecord.education_score}/100`)

  if (matchRecord.matched_skills) {
    const matchedSkills = JSON.parse(matchRecord.matched_skills)
    if (matchedSkills.length > 0) {
      parts.push(`匹配技能: ${matchedSkills.join(', ')}`)
    }
  }

  if (matchRecord.missing_skills) {
    const missingSkills = JSON.parse(matchRecord.missing_skills)
    if (missingSkills.length > 0) {
      parts.push(`缺失技能: ${missingSkills.join(', ')}`)
    }
  }

  return parts.join('\n')
}

module.exports = recommendController
