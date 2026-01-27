const { positionResumeStmt, flowLogStmt } = require('../database')
const { success, error } = require('../utils/response')

const interviewFlowController = {
  getCandidates: (req, res) => {
    try {
      const { positionId, status } = req.query
      
      console.log('========== getCandidates ==========')
      console.log('请求参数:', { positionId, status })
      
      let sql = `
        SELECT DISTINCT pr.*, r.name as resume_name, r.candidate_name, r.parsed_data, r.content, r.file_path, r.type,
               p.name as position_name, p.company as position_company
        FROM position_resumes pr
        JOIN resumes r ON pr.resume_id = r.id
        JOIN positions p ON pr.position_id = p.id
        JOIN position_resume_flow_logs fl ON pr.id = fl.match_id
        WHERE fl.to_status = '待面试'
      `
      
      const params = []
      
      if (positionId !== undefined && positionId !== 'all') {
        sql += ' AND pr.position_id = ?'
        params.push(Number(positionId))
      }
      
      if (status && status !== 'all') {
        if (status === 'ongoing') {
          sql += " AND pr.current_status IN ('待沟通', '待面试', '面试中', '谈薪中')"
        } else if (status === 'completed') {
          sql += " AND pr.current_status IN ('已通过', '已成单')"
        } else if (status === 'rejected') {
          sql += " AND pr.current_status = '已拒绝'"
        }
      }
      
      sql += ' ORDER BY pr.flow_start_at DESC, pr.matched_at DESC'
      
      console.log('最终 SQL:', sql)
      console.log('查询参数:', params)
      
      const candidates = positionResumeStmt.all(sql, params)
      
      console.log('查询到的候选人数量:', candidates.length)
      console.log('候选人列表:')
      candidates.forEach((c, index) => {
        console.log(`  ${index + 1}. ID: ${c.id}, 姓名: ${c.candidate_name}, 当前状态: ${c.current_status}, 职位: ${c.position_name}`)
      })
      console.log('====================================')
      
      // 批量获取所有候选人的日志，避免N+1查询
      const matchIds = candidates.map(c => c.id)
      const allLogs = matchIds.length > 0 
        ? positionResumeStmt.all(
            `SELECT * FROM position_resume_flow_logs WHERE match_id IN (${matchIds.map(() => '?').join(',')}) ORDER BY match_id, created_at ASC`,
            matchIds
          )
        : []
      
      console.log('获取到的日志数量:', allLogs.length)
      
      // 创建日志映射，方便快速查找
      const logsMap = {}
      allLogs.forEach(log => {
        if (!logsMap[log.match_id]) {
          logsMap[log.match_id] = []
        }
        logsMap[log.match_id].push(log)
      })
      
      // 为每个候选人计算在当前阶段的天数
      const candidatesWithDays = candidates.map(candidate => {
        const logs = logsMap[candidate.id] || []
        const daysInStage = calculateDaysInStage(candidate, logs)
        
        // 确定状态和风险点
        const { status1, status2, attention } = determineStatusAndAttention(candidate, daysInStage, logs)
        
        return {
          ...candidate,
          daysInStage: `${daysInStage}d`,
          status1,
          status2,
          attention,
          avatarText: candidate.candidate_name ? candidate.candidate_name.charAt(0).toUpperCase() : '?',
          avatarColor: getAvatarColor(candidate.current_status)
        }
      })
      
      success(res, candidatesWithDays)
    } catch (err) {
      console.error('getCandidates 错误:', err)
      error(res, err.message)
    }
  },

  getOverview: (req, res) => {
    try {
      const { positionId } = req.query
      
      console.log('========== getOverview ==========')
      console.log('请求参数:', { positionId })
      
      let sql = `
        SELECT 
          COUNT(DISTINCT pr.id) as total,
          SUM(CASE WHEN pr.current_status IN ('待沟通', '待面试', '面试中', '谈薪中') THEN 1 ELSE 0 END) as active,
          AVG(CASE 
            WHEN pr.flow_start_at IS NOT NULL THEN 
              (julianday('now') - julianday(pr.flow_start_at))
            ELSE 
              (julianday('now') - julianday(pr.matched_at))
          END) as avg_days
        FROM position_resumes pr
        JOIN position_resume_flow_logs fl ON pr.id = fl.match_id
        WHERE fl.to_status = '待面试'
      `
      
      const params = []
      
      if (positionId !== undefined && positionId !== 'all') {
        sql += ' AND pr.position_id = ?'
        params.push(Number(positionId))
      }
      
      console.log('最终 SQL:', sql)
      console.log('查询参数:', params)
      
      const result = positionResumeStmt.get(sql, params)
      
      console.log('查询结果:', result)
      
      const overview = {
        total: result.total || 0,
        active: result.active || 0,
        averageDaysInProcess: Math.round(result.avg_days || 0)
      }
      
      console.log('概览数据:', overview)
      console.log('====================================')
      
      success(res, overview)
    } catch (err) {
      console.error('getOverview 错误:', err)
      error(res, err.message)
    }
  },

  getRiskFactors: (req, res) => {
    try {
      const { positionId } = req.query
      
      console.log('========== getRiskFactors ==========')
      console.log('请求参数:', { positionId })
      
      // 获取所有曾经进入过"待面试"阶段的候选人
      let sql = `
        SELECT DISTINCT pr.*, r.name as resume_name, r.candidate_name, r.parsed_data,
               p.name as position_name, p.company as position_company
        FROM position_resumes pr
        JOIN resumes r ON pr.resume_id = r.id
        JOIN positions p ON pr.position_id = p.id
        JOIN position_resume_flow_logs fl ON pr.id = fl.match_id
        WHERE fl.to_status = '待面试'
      `
      
      const params = []
      
      if (positionId !== undefined && positionId !== 'all') {
        sql += ' AND pr.position_id = ?'
        params.push(Number(positionId))
      }
      
      console.log('最终 SQL:', sql)
      console.log('查询参数:', params)
      
      const candidates = positionResumeStmt.all(sql, params)
      
      console.log('查询到的候选人数量:', candidates.length)
      
      // 分析风险因素
      const riskFactors = analyzeRiskFactors(candidates)
      
      console.log('分析出的风险因素:', riskFactors)
      console.log('====================================')
      
      success(res, riskFactors)
    } catch (err) {
      console.error('getRiskFactors 错误:', err)
      error(res, err.message)
    }
  },

  getTimeline: (req, res) => {
    try {
      const { positionId, statusFilter } = req.query
      
      console.log('========== getTimeline ==========')
      console.log('请求参数:', { positionId, statusFilter })
      
      let sql = `
        SELECT fl.*, pr.current_status, r.candidate_name, p.name as position_name
        FROM position_resume_flow_logs fl
        JOIN position_resumes pr ON fl.match_id = pr.id
        JOIN resumes r ON pr.resume_id = r.id
        JOIN positions p ON pr.position_id = p.id
        WHERE pr.id IN (
          SELECT DISTINCT fl2.match_id 
          FROM position_resume_flow_logs fl2 
          WHERE fl2.to_status = '待面试'
        )
      `
      
      const params = []
      
      if (positionId !== undefined && positionId !== 'all') {
        sql += ' AND pr.position_id = ?'
        params.push(Number(positionId))
      }
      
      sql += ' ORDER BY fl.created_at DESC LIMIT 50'
      
      console.log('最终 SQL:', sql)
      console.log('查询参数:', params)
      
      const events = positionResumeStmt.all(sql, params)
      
      console.log('查询到的事件数量:', events.length)
      
      // 格式化事件
      const timelineEvents = events.map(event => {
        const date = formatDate(event.created_at)
        let description = ''
        
        if (event.note) {
          description = event.note
        } else {
          description = `状态从 ${event.from_status || '未知'} 变更为 ${event.to_status}`
        }
        
        return {
          id: event.id,
          date,
          type: event.to_status,
          description,
          candidateName: event.candidate_name,
          positionName: event.position_name
        }
      })
      
      console.log('格式化后的事件数量:', timelineEvents.length)
      console.log('====================================')
      
      success(res, timelineEvents)
    } catch (err) {
      console.error('getTimeline 错误:', err)
      error(res, err.message)
    }
  },

  getDashboardStats: (req, res) => {
    try {
      const { positionId } = req.query
      
      console.log('========== getDashboardStats ==========')
      console.log('请求参数:', { positionId })
      
      let sql = `
        SELECT 
          COUNT(CASE WHEN current_status = '待面试' THEN 1 ELSE NULL END) as interviewPending,
          COUNT(CASE WHEN current_status = '面试中' THEN 1 ELSE NULL END) as interviewing,
          COUNT(CASE WHEN current_status = '谈薪中' THEN 1 ELSE NULL END) as salaryNegotiation,
          COUNT(CASE WHEN current_status = '已成单' THEN 1 ELSE NULL END) as completed,
          COUNT(*) as total
        FROM position_resumes pr
        WHERE 1=1
      `
      
      const params = []

      if (positionId !== undefined && positionId !== 'all') {
        sql += ' AND pr.position_id = ?'
        params.push(Number(positionId))
      }
      
      console.log('最终 SQL:', sql)
      console.log('查询参数:', params)
      
      const result = positionResumeStmt.get(sql, params)
      
      console.log('查询结果:', result)
      
      const stats = {
        interviewPending: result.interviewPending || 0,
        interviewing: result.interviewing || 0,
        salaryNegotiation: result.salaryNegotiation || 0,
        completed: result.completed || 0,
        total: result.total || 0
      }
      
      console.log('看板统计数据:', stats)
      console.log('====================================')
      
      success(res, stats)
    } catch (err) {
      console.error('getDashboardStats 错误:', err)
      error(res, err.message)
    }
  },

  getCandidatesByStatus: (req, res) => {
    try {
      const { positionId, status } = req.query

      console.log('========== getCandidatesByStatus ==========')
      console.log('请求参数:', { positionId, status })

      const validStatuses = ['待面试', '面试中', '谈薪中']
      if (!status || !validStatuses.includes(status)) {
        return error(res, '无效的状态参数')
      }

      let sql = `
        SELECT pr.*, r.name as resume_name, r.candidate_name, r.parsed_data, r.content, r.file_path, r.type,
               p.name as position_name, p.company as position_company
        FROM position_resumes pr
        JOIN resumes r ON pr.resume_id = r.id
        JOIN positions p ON pr.position_id = p.id
        WHERE pr.current_status = ?
      `

      const params = [status]

      if (positionId !== undefined && positionId !== 'all') {
        sql += ' AND pr.position_id = ?'
        params.push(Number(positionId))
      }

      sql += ' ORDER BY pr.flow_start_at DESC, pr.matched_at DESC LIMIT 50'

      console.log('最终 SQL:', sql)
      console.log('查询参数:', params)

      const candidates = positionResumeStmt.all(sql, params)

      console.log('查询到的候选人数量:', candidates.length)

      success(res, candidates)
    } catch (err) {
      console.error('getCandidatesByStatus 错误:', err)
      error(res, err.message)
    }
  }
}

// 辅助函数：计算在当前阶段的天数
function calculateDaysInStage(candidate, logs) {
  if (!candidate.flow_start_at) {
    // 如果没有流程开始时间，使用匹配时间
    const matchedAt = new Date(candidate.matched_at)
    return Math.floor((new Date() - matchedAt) / (1000 * 60 * 60 * 24))
  }
  
  // 使用传入的日志数据
  if (!logs || logs.length === 0) {
    const flowStartAt = new Date(candidate.flow_start_at)
    return Math.floor((new Date() - flowStartAt) / (1000 * 60 * 60 * 24))
  }
  
  // 找到最新状态变更的时间
  const latestLog = logs[logs.length - 1]
  const logDate = new Date(latestLog.created_at)
  return Math.floor((new Date() - logDate) / (1000 * 60 * 60 * 24))
}

// 辅助函数：确定状态和关注点
function determineStatusAndAttention(candidate, daysInStage, logs) {
  const status = candidate.current_status || candidate.status || '未知'
  let status1 = 'Stable'
  let status2 = ''
  let attention = '—'
  
  // 根据状态和天数确定风险级别
  if (status === '待沟通') {
    if (daysInStage > 7) {
      status1 = 'At Risk'
      status2 = '长时间未沟通'
      attention = '长时间未沟通'
    } else if (daysInStage > 3) {
      status1 = 'Waiting'
      status2 = '等待联系'
      attention = '等待联系'
    } else {
      status1 = 'Stable'
      status2 = '新候选人'
      attention = '新候选人'
    }
  } else if (status === '待面试') {
    if (daysInStage > 14) {
      status1 = 'Stalling'
      status2 = '面试安排延迟'
      attention = '面试安排延迟'
    } else if (daysInStage > 7) {
      status1 = 'At Risk'
      status2 = '面试安排中'
      attention = '面试安排中'
    } else {
      status1 = 'Stable'
      status2 = '等待面试'
      attention = '等待面试'
    }
  } else if (status === '面试中') {
    if (daysInStage > 21) {
      status1 = 'Stalling'
      status2 = '面试周期过长'
      attention = '面试周期过长'
    } else if (daysInStage > 14) {
      status1 = 'At Risk'
      status2 = '面试周期较长'
      attention = '面试周期较长'
    } else {
      status1 = 'Stable'
      status2 = '面试进行中'
      attention = '面试进行中'
    }
  }
  
  // 检查是否有特殊关注点
  if (candidate.evaluation) {
    try {
      const evaluation = JSON.parse(candidate.evaluation)
      if (evaluation.uncertain && evaluation.uncertain.length > 0) {
        status1 = 'At Risk'
        status2 = '项目深度不明确'
        attention = '项目深度不明确'
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  
  return { status1, status2, attention }
}

// 辅助函数：分析风险因素
function analyzeRiskFactors(candidates) {
  console.log('--- 开始分析风险因素 ---')
  console.log('待分析的候选人数量:', candidates.length)
  
  const riskFactors = []
  
  // 批量获取所有候选人的日志
  const matchIds = candidates.map(c => c.id)
  const allLogs = matchIds.length > 0 
    ? positionResumeStmt.all(
        `SELECT * FROM position_resume_flow_logs WHERE match_id IN (${matchIds.map(() => '?').join(',')}) ORDER BY match_id, created_at ASC`,
        matchIds
      )
    : []
  
  console.log('获取到的日志数量:', allLogs.length)
  
  // 创建日志映射
  const logsMap = {}
  allLogs.forEach(log => {
    if (!logsMap[log.match_id]) {
      logsMap[log.match_id] = []
    }
    logsMap[log.match_id].push(log)
  })
  
  // 检查项目深度不明确的风险
  const projectDepthUnclear = candidates.filter(c => {
    if (c.evaluation) {
      try {
        const evaluation = JSON.parse(c.evaluation)
        return evaluation.uncertain && evaluation.uncertain.length > 0
      } catch (e) {
        return false
      }
    }
    return false
  })
  
  console.log('项目深度不明确的候选人数量:', projectDepthUnclear.length)
  
  if (projectDepthUnclear.length > 0) {
    riskFactors.push(`${projectDepthUnclear.length} 位候选人项目深度不明确`)
  }
  
  // 检查长时间未更新的候选人
  const longTimeNoUpdate = candidates.filter(c => {
    const logs = logsMap[c.id] || []
    const daysInStage = calculateDaysInStage(c, logs)
    return daysInStage > 14
  })
  
  console.log('超过14天未更新的候选人数量:', longTimeNoUpdate.length)
  
  if (longTimeNoUpdate.length > 0) {
    riskFactors.push(`${longTimeNoUpdate.length} 位候选人超过14天未更新状态`)
  }
  
  // 检查面试延迟
  const interviewDelay = candidates.filter(c => {
    const logs = logsMap[c.id] || []
    return c.current_status === '待面试' && calculateDaysInStage(c, logs) > 7
  })
  
  console.log('面试安排延迟的候选人数量:', interviewDelay.length)
  
  if (interviewDelay.length > 0) {
    riskFactors.push(`${interviewDelay.length} 位候选人面试安排延迟`)
  }
  
  // 检查整体面试周期
  const longInterviewCycle = candidates.filter(c => {
    const logs = logsMap[c.id] || []
    return c.current_status === '面试中' && calculateDaysInStage(c, logs) > 21
  })
  
  console.log('面试周期过长的候选人数量:', longInterviewCycle.length)
  
  if (longInterviewCycle.length > 0) {
    riskFactors.push(`${longInterviewCycle.length} 位候选人面试周期过长`)
  }
  
  // 如果没有发现风险因素，返回默认提示
  if (riskFactors.length === 0) {
    riskFactors.push('当前无明显风险因素')
  }
  
  console.log('最终风险因素列表:', riskFactors)
  console.log('--- 风险因素分析完成 ---')
  
  return riskFactors
}

// 辅助函数：格式化日期
function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '1天前'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks}周前`
  } else {
    const months = Math.floor(diffDays / 30)
    return `${months}个月前`
  }
}

// 辅助函数：获取头像颜色
function getAvatarColor(status) {
  const colors = {
    '待沟通': '#e6a23c',
    '待面试': '#409eff',
    '面试中': '#67c23a',
    '谈薪中': '#fa8c16',
    '已通过': '#67c23a',
    '已成单': '#52c41a',
    '已拒绝': '#f56c6c',
    '未解析': '#909399',
    '已解析': '#409eff'
  }
  return colors[status] || '#667eea'
}

module.exports = interviewFlowController
