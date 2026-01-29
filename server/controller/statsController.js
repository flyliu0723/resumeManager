const { interviewEventStmt, positionStmt, resumeStmt, positionResumeStmt, db } = require('../database')
const { success, error } = require('../utils/response')

const statsController = {
  // GET /api/stats/daily - 今日统计数据
  getDailyStats: (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // 今日数据
      const todayResumes = interviewEventStmt.getByDateRange(`${today}T00:00:00`, `${today}T23:59:59`).filter(e => e.event_type === 'resume_upload').length
      const todayInterviews = interviewEventStmt.getByDateRange(`${today}T00:00:00`, `${today}T23:59:59`).filter(e => e.event_type === 'interview_scheduled').length
      const todayOffers = interviewEventStmt.getByDateRange(`${today}T00:00:00`, `${today}T23:59:59`).filter(e => e.event_type === 'offer_accepted').length

      // 昨日数据
      const yesterdayResumes = interviewEventStmt.getByDateRange(`${yesterday}T00:00:00`, `${yesterday}T23:59:59`).filter(e => e.event_type === 'resume_upload').length
      const yesterdayInterviews = interviewEventStmt.getByDateRange(`${yesterday}T00:00:00`, `${yesterday}T23:59:59`).filter(e => e.event_type === 'interview_scheduled').length
      const yesterdayOffers = interviewEventStmt.getByDateRange(`${yesterday}T00:00:00`, `${yesterday}T23:59:59`).filter(e => e.event_type === 'offer_accepted').length

      // 计算环比增长
      const resumeGrowth = yesterdayResumes > 0 ? Math.round((todayResumes - yesterdayResumes) / yesterdayResumes * 100) : 0
      const interviewGrowth = yesterdayInterviews > 0 ? Math.round((todayInterviews - yesterdayInterviews) / yesterdayInterviews * 100) : 0
      const offerGrowth = yesterdayOffers > 0 ? Math.round((todayOffers - yesterdayOffers) / yesterdayOffers * 100) : 0

      const data = {
        resumes: {
          value: todayResumes,
          change: resumeGrowth
        },
        interviews: {
          value: todayInterviews,
          change: interviewGrowth
        },
        offers: {
          value: todayOffers,
          change: offerGrowth
        }
      }

      success(res, data)
    } catch (err) {
      console.error('获取今日统计数据失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/stats/heat - 职位热度统计
  getHeatStats: (req, res) => {
    try {
      const positions = positionStmt.getAll()
      const heatData = positions.map(position => {
        const events = interviewEventStmt.getByPositionId(position.id, 1000)
        const resumeCount = events.filter(e => e.event_type === 'resume_upload').length
        const interviewCount = events.filter(e => e.event_type === 'interview_scheduled').length
        const offerCount = events.filter(e => e.event_type === 'offer_accepted').length

        return {
          positionId: position.id,
          positionName: position.name,
          total: resumeCount + interviewCount + offerCount,
          breakdown: [
            { type: 'resume', count: resumeCount, color: '#409EFF', name: '简历' },
            { type: 'interview', count: interviewCount, color: '#E6A23C', name: '面试' },
            { type: 'offer', count: offerCount, color: '#67C23A', name: 'Offer' }
          ]
        }
      })

      // 按热度排序
      heatData.sort((a, b) => b.total - a.total)

      success(res, heatData)
    } catch (err) {
      console.error('获取职位热度数据失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/stats/source - 简历来源分布
  getSourceStats: (req, res) => {
    try {
      // 使用 resumeStmt.getAll() 来获取所有简历数据
      const resumes = resumeStmt.getAll()
      const sourceMap = {
        'boss': 0,
        'lagou': 0,
        'liepin': 0,
        'recruiter': 0,
        'other': 0
      }

      // 统计各来源数量
      resumes.forEach(resume => {
        const source = resume.source || 'other'
        if (sourceMap[source] !== undefined) {
          sourceMap[source]++
        } else {
          sourceMap.other++
        }
      })

      const sourceData = [
        { name: 'BOSS直聘', value: sourceMap.boss, color: '#409EFF' },
        { name: '拉勾网', value: sourceMap.lagou, color: '#67C23A' },
        { name: '猎聘网', value: sourceMap.liepin, color: '#E6A23C' },
        { name: '猎头推荐', value: sourceMap.recruiter, color: '#909399' },
        { name: '其他渠道', value: sourceMap.other, color: '#F56C6C' }
      ]

      success(res, sourceData)
    } catch (err) {
      console.error('获取简历来源数据失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/stats/trend - 近30天趋势数据
  getTrendStats: (req, res) => {
    try {
      const today = new Date()
      const startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
      const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00'
      const endDateStr = today.toISOString().split('T')[0] + 'T23:59:59'
      
      // 从数据库获取近30天的面试事件数据
      const dailyStats = interviewEventStmt.getDailyStats(startDateStr, endDateStr, 'interview_scheduled')
      
      // 构建趋势数据
      const trendData = []
      const statsMap = {}
      
      // 将数据库返回的数据转换为映射
      dailyStats.forEach(stat => {
        statsMap[stat.date] = stat.count
      })
      
      // 生成近30天的数据，确保每天都有记录
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        
        trendData.push({
          date: dateStr,
          count: statsMap[dateStr] || 0
        })
      }

      success(res, trendData)
    } catch (err) {
      console.error('获取趋势数据失败:', err)
      error(res, err.message)
    }
  },

  // GET /api/stats/funnel - 招聘漏斗数据
  getFunnelStats: (req, res) => {
    try {
      // 从数据库获取所有候选人数据
      const allMatches = positionResumeStmt.getAll()
      
      // 按状态分类候选人
      const initial = []
      const second = []
      const final = []
      
      allMatches.forEach(match => {
        // 构建候选人对象
        const candidate = {
          id: match.id,
          name: match.candidate_name || '未知候选人',
          position: match.position_name || '未知职位',
          status: match.current_status || '待沟通'
        }
        
        // 根据状态分类
        const status = match.current_status || match.status
        if (['待沟通', '简历筛选', '待面试'].includes(status)) {
          initial.push(candidate)
        } else if (['面试中', '复试'].includes(status)) {
          second.push(candidate)
        } else if (['已通过', '已录用', 'Offer已接受'].includes(status)) {
          final.push(candidate)
        }
      })
      
      // 使用真实数据，不使用默认数据
      const funnelData = {
        initial: initial,
        second: second,
        final: final
      }

      success(res, funnelData)
    } catch (err) {
      console.error('获取漏斗数据失败:', err)
      error(res, err.message)
    }
  },



  // GET /api/activities - 实时动态流数据
  getActivities: (req, res) => {
    try {
      const events = interviewEventStmt.getAll()
      
      // 转换为动态流格式
      const activities = events.map(event => ({
        time: event.event_time.substring(11, 19), // 提取时间部分
        avatar: event.details ? event.details.substring(0, 1) : '系',
        avatarColor: getRandomColor(),
        action: getActionText(event),
        icon: getActionIcon(event.event_type)
      }))

      // 按时间排序，最新的在前
      activities.sort((a, b) => b.time.localeCompare(a.time))

      success(res, activities)
    } catch (err) {
      console.error('获取动态流数据失败:', err)
      error(res, err.message)
    }
  }
}

// 辅助函数：获取随机颜色
function getRandomColor() {
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#909399', '#F56C6C']
  return colors[Math.floor(Math.random() * colors.length)]
}

// 辅助函数：生成动作文本
function getActionText(event) {
  // 从事件数据中提取信息
  const positionName = event.position_name || '未知职位'
  let candidateName = '未知候选人'
  let interviewTime = ''
  
  // 尝试从 details 字段中提取更多信息
  if (event.details) {
    try {
      const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details
      candidateName = details.name || details.candidate_name || details.candidateName || candidateName
      interviewTime = details.interview_time || details.time || details.nextInterviewAt || ''
    } catch (e) {
      // 如果 details 不是有效 JSON，使用默认值
    }
  }
  
  // 根据事件类型生成详细文本
  const actionMap = {
    'resume_upload': `我上传了${positionName}职位的简历，候选人${candidateName}`,
    'interview_scheduled': interviewTime 
      ? `我安排了${candidateName}面试${positionName}，时间是${interviewTime}` 
      : `我安排了${positionName}面试`,
    'interview_completed': `我完成了${positionName}面试，候选人${candidateName}`,
    'offer_accepted': `我为${candidateName}创建了${positionName}的入职offer`,
    'status_change': `我更新了${positionName}候选人${candidateName}的状态`,
    'interview_started': `${positionName}面试，候选人${candidateName}`
  }
  
  return actionMap[event.event_type] || '我执行了操作'
}

// 辅助函数：获取动作图标
function getActionIcon(eventType) {
  const iconMap = {
    'resume_upload': 'Document',
    'interview_scheduled': 'Clock',
    'interview_completed': 'Check',
    'offer_accepted': 'Trophy',
    'status_change': 'ArrowRight'
  }
  return iconMap[eventType] || 'Information'
}

module.exports = statsController
