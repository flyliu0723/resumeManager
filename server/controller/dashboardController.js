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
const { isClosed, isOnboarded, getConversionNumerator, getConversionDenominator } = require('../config/dashboard')

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
      const { StatusUtils } = require('../constants/interviewStatus')
      
      const stages = ['resume_screening', 'interviewing', 'salary_negotiation', 'closed', 'rejected']
      const funnelData = {}
      
       // 先获取所有候选人数据
        const allMatches = positionResumeStmt.all(
           `SELECT 
             pr.id, pr.resume_id, pr.position_id, pr.evaluation, pr.match_score, 
             pr.questions, pr.status, pr.matched_at, pr.current_status, pr.jd_supplement,
             pr.flow_start_at, pr.update_time, pr.next_interview_at, pr.main_status, 
             pr.sub_status, pr.interview_round, pr.current_round_id,
             r.candidate_name, r.name as resume_name, p.name as position_name,
             substr(r.candidate_name, 1, 1) as initials
             FROM position_resumes pr
             JOIN resumes r ON pr.resume_id = r.id
             JOIN positions p ON pr.position_id = p.id
             ORDER BY pr.update_time DESC`
         )

        for (const stage of stages) {
          // 根据主状态和子状态正确分类
          let filteredMatches = allMatches.filter(m => {
            const isTerminal = StatusUtils.isTerminalStatus(m.main_status, m.sub_status)

             if (stage === 'rejected') {
               // 已结束阶段：包含所有子状态为终态的记录（无论主状态）
               // 排除已成功入职的（closed/onboarded）和待入职的（pending_onboard是进行中）
               return isTerminal && !isClosed(m)
             } else if (stage === 'closed') {
               // 已成单阶段：包含待入职和已入职（根据配置）
               return isClosed(m)
             } else {
              // 进行中阶段：主状态匹配且子状态不是终态
              return m.main_status === stage && !isTerminal
            }
          }).slice(0, Number(limit))

          funnelData[stage] = filteredMatches.map(m => ({
            id: m.id,
            candidateName: m.candidate_name,
            positionTitle: m.position_name,
            mainStatus: m.main_status,
            subStatus: m.sub_status,
            interviewRound: m.interview_round,
            initials: m.candidate_name?.charAt(0) || '?',
            avatarColor: '#409EFF',
           daysInStage: m.flow_start_at
             ? Math.floor((Date.now() - new Date(m.flow_start_at).getTime()) / (1000 * 60 * 60 * 24))
             : 0
         }))
       }

        success(res, funnelData)
     } catch (err) {
       console.error('【看板漏斗】错误:', err)
       error(res, err.message)
     }
   },
   
   // 获取漏斗指标
  getFunnelMetrics: (req, res) => {
    try {
      const allMatches = positionResumeStmt.getAll()
      const { StatusUtils } = require('../constants/interviewStatus')
      
      // 使用统一的转化率计算（根据配置）
      const denominator = getConversionDenominator(allMatches)
      const numerator = getConversionNumerator(allMatches)
      
      // 流失率：所有终态但非成功的候选人
      const rejected = allMatches.filter(m => {
        const isTerminal = StatusUtils.isTerminalStatus(m.main_status, m.sub_status)
        return isTerminal && !isClosed(m)
      }).length
      
      // 计算平均周期（从简历投递到当前状态的天数）
      let totalDays = 0
      let countWithDays = 0
      
      for (const match of allMatches) {
        if (match.matched_at) {
          const days = Math.floor((Date.now() - new Date(match.matched_at).getTime()) / (1000 * 60 * 60 * 24))
          totalDays += days
          countWithDays++
        }
      }
      
       const metrics = {
         conversionRate: denominator > 0 ? Math.round((numerator / denominator) * 100) : 0,
         avgDays: countWithDays > 0 ? Math.round(totalDays / countWithDays) : 0,
         dropOffRate: denominator > 0 ? Math.round((rejected / denominator) * 100) : 0,
         // 新增明细数据
         details: {
           totalCandidates: allMatches.length,
           denominatorCount: denominator,
           numeratorCount: numerator,
           onboardedCount: allMatches.filter(m => isOnboarded(m)).length,
           pendingOnboardCount: allMatches.filter(m => m.main_status === 'closed' && m.sub_status === 'pending_onboard').length,
           rejectedCount: rejected
         }
       }
       
       console.log('\n【漏斗指标】=== 转化率计算详情 ===')
       console.log(`  总候选人: ${metrics.details.totalCandidates}`)
       console.log(`  分母(${DASHBOARD_CONFIG.conversionRate.denominator}): ${metrics.details.denominatorCount}`)
       console.log(`  分子(${DASHBOARD_CONFIG.conversionRate.numerator}): ${metrics.details.numeratorCount}`)
       console.log(`    - 已入职: ${metrics.details.onboardedCount}`)
       console.log(`    - 待入职: ${metrics.details.pendingOnboardCount}`)
       console.log(`  转化率: ${metrics.conversionRate}%`)
       console.log(`  流失率: ${metrics.dropOffRate}%`)
       console.log('【漏斗指标】返回数据:', JSON.stringify(metrics, null, 2))
       
       success(res, metrics)
    } catch (err) {
      error(res, err.message)
    }
  },
  
  // 获取岗位热度数据
  getHeatData: (req, res) => {
    try {
      const { StatusUtils } = require('../constants/interviewStatus')
      
      const allMatches = positionResumeStmt.all(`
        SELECT 
          p.name as position_name,
          pr.main_status,
          pr.sub_status
        FROM position_resumes pr
        JOIN positions p ON pr.position_id = p.id
        ORDER BY p.name
      `)
      
      const positions = [...new Set(allMatches.map(m => m.position_name))]
      
      const result = positions.map(pos => {
        const posMatches = allMatches.filter(m => m.position_name === pos)
        
        const screeningMatches = posMatches.filter(m => {
          const isTerminal = StatusUtils.isTerminalStatus(m.main_status, m.sub_status)
          return m.main_status === 'resume_screening' && !isTerminal
        })
        
        const interviewingMatches = posMatches.filter(m => {
          const isTerminal = StatusUtils.isTerminalStatus(m.main_status, m.sub_status)
          return m.main_status === 'interviewing' && !isTerminal
        })
        
        const closedMatches = posMatches.filter(m => isClosed(m))
          
        const pendingOnboardCount = closedMatches.filter(m => m.sub_status === 'pending_onboard').length
        const onboardedCount = closedMatches.filter(m => m.sub_status === 'onboarded').length
         
        const totalResumes = posMatches.length
        const calculateRate = (current, base) => base > 0 ? Math.round((current / base) * 100) : 0

        const interviewRate = calculateRate(interviewingMatches.length, totalResumes)
        const closedRate = calculateRate(closedMatches.length, totalResumes)

        return {
          name: pos,
          totalResumes,
          interviewCount: interviewingMatches.length,
          closedCount: closedMatches.length,
          bars: [
            { type: '简历筛选', count: screeningMatches.length },
            { type: '面试中', count: interviewingMatches.length, rate: interviewRate },
            { type: '已成单', count: closedMatches.length, rate: closedRate, subCount: { pending: pendingOnboardCount, onboarded: onboardedCount } }
          ]
        }
       })
       
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
      
      
      // 诊断查询：检查resumes表的数据情况
      const stats = positionResumeStmt.get(`
        SELECT 
          MIN(strftime('%Y-%m-%d', created_at)) as earliest_date,
          MAX(strftime('%Y-%m-%d', created_at)) as latest_date,
          COUNT(*) as total_count
        FROM resumes
      `)
      
      // 计算查询的日期范围
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))
      const dateRange = {
        start: startDate.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
      
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

        result.push({
          date: dateStr,
          newResumes: newResumes[0]?.count || 0,
          newInterviews: newInterviews[0]?.count || 0
        })
      }

      success(res, result)
    } catch (err) {
      error(res, err.message)
    }
  },

  // 获取操作动态
   getActivities: (req, res) => {
     try {
       const { limit = 10 } = req.query

       console.log('\n========== [后端 getActivities] ==========')
       console.log('[getActivities] 请求时间:', new Date().toLocaleString('zh-CN'))
       console.log('[getActivities] limit:', limit)

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

       console.log('[getActivities] 查询到日志条数:', logs.length)
       if (logs.length > 0) {
         console.log('[getActivities] 最新日志:', JSON.stringify(logs[0], null, 2))
       }

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

       console.log('[getActivities] 返回数据条数:', activities.length)
       if (activities.length > 0) {
         console.log('[getActivities] 返回最新一条:', JSON.stringify(activities[0], null, 2))
       }

       success(res, activities)
     } catch (err) {
       error(res, err.message)
     }
   },

  // 根据主状态获取候选人列表（用于流程看板）
  // 重要：需要结合主状态和子状态(isTerminal)来正确分类
  getCandidatesByMainStatus: (req, res) => {
    try {
      const { mainStatus, excludeTerminal = 'false' } = req.query
      
      if (!mainStatus) {
        return error(res, '请提供主状态参数 mainStatus', 400)
      }
      
      const { StatusUtils } = require('../constants/interviewStatus')
      
      // 获取所有数据，然后在前端过滤（因为需要判断子状态是否为终态）
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
      `

      // 对于进行中阶段，需要排除子状态为终态的记录
      // 对于已结束阶段，需要包含所有子状态为终态的记录
      const matches = positionResumeStmt.all(sql)

      // 根据主状态和子状态进行正确分类
      let filteredMatches = matches.filter(m => {
        const isTerminal = StatusUtils.isTerminalStatus(m.main_status, m.sub_status)

        if (mainStatus === 'closed') {
          // 已成单阶段：使用isClosed函数（包含pending_onboard和onboarded）
          const result = isClosed(m)
          return result
        } else if (mainStatus === 'rejected') {
          // 已结束阶段：包含所有子状态为终态的记录（无论主状态）
          return isTerminal
        } else {
          // 进行中阶段：主状态匹配且子状态不是终态
          return m.main_status === mainStatus && !isTerminal
        }
      })

      success(res, filteredMatches)
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
