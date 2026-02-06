const {
  positionResumeStmt,
  resumeStmt,
  positionStmt,
  interviewRejectionStmt,
  interviewEventStmt
} = require('../database')
const { success, error } = require('../utils/response')

function calculateEfficiency(interviewRate, closeRate) {
  if (interviewRate === undefined || closeRate === undefined) return 0
  const score = (interviewRate * 0.3) + (closeRate * 0.7)
  return Math.round(score * 100) / 100
}

const recruitLogController = {
  /**
   * GET /api/recruit-log/bottleneck-analysis
   * 损耗诊断：分析各阶段淘汰率，识别瓶颈
   */
  getBottleneckAnalysis: (req, res) => {
    try {
      const allMatches = positionResumeStmt.getAll()
      const rejections = interviewRejectionStmt.getAll()

      const stages = [
        { code: 'resume_screening', label: '简历筛选' },
        { code: 'interviewing', label: '面试中' },
        { code: 'salary_negotiation', label: '谈薪中' }
      ]

      const bottleneckData = stages.map(stage => {
        const stageMatches = allMatches.filter(m => m.main_status === stage.code)
        const stageRejections = rejections.filter(r => r.rejected_at_stage === stage.code)
        
        const total = stageMatches.length
        const rejected = stageRejections.length
        const dropRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : 0

        const stageRejectionsByReason = {}
        stageRejections.forEach(r => {
          const reason = r.rejection_reason_code || 'unknown'
          stageRejectionsByReason[reason] = (stageRejectionsByReason[reason] || 0) + 1
        })

        return {
          stage: stage.code,
          stageLabel: stage.label,
          totalCandidates: total,
          rejectedCount: rejected,
          dropRate: parseFloat(dropRate),
          topRejections: Object.entries(stageRejectionsByReason)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reason, count]) => ({ reason, count })),
          diagnosis: getDiagnosis(stage.code, dropRate, total)
        }
      })

      const overallMetrics = {
        totalCandidates: allMatches.length,
        totalRejections: rejections.length,
        overallDropRate: allMatches.length > 0 
          ? ((rejections.length / allMatches.length) * 100).toFixed(1) 
          : 0
      }

      success(res, {
        stages: bottleneckData,
        metrics: overallMetrics
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/candidate-warnings
   * 候选人预警中心：超过3天无进展的优质候选人
   */
  getCandidateWarnings: (req, res) => {
    try {
      const { days = 3, minScore = 70 } = req.query
      const thresholdDays = parseInt(days) || 3
      const minMatchScore = parseInt(minScore) || 70

      const allMatches = positionResumeStmt.getAll()
      const now = new Date()

      const warnings = allMatches
        .filter(match => {
          if (isTerminalStatus(match.main_status, match.sub_status)) return false

          const matchScore = match.match_score || 0
          if (matchScore < minMatchScore) return false

          const updateTime = match.update_time || match.matched_at
          if (!updateTime) return false

          const daysSinceUpdate = Math.floor(
            (now - new Date(updateTime)) / (1000 * 60 * 60 * 24)
          )

          return daysSinceUpdate >= thresholdDays
        })
        .map(match => {
          const updateTime = match.update_time || match.matched_at
          const daysSinceUpdate = Math.floor(
            (now - new Date(updateTime)) / (1000 * 60 * 60 * 24)
          )

          let urgentLevel = 'normal'
          if (daysSinceUpdate >= 7) urgentLevel = 'critical'
          else if (daysSinceUpdate >= 5) urgentLevel = 'high'
          else if (daysSinceUpdate >= 3) urgentLevel = 'medium'

          const position = positionStmt.getById(match.position_id)

          return {
            matchId: match.id,
            candidateName: match.candidate_name || '未知',
            positionName: position?.name || '未知职位',
            positionId: match.position_id,
            matchScore: match.match_score,
            currentStatus: match.main_status,
            subStatus: match.sub_status,
            statusLabel: getStatusLabel(match.main_status, match.sub_status),
            lastUpdateTime: updateTime,
            daysSinceUpdate,
            urgentLevel,
            actionSuggestion: getActionSuggestion(match, daysSinceUpdate)
          }
        })
        .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)

      const stats = {
        total: warnings.length,
        critical: warnings.filter(w => w.urgentLevel === 'critical').length,
        high: warnings.filter(w => w.urgentLevel === 'high').length,
        medium: warnings.filter(w => w.urgentLevel === 'medium').length,
        normal: warnings.filter(w => w.urgentLevel === 'normal').length
      }

      success(res, {
        warnings,
        stats,
        threshold: thresholdDays,
        minScore
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/channel-roi
   * 渠道性价比：各渠道的ROI转化率分析
   * 修复：只统计真正进行了面试的候选人
   */
  getChannelROI: (req, res) => {
    try {
      const allMatches = positionResumeStmt.getAll()
      const resumes = resumeStmt.getAll()

      const sourceMap = {
        'boss': 'BOSS直聘',
        'lagou': '拉勾网',
        'liepin': '猎聘网',
        'recruiter': '猎头推荐',
        'internal': '内推',
        'other': '其他渠道'
      }

      const channelData = {}

      resumes.forEach(resume => {
        const source = resume.source || 'other'
        if (!channelData[source]) {
          channelData[source] = {
            sourceCode: source,
            sourceName: sourceMap[source] || source,
            totalResumes: 0,
            interviewCount: 0,
            closedCount: 0
          }
        }
        channelData[source].totalResumes++
      })

      allMatches.forEach(match => {
        const resume = resumeStmt.getById(match.resume_id)
        if (!resume) return

        const source = resume.source || 'other'
        if (!channelData[source]) {
          channelData[source] = {
            sourceCode: source,
            sourceName: sourceMap[source] || source,
            totalResumes: 0,
            interviewCount: 0,
            closedCount: 0
          }
        }

        if (hasInterviewed(match)) {
          channelData[source].interviewCount++
        }

        if (isClosedSuccessfully(match.main_status, match.sub_status)) {
          channelData[source].closedCount++
        }
      })

      const roiData = Object.values(channelData)
        .map(channel => {
          const interviewRate = channel.totalResumes > 0
            ? ((channel.interviewCount / channel.totalResumes) * 100).toFixed(1)
            : 0
          const closeRate = channel.totalResumes > 0
            ? ((channel.closedCount / channel.totalResumes) * 100).toFixed(1)
            : 0

          const interviewRateNum = parseFloat(interviewRate)
          const closeRateNum = parseFloat(closeRate)

          return {
            ...channel,
            interviewRate: interviewRateNum,
            closeRate: closeRateNum,
            efficiency: calculateEfficiency(interviewRateNum, closeRateNum)
          }
        })
        .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))

      const totalInterviews = allMatches.filter(m => hasInterviewed(m)).length
      const totalClosed = allMatches.filter(m => 
        isClosedSuccessfully(m.main_status, m.sub_status)
      ).length

      const summary = {
        totalResumes: resumes.length,
        totalInterviews,
        totalClosed,
        overallInterviewRate: resumes.length > 0
          ? ((totalInterviews / resumes.length) * 100).toFixed(1)
          : 0,
        overallCloseRate: resumes.length > 0
          ? ((totalClosed / resumes.length) * 100).toFixed(1)
          : 0
      }

      success(res, {
        channels: roiData,
        summary
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/workload-stats
   * 工作量统计：本周/本月工作量
   */
  getWorkloadStats: (req, res) => {
    try {
      const { period = 'week' } = req.query
      const now = new Date()
      let startDate

      if (period === 'week') {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
      } else {
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
      }

      const startDateStr = startDate.toISOString().split('T')[0] + 'T00:00:00'
      const endDateStr = now.toISOString().split('T')[0] + 'T23:59:59'

      const events = interviewEventStmt.getByTimeRange(startDateStr, endDateStr)
      const allMatches = positionResumeStmt.getAll()

      const stats = {
        resumesReviewed: events.filter(e => e.event_type === 'resume_upload').length,
        deepCommunications: events.filter(e => 
          ['status_changed', 'interview_scheduled'].includes(e.event_type)
        ).length,
        interviewsScheduled: events.filter(e => e.event_type === 'interview_scheduled').length,
        interviewsCompleted: events.filter(e => e.event_type === 'interview_completed').length,
        offersSent: events.filter(e => e.event_type === 'offer_sent').length
      }

      stats.totalProcessed = 
        stats.resumesReviewed + 
        stats.deepCommunications + 
        stats.interviewsScheduled

      const dailyTrend = {}
      events.forEach(event => {
        const date = event.event_time.split('T')[0]
        if (!dailyTrend[date]) {
          dailyTrend[date] = {
            date,
            resumes: 0,
            communications: 0,
            interviews: 0
          }
        }
        if (event.event_type === 'resume_upload') dailyTrend[date].resumes++
        if (event.event_type === 'interview_scheduled') dailyTrend[date].interviews++
      })

      const activePositions = allMatches.filter(m => 
        ['resume_screening', 'interviewing', 'salary_negotiation'].includes(m.main_status)
      ).length

      success(res, {
        period,
        stats,
        dailyTrend: Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date)),
        activePositions,
        periodLabel: period === 'week' ? '本周' : '本月'
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/position-progress
   * 核心职位进度条
   * 修复：区分子状态进行更精确的计算
   */
  getPositionProgress: (req, res) => {
    try {
      const positions = positionStmt.getActive()
      const allMatches = positionResumeStmt.getAll()

      const progressData = positions.map(position => {
        const positionMatches = allMatches.filter(m => m.position_id === position.id)

        const stages = {
          resumeScreening: positionMatches.filter(m => m.main_status === 'resume_screening').length,
          interviewing: positionMatches.filter(m => m.main_status === 'interviewing').length,
          salaryNegotiation: positionMatches.filter(m => m.main_status === 'salary_negotiation').length,
          closed: positionMatches.filter(m => m.main_status === 'closed').length,
          rejected: positionMatches.filter(m => m.main_status === 'rejected').length
        }

        const subStages = {
          roundPending: positionMatches.filter(m => 
            m.main_status === 'interviewing' && m.sub_status === 'round_pending'
          ).length,
          roundScheduled: positionMatches.filter(m => 
            m.main_status === 'interviewing' && m.sub_status === 'round_scheduled'
          ).length,
          roundPassed: positionMatches.filter(m => 
            m.main_status === 'interviewing' && m.sub_status === 'round_passed'
          ).length,
          pendingOnboard: positionMatches.filter(m => 
            m.main_status === 'closed' && m.sub_status === 'pending_onboard'
          ).length,
          onboarded: positionMatches.filter(m => 
            m.main_status === 'closed' && m.sub_status === 'onboarded'
          ).length
        }

        const total = positionMatches.length
        
        const interviewed = positionMatches.filter(m => hasInterviewed(m)).length
        const closedSuccessfully = positionMatches.filter(m => 
          isClosedSuccessfully(m.main_status, m.sub_status)
        ).length

        const progress = total > 0 
          ? Math.round(((interviewed + closedSuccessfully) / total * 100))
          : 0

        return {
          positionId: position.id,
          positionName: position.name,
          company: position.company,
          totalCandidates: total,
          stages,
          subStages,
          progress,
          status: position.status,
          startedAt: position.created_at
        }
      })

      const topPositions = progressData
        .sort((a, b) => b.totalCandidates - a.totalCandidates)
        .slice(0, 5)

      success(res, {
        allPositions: progressData,
        topPositions,
        totalActivePositions: positions.length
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/market-feedback
   * 市场反馈报告：候选人负面反馈汇总
   */
  getMarketFeedback: (req, res) => {
    try {
      const rejections = interviewRejectionStmt.getAll()
      const recentRejections = rejections
        .filter(r => {
          const rejectionDate = new Date(r.created_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return rejectionDate >= thirtyDaysAgo
        })

      const feedbackByCategory = {
        screening: [],
        interview: [],
        salary: [],
        onboard: []
      }

      const reasonCounts = {}
      const candidateFeedbacks = []

      recentRejections.forEach(rejection => {
        const category = rejection.rejection_category || 'other'
        
        if (!feedbackByCategory[category]) {
          feedbackByCategory[category] = []
        }

        const reason = rejection.rejection_reason_code || '未说明原因'
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1

        if (rejection.candidate_feedback) {
          candidateFeedbacks.push({
            reason,
            category,
            feedback: rejection.candidate_feedback,
            date: rejection.created_at
          })
        }

        feedbackByCategory[category].push({
          reason,
          count: 1,
          details: rejection.rejection_reason_detail
        })
      })

      const topReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([reason, count]) => ({ reason, count }))

      const summary = {
        totalRejections: recentRejections.length,
        byCategory: {
          screening: feedbackByCategory.screening.length,
          interview: feedbackByCategory.interview.length,
          salary: feedbackByCategory.salary.length,
          onboard: feedbackByCategory.onboard.length
        },
        topReasons
      }

      const suggestions = generateSuggestions(recentRejections)

      success(res, {
        feedback: {
          byCategory: feedbackByCategory,
          candidateVoices: candidateFeedbacks.slice(0, 10)
        },
        summary,
        suggestions
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/weekly-report
   * 综合周报：汇总所有数据
   * 修复：面试数统计和进行中候选人统计使用正确逻辑
   */
  getWeeklyReport: (req, res) => {
    try {
      const { period = 'week' } = req.query

      const allMatches = positionResumeStmt.getAll()
      const rejections = interviewRejectionStmt.getAll()
      const events = interviewEventStmt.getAll()
      const positions = positionStmt.getActive()

      const now = new Date()
      let startDate
      if (period === 'week') {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
      } else {
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
      }

      const periodEvents = events.filter(e => e.event_time >= startDate.toISOString())
      const periodRejections = rejections.filter(r => r.created_at >= startDate.toISOString())

      const weeklyStats = {
        resumesReviewed: periodEvents.filter(e => e.event_type === 'resume_upload').length,
        interviewsScheduled: periodEvents.filter(e => e.event_type === 'interview_scheduled').length,
        offersSent: periodEvents.filter(e => e.event_type === 'offer_sent').length,
        rejections: periodRejections.length
      }

      const bottleneck = {
        resumeScreening: rejections.filter(r => r.rejected_at_stage === 'resume_screening').length,
        interviewing: rejections.filter(r => r.rejected_at_stage === 'interviewing').length,
        salaryNegotiation: rejections.filter(r => r.rejected_at_stage === 'salary_negotiation').length
      }

      const topRejections = Object.entries(
        periodRejections.reduce((acc, r) => {
          const reason = r.rejection_reason_code || '未说明'
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }))

      const positionProgress = positions.slice(0, 5).map(p => {
        const posMatches = allMatches.filter(m => m.position_id === p.id)
        const closed = posMatches.filter(m => 
          isClosedSuccessfully(m.main_status, m.sub_status)
        ).length
        return {
          name: p.name,
          total: posMatches.length,
          closed,
          progress: posMatches.length > 0 ? Math.round((closed / posMatches.length) * 100) : 0
        }
      })

      const suggestions = generateSuggestions(periodRejections)

      success(res, {
        period,
        generatedAt: new Date().toISOString(),
        stats: weeklyStats,
        bottleneck,
        topRejections,
        positionProgress,
        suggestions,
        activePositions: positions.length,
        inProgressCandidates: allMatches.filter(m => 
          ['interviewing', 'salary_negotiation'].includes(m.main_status) &&
          !isTerminalStatus(m.main_status, m.sub_status)
        ).length
      })
    } catch (err) {
      error(res, err.message)
    }
  },

  /**
   * GET /api/recruit-log/daily-report
   * 今日日报：一键复制的日报内容
   */
  getDailyReport: (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const startDate = today + 'T00:00:00'
      const endDate = today + 'T23:59:59'

      const events = interviewEventStmt.getByTimeRange(startDate, endDate)
      const allMatches = positionResumeStmt.getAll()
      const positions = positionStmt.getActive()

      const todayEvents = {
        resumesReviewed: events.filter(e => e.event_type === 'resume_upload').length,
        interviewsScheduled: events.filter(e => e.event_type === 'interview_scheduled').length,
        interviewsCompleted: events.filter(e => e.event_type === 'interview_completed').length,
        offersSent: events.filter(e => e.event_type === 'offer_sent').length,
        statusChanged: events.filter(e => e.event_type === 'status_changed').length
      }

      const ongoingCandidates = allMatches.filter(m => 
        !isTerminalStatus(m.main_status, m.sub_status)
      ).length

      const todayCandidates = allMatches.filter(m => {
        const createdAt = m.matched_at || m.created_at
        return createdAt && createdAt.startsWith(today)
      }).length

      const todayOnboarded = allMatches.filter(m => {
        return m.main_status === 'closed' && 
               m.sub_status === 'onboarded' &&
               m.update_time && 
               m.update_time.startsWith(today)
      }).length

      const summary = {
        resumes: todayEvents.resumesReviewed,
        interviews: todayEvents.interviewsScheduled + todayEvents.interviewsCompleted,
        offers: todayEvents.offersSent,
        statusChanges: todayEvents.statusChanged,
        ongoing: ongoingCandidates,
        todayAdded: todayCandidates,
        todayOnboarded
      }

      const copyText = generateDailyReportText(summary)

      success(res, {
        date: today,
        summary,
        copyText,
        generatedAt: new Date().toISOString()
      })
    } catch (err) {
      error(res, err.message)
    }
  }
}

function getDiagnosis(stage, dropRate, total) {
  if (total === 0) return '暂无数据'
  
  if (dropRate > 50) {
    const advices = {
      resume_screening: '建议优化简历筛选标准，或加强JD描述的准确性',
      interviewing: '建议复盘面试流程，检查面试官评价标准是否一致',
      salary_negotiation: '建议提前了解候选人的薪资期望，或优化福利包'
    }
    return `淘汰率过高(${dropRate}%)。${advices[stage] || '需要优化'}`
  } else if (dropRate > 30) {
    return `淘汰率偏高(${dropRate}%)，建议关注转化`
  } else if (dropRate > 10) {
    return `淘汰率正常(${dropRate}%)，保持当前节奏`
  } else {
    return `淘汰率较低(${dropRate}%)，流程健康`
  }
}

function getStatusLabel(mainStatus, subStatus) {
  const statusMap = {
    'resume_screening': '简历筛选',
    'interviewing': '面试中',
    'salary_negotiation': '谈薪中',
    'closed': '已成单',
    'rejected': '不合适'
  }
  return statusMap[mainStatus] || mainStatus
}

function getActionSuggestion(match, days) {
  const suggestions = {
    resume_screening: '建议尽快完成简历筛选，避免优质候选人流失',
    round_pending: `已${days}天无进展，建议立即安排面试`,
    round_scheduled: `已${days}天无进展，建议跟进面试反馈`,
    salary_negotiation: `已${days}天未签约，建议${days > 3 ? '尽快推动签约' : '确认候选人意向'}`
  }
  return suggestions[match.sub_status] || suggestions[match.main_status] || '建议跟进当前状态'
}

function generateDailyReportText(summary) {
  const parts = []
  
  if (summary.resumes > 0) {
    parts.push(`筛选简历${summary.resumes}份`)
  }
  
  if (summary.interviews > 0) {
    parts.push(`安排/完成面试${summary.interviews}场`)
  } else {
    parts.push('暂无面试安排')
  }
  
  if (summary.offers > 0) {
    parts.push(`发放Offer${summary.offers}个`)
  }
  
  if (summary.todayAdded > 0) {
    parts.push(`新增候选人${summary.todayAdded}人`)
  }
  
  if (summary.todayOnboarded > 0) {
    parts.push(`入职${summary.todayOnboarded}人`)
  }
  
  parts.push(`当前进行中${summary.ongoing}人`)
  
  const date = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  
  return `【${date}招聘日报】${parts.join('，')}。`
}

function generateSuggestions(rejections) {
  const suggestions = []
  const salaryRejections = rejections.filter(r => 
    r.rejection_category === 'salary' || 
    ['salary_not_agree', 'candidate_reject_offer', 'benefit_not_satisfied', 'got_other_offer'].includes(r.rejection_reason_code)
  )
  
  if (salaryRejections.length > 0) {
    suggestions.push({
      priority: 'high',
      category: '薪资竞争力',
      message: `${salaryRejections.length}个候选人因薪资问题放弃，建议评估市场薪资水平`,
      action: '建议优化薪资福利包'
    })
  }

  const interviewRejections = rejections.filter(r => r.rejection_category === 'interview')
  if (interviewRejections.length > rejections.length * 0.3) {
    suggestions.push({
      priority: 'medium',
      category: '面试流程',
      message: '面试淘汰率较高，建议复盘面试标准和流程',
      action: '建议组织面试官培训'
    })
  }

  return suggestions
}

function isTerminalStatus(mainStatus, subStatus) {
  const terminalMainStatuses = ['closed', 'rejected']
  
  if (!terminalMainStatuses.includes(mainStatus)) {
    if (subStatus && (subStatus.includes('rejected') || subStatus.includes('abandoned'))) {
      return true
    }
    return false
  }
  
  if (mainStatus === 'closed') {
    return subStatus === 'onboarded'
  }
  return true
}

function isClosedSuccessfully(mainStatus, subStatus) {
  return mainStatus === 'closed' && subStatus === 'onboarded'
}

function hasInterviewed(match) {
  if (!match) return false
  
  const { main_status, sub_status } = match
  
  if (main_status === 'interviewing') {
    const interviewedSubStatuses = [
      'round_scheduled', 'round_passed', 'all_rounds_passed', 'interview_rejected'
    ]
    return interviewedSubStatuses.includes(sub_status)
  }
  
  if (['salary_negotiation', 'closed'].includes(main_status)) {
    return true
  }
  
  if (main_status === 'rejected') {
    const postInterviewRejections = [
      'interview_rejected', 'salary_rejected', 'offer_rejected', 'onboard_abandoned'
    ]
    return postInterviewRejections.includes(sub_status)
  }
  
  return false
}

module.exports = recruitLogController
