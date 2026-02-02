/**
 * Dashboard 数据 API Controller
 * 支持新状态系统的统计数据
 */

const { 
  positionResumeStmt,
  interviewRejectionStmt,
  interviewEventStmt
} = require('../database')
const { success, error } = require('../utils/response')

const dashboardController = {
  
  // 获取新状态系统的统计数据
  getStats: (req, res) => {
    try {
      // 使用新字段 main_status 和 sub_status 查询
      const allMatches = positionResumeStmt.getAll()
      
      const stats = {
        // 简历筛选阶段
        resumeScreening: 0,
        pendingReview: 0,
        
        // 面试中阶段
        interviewing: 0,
        roundPending: 0,
        roundScheduled: 0,
        
        // 谈薪中阶段
        salaryNegotiation: 0,
        approvalPending: 0,
        
        // 已成单阶段
        closed: 0,
        onboarded: 0,
        pendingOnboard: 0,
        
        // 不合适阶段
        rejected: 0,
        rejectedThisMonth: 0
      }
      
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()
      
      for (const match of allMatches) {
        // 统计各主状态
        switch (match.main_status) {
          case 'resume_screening':
            stats.resumeScreening++
            if (match.sub_status === 'pending_review') stats.pendingReview++
            break
          case 'interviewing':
            stats.interviewing++
            if (match.sub_status === 'round_pending') stats.roundPending++
            if (match.sub_status === 'round_scheduled') stats.roundScheduled++
            break
          case 'salary_negotiation':
            stats.salaryNegotiation++
            if (match.sub_status === 'approval_pending') stats.approvalPending++
            break
          case 'closed':
            stats.closed++
            if (match.sub_status === 'onboarded') stats.onboarded++
            if (match.sub_status === 'pending_onboard') stats.pendingOnboard++
            break
          case 'rejected':
            stats.rejected++
            // 检查是否本月
            const rejectedDate = new Date(match.update_time || match.matched_at)
            if (rejectedDate.getMonth() === thisMonth && rejectedDate.getFullYear() === thisYear) {
              stats.rejectedThisMonth++
            }
            break
        }
      }
      
      success(res, stats)
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // 获取漏斗数据（各阶段候选人列表）
  getFunnelData: (req, res) => {
    try {
      const { limit = 5 } = req.query
      
      const stages = ['resume_screening', 'interviewing', 'salary_negotiation', 'closed', 'rejected']
      const funnelData = {}
      
      for (const stage of stages) {
        const matches = positionResumeStmt.all(
          `SELECT pr.*, r.candidate_name, p.name as position_name, 
                  r.initials, r.avatar_color
           FROM position_resumes pr
           JOIN resumes r ON pr.resume_id = r.id
           JOIN positions p ON pr.position_id = p.id
           WHERE pr.main_status = ?
           ORDER BY pr.update_time DESC
           LIMIT ?`,
          [stage, Number(limit)]
        )
        
        funnelData[stage] = matches.map(m => ({
          id: m.id,
          candidateName: m.candidate_name,
          positionTitle: m.position_name,
          mainStatus: m.main_status,
          subStatus: m.sub_status,
          interviewRound: m.interview_round,
          initials: m.initials || m.candidate_name?.charAt(0) || '?',
          avatarColor: m.avatar_color || '#409EFF',
          daysInStage: m.flow_start_at 
            ? Math.floor((Date.now() - new Date(m.flow_start_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0
        }))
      }
      
      success(res, funnelData)
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // 获取漏斗指标
  getFunnelMetrics: (req, res) => {
    try {
      const allMatches = positionResumeStmt.getAll()
      
      const total = allMatches.length
      const closed = allMatches.filter(m => m.main_status === 'closed').length
      const rejected = allMatches.filter(m => m.main_status === 'rejected').length
      
      // 计算平均周期（从简历投递到当前状态的天数）
      let totalDays = 0
      let countWithDays = 0
      
      for (const match of allMatches) {
        if (match.flow_start_at) {
          const days = Math.floor((Date.now() - new Date(match.matched_at).getTime()) / (1000 * 60 * 60 * 24))
          totalDays += days
          countWithDays++
        }
      }
      
      const metrics = {
        conversionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
        avgDays: countWithDays > 0 ? Math.round(totalDays / countWithDays) : 0,
        dropOffRate: total > 0 ? Math.round((rejected / total) * 100) : 0
      }
      
      success(res, metrics)
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // 获取岗位热度数据
  getHeatData: (req, res) => {
    try {
      console.log('【岗位热度后端】开始查询数据...')
      
      // 按职位统计各阶段人数
      const data = positionResumeStmt.all(`
        SELECT 
          p.name as position_name,
          pr.main_status,
          COUNT(*) as count
        FROM position_resumes pr
        JOIN positions p ON pr.position_id = p.id
        GROUP BY p.id, pr.main_status
        ORDER BY p.name
      `)
      
      console.log('【岗位热度后端】原始SQL查询结果条数:', data.length)
      console.log('【岗位热度后端】原始数据样例:', data.slice(0, 5))
      
      // 组织成堆叠柱状图数据
      const positions = [...new Set(data.map(d => d.position_name))]
      console.log('【岗位热度后端】职位列表:', positions)
      
      const result = positions.map(pos => {
        const posData = data.filter(d => d.position_name === pos)
        return {
          name: pos,
          bars: [
            { type: '简历筛选', count: posData.find(d => d.main_status === 'resume_screening')?.count || 0 },
            { type: '面试中', count: posData.find(d => d.main_status === 'interviewing')?.count || 0 },
            { type: '谈薪中', count: posData.find(d => d.main_status === 'salary_negotiation')?.count || 0 },
            { type: '已成单', count: posData.find(d => d.main_status === 'closed')?.count || 0 }
          ]
        }
      })
      
      console.log('【岗位热度后端】返回结果:', result)
      success(res, result)
    } catch (err) {
      console.error('【岗位热度后端】错误:', err)
      error(res, err.message)
    }
  },
  
  // 获取来源分布数据
  getSourceData: (req, res) => {
    try {
      // 从简历表获取来源数据
      const resumes = positionResumeStmt.all(`
        SELECT r.source, COUNT(*) as count
        FROM resumes r
        JOIN position_resumes pr ON r.id = pr.resume_id
        GROUP BY r.source
      `)
      
      const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#8B5CF6', '#10B981']
      
      const result = resumes.map((r, index) => ({
        name: r.source || '其他',
        value: r.count,
        color: colors[index % colors.length]
      }))
      
      success(res, result)
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // 获取趋势数据（近30天）
  getTrendData: (req, res) => {
    try {
      const days = 30
      const result = []
      
      console.log('【趋势数据后端】开始查询近30天数据...')
      
      // 诊断查询：检查resumes表的数据情况
      const stats = positionResumeStmt.get(`
        SELECT 
          MIN(strftime('%Y-%m-%d', created_at)) as earliest_date,
          MAX(strftime('%Y-%m-%d', created_at)) as latest_date,
          COUNT(*) as total_count
        FROM resumes
      `)
      console.log('【趋势数据后端】诊断：resumes表统计', stats)
      
      // 计算查询的日期范围
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))
      const dateRange = {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
      console.log('【趋势数据后端】诊断：查询日期范围', dateRange)
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        // 查询当天新增简历数（根据resumes表的创建时间）
        // 使用 strftime 替代 date 函数，更精确地匹配日期
        const newResumes = positionResumeStmt.all(`
          SELECT COUNT(*) as count
          FROM resumes
          WHERE strftime('%Y-%m-%d', created_at) = ?
        `, [dateStr])
        
        // 查询当天安排面试数（根据流程日志中面试安排状态变更）
        // 注意：从flow_logs表查询进入interviewing阶段的记录
        const newInterviews = positionResumeStmt.all(`
          SELECT COUNT(*) as count
          FROM position_resume_flow_logs
          WHERE strftime('%Y-%m-%d', created_at) = ?
          AND (main_status_to = 'interviewing' OR to_status LIKE '%面试%')
        `, [dateStr])
        
        // 调试：打印前几天的查询结果
        if (i >= days - 3) {
          console.log(`【趋势数据后端】${dateStr}: 简历${newResumes[0]?.count || 0}, 面试${newInterviews[0]?.count || 0}`)
        }
        
        result.push({
          date: dateStr,
          newResumes: newResumes[0]?.count || 0,
          newInterviews: newInterviews[0]?.count || 0
        })
      }
      
      // 计算总和用于调试
      const totalResumes = result.reduce((sum, item) => sum + item.newResumes, 0)
      const totalInterviews = result.reduce((sum, item) => sum + item.newInterviews, 0)
      console.log(`【趋势数据后端】查询完成，30天共新增简历${totalResumes}份，面试${totalInterviews}场`)
      console.log('【趋势数据后端】返回数据样例:', result.slice(0, 3))
      
      success(res, result)
    } catch (err) {
      console.error('【趋势数据后端】错误:', err)
      error(res, err.message)
    }
  },
  
  // 获取操作动态
  getActivities: (req, res) => {
    try {
      const { limit = 10 } = req.query
      
      // 获取最近的流程日志
      const logs = positionResumeStmt.all(`
        SELECT 
          fl.*,
          r.candidate_name,
          '系统' as operator_name,
          '#409EFF' as operator_color
        FROM position_resume_flow_logs fl
        JOIN position_resumes pr ON fl.match_id = pr.id
        JOIN resumes r ON pr.resume_id = r.id
        ORDER BY fl.created_at DESC
        LIMIT ?
      `, [Number(limit)])
      
      const activities = logs.map(log => {
        return {
          id: log.id,
          created_at: log.created_at,
          operator_name: log.operator_name,
          operator_color: log.operator_color,
          action_type: log.action_type || 'status_change',
          action_description: `${log.candidate_name} - ${getStatusChangeDescription(log)}`,
          from_status: log.from_status,
          to_status: log.to_status,
          main_status_from: log.main_status_from,
          main_status_to: log.main_status_to,
          sub_status_from: log.sub_status_from,
          sub_status_to: log.sub_status_to
        }
      })
      
      success(res, activities)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 根据主状态获取候选人列表（用于流程看板）
  getCandidatesByMainStatus: (req, res) => {
    try {
      const { mainStatus, excludeTerminal = 'false' } = req.query
      
      if (!mainStatus) {
        return error(res, '请提供主状态参数 mainStatus', 400)
      }
      
      let sql = `
        SELECT 
          pr.*,
          r.candidate_name,
          r.name as resume_name,
          r.parsed_data,
          p.name as position_name,
          p.company as position_company,
          p.id as position_id
        FROM position_resumes pr
        JOIN resumes r ON pr.resume_id = r.id
        JOIN positions p ON pr.position_id = p.id
        WHERE pr.main_status = ?
      `
      
      const params = [mainStatus]
      
      sql += ` ORDER BY pr.update_time DESC`
      
      const matches = positionResumeStmt.all(sql, params)
      
      success(res, matches)
    } catch (err) {
      error(res, err.message)
    }
  }
}

// 辅助函数：生成状态变更描述（使用新状态系统）
function getStatusChangeDescription(log) {
  const { MAIN_STATUS, SUB_STATUS } = require('../constants/interviewStatus')
  
  // 获取状态标签的辅助函数
  const getStatusLabel = (mainStatus, subStatus) => {
    const main = MAIN_STATUS[mainStatus?.toUpperCase()]
    const sub = SUB_STATUS[mainStatus]?.[subStatus?.toUpperCase()]
    
    if (sub) {
      return `${main?.label || mainStatus}/${sub.label}`
    } else if (main) {
      return main.label
    }
    return subStatus || mainStatus || '未知'
  }
  
  // 获取动作描述的辅助函数
  const getActionDescription = (mainStatus, subStatus) => {
    const sub = SUB_STATUS[mainStatus]?.[subStatus?.toUpperCase()]
    if (sub) {
      return sub.action
    }
    return '状态变更'
  }
  
  // 特殊操作类型
  if (log.action_type === 'reject') {
    const mainTo = log.main_status_to || 'rejected'
    const subTo = log.sub_status_to
    
    if (mainTo === 'resume_screening' && subTo === 'screening_rejected') {
      return '简历筛选未通过'
    } else if (mainTo === 'interviewing' && subTo === 'interview_rejected') {
      return '面试未通过'
    } else if (mainTo === 'salary_negotiation') {
      if (subTo === 'salary_rejected') return '谈薪失败'
      if (subTo === 'offer_rejected') return '候选人拒绝Offer'
    } else if (mainTo === 'closed' && subTo === 'onboard_abandoned') {
      return '放弃入职'
    }
    return '标记为不合适'
  }
  
  if (log.action_type === 'reopen') {
    return '重新打开流程'
  }
  
  // 正常状态流转
  const mainFrom = log.main_status_from
  const mainTo = log.main_status_to
  const subFrom = log.sub_status_from
  const subTo = log.sub_status_to
  
  // 跨主状态流转（阶段推进）
  if (mainFrom && mainTo && mainFrom !== mainTo) {
    const fromLabel = getStatusLabel(mainFrom, subFrom)
    const toLabel = getStatusLabel(mainTo, subTo)
    const action = getActionDescription(mainTo, subTo)
    return `从${fromLabel}进入${toLabel}`
  }
  
  // 同主状态内流转
  if (mainFrom === mainTo && subFrom && subTo) {
    const fromSub = SUB_STATUS[mainFrom]?.[subFrom.toUpperCase()]?.label || subFrom
    const toSub = SUB_STATUS[mainTo]?.[subTo.toUpperCase()]?.label || subTo
    
    // 根据不同阶段返回不同描述
    switch (mainTo) {
      case 'resume_screening':
        if (subTo === 'screening_passed') return '简历筛选通过'
        if (subTo === 'screening_rejected') return '简历筛选未通过'
        return `筛选状态：${fromSub}→${toSub}`
        
      case 'interviewing':
        if (subTo === 'round_pending') return '安排面试'
        if (subTo === 'round_scheduled') return '面试已安排'
        if (subTo === 'round_passed') return '本轮面试通过'
        if (subTo === 'all_rounds_passed') return '所有面试通过'
        if (subTo === 'interview_rejected') return '面试未通过'
        return `面试状态：${fromSub}→${toSub}`
        
      case 'salary_negotiation':
        if (subTo === 'approval_pending') return '提交薪资审批'
        if (subTo === 'offer_sent') return '发送Offer'
        if (subTo === 'offer_accepted') return '候选人接受Offer'
        if (subTo === 'salary_rejected') return '谈薪失败'
        if (subTo === 'offer_rejected') return '候选人拒绝Offer'
        return `谈薪状态：${fromSub}→${toSub}`
        
      case 'closed':
        if (subTo === 'pending_onboard') return '等待入职'
        if (subTo === 'onboarded') return '已入职'
        if (subTo === 'onboard_abandoned') return '放弃入职'
        return `成单状态：${fromSub}→${toSub}`
    }
  }
  
  // 备用：显示完整状态路径
  if (mainTo && subTo) {
    return getStatusLabel(mainTo, subTo)
  }
  
  return '状态变更'
}

module.exports = dashboardController
