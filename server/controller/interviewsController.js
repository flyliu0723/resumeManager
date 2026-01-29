const { interviewEventStmt } = require('../database')
const { success, error } = require('../utils/response')

const interviewsController = {
  // GET /api/interviews - 获取事件列表（支持筛选）
  getList: (req, res) => {
    try {
      const {
        eventType,
        candidateId,
        positionId,
        startTime,
        endTime,
        limit = 100,
        offset = 0,
        statusFilter,
        searchQuery
      } = req.query

      console.log('========== 获取面试事件列表 ==========')
      console.log('查询参数:', { eventType, candidateId, positionId, startTime, endTime, limit, offset, statusFilter, searchQuery })

      let events = []

      // 根据参数选择查询方式
      if (eventType) {
        events = interviewEventStmt.getByEventType(
          eventType,
          startTime || null,
          endTime || null,
          Number(limit)
        )
      } else if (candidateId) {
        events = interviewEventStmt.getByCandidateId(Number(candidateId), Number(limit))
      } else if (positionId) {
        events = interviewEventStmt.getByPositionId(Number(positionId), Number(limit))
      } else if (startTime && endTime) {
        events = interviewEventStmt.getByTimeRange(startTime, endTime, null)
      } else {
        // 默认查询最近7天的事件
        const end = new Date().toISOString()
        const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        events = interviewEventStmt.getByTimeRange(start, end, null)
      }

      // 前端筛选：状态筛选
      if (statusFilter && statusFilter !== 'all') {
        const statusMap = {
          'ongoing': ['待面试', '面试中', '谈薪中'],
          'completed': ['已成单', '已通过'],
          'rejected': ['已拒绝']
        }
        const allowedStages = statusMap[statusFilter] || []
        events = events.filter(event => allowedStages.includes(event.stage_after))
      }

      // 前端筛选：搜索查询
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        events = events.filter(event => {
          const candidateName = (event.details?.candidateName || '').toLowerCase()
          const positionName = (event.position_name || '').toLowerCase()
          const note = (event.details?.note || '').toLowerCase()
          return candidateName.includes(query) || positionName.includes(query) || note.includes(query)
        })
      }

      // 解析 details JSON
      events = events.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : null
      }))

      console.log(`查询到 ${events.length} 条事件（筛选后）`)
      console.log('=======================================')

      success(res, {
        list: events,
        total: events.length,
        limit: Number(limit),
        offset: Number(offset)
      })
    } catch (err) {
      console.error('获取事件列表失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/interviews/:id - 获取单个事件详情
  getById: (req, res) => {
    try {
      const { id } = req.params
      console.log('========== 获取面试事件详情 ==========')
      console.log('事件ID:', id)

      const event = interviewEventStmt.getById(Number(id))

      if (!event) {
        return error(res, '事件不存在', 404)
      }

      // 解析 details JSON
      if (event.details) {
        event.details = JSON.parse(event.details)
      }

      console.log('查询结果:', event)
      console.log('=======================================')

      success(res, event)
    } catch (err) {
      console.error('获取事件详情失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/interviews/stats/daily - 获取每日统计
  getDailyStats: (req, res) => {
    try {
      const { startTime, endTime, eventType } = req.query

      console.log('========== 获取每日统计 ==========')
      console.log('查询参数:', { startTime, endTime, eventType })

      // 默认查询最近30天
      const end = endTime || new Date().toISOString()
      const start = startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const stats = interviewEventStmt.getDailyStats(start, end, eventType || null)

      console.log(`查询到 ${stats.length} 天的统计数据`)
      console.log('===================================')

      success(res, {
        startTime: start,
        endTime: end,
        eventType: eventType || null,
        stats
      })
    } catch (err) {
      console.error('获取每日统计失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/interviews/stats/types - 获取事件类型统计
  getEventTypeStats: (req, res) => {
    try {
      const { startTime, endTime } = req.query

      console.log('========== 获取事件类型统计 ==========')
      console.log('查询参数:', { startTime, endTime })

      // 默认查询最近30天
      const end = endTime || new Date().toISOString()
      const start = startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const stats = interviewEventStmt.getEventTypeStats(start, end)

      console.log(`查询到 ${stats.length} 种事件类型`)
      console.log('=======================================')

      success(res, {
        startTime: start,
        endTime: end,
        stats
      })
    } catch (err) {
      console.error('获取事件类型统计失败:', err)
      error(res, err.message)
    }
  },

  // POST /api/interviews - 手动创建事件（用于测试或特殊场景）
  create: (req, res) => {
    try {
      const {
        eventType,
        candidateId,
        positionId,
        eventTime,
        stageBefore,
        stageAfter,
        durationSeconds,
        details,
        metricValue,
        source
      } = req.body

      console.log('========== 创建面试事件 ==========')
      console.log('事件数据:', {
        eventType,
        candidateId,
        positionId,
        stageBefore,
        stageAfter
      })

      if (!eventType) {
        return error(res, '缺少 eventType 参数', 400)
      }

      const result = interviewEventStmt.insert(eventType, candidateId, positionId, {
        eventTime,
        stageBefore,
        stageAfter,
        durationSeconds,
        details,
        metricValue,
        source: source || 'manual'
      })

      console.log('事件创建成功，ID:', result.lastInsertRowid)
      console.log('===================================')

      success(res, { id: result.lastInsertRowid }, '事件创建成功')
    } catch (err) {
      console.error('创建事件失败:', err)
      error(res, err.message)
    }
  }
}

module.exports = interviewsController
