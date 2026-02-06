/**
 * 招聘日志页面数据获取 Composable
 */

import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const handleApiError = (error, defaultMessage) => {
  console.error(defaultMessage, error)
  const message = error?.message || defaultMessage
  ElMessage.error(message)
}

export function useRecruitLog() {
  const loadingBottleneck = ref(false)
  const loadingWarnings = ref(false)
  const loadingROI = ref(false)
  const loadingWorkload = ref(false)
  const loadingProgress = ref(false)
  const loadingFeedback = ref(false)
  const loadingReport = ref(false)
  const loadingDailyReport = ref(false)

  const fetching = ref({
    bottleneck: false,
    warnings: false,
    roi: false,
    workload: false,
    progress: false,
    feedback: false,
    report: false,
    dailyReport: false
  })

  const bottleneckData = ref({
    stages: [],
    metrics: {
      totalCandidates: 0,
      totalRejections: 0,
      overallDropRate: 0
    }
  })

  const warningsData = ref({
    warnings: [],
    stats: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      normal: 0
    },
    threshold: 3,
    minScore: 70
  })

  const channelROIData = ref({
    channels: [],
    summary: {
      totalResumes: 0,
      totalInterviews: 0,
      totalClosed: 0,
      overallInterviewRate: 0,
      overallCloseRate: 0
    }
  })

  const workloadData = ref({
    period: 'week',
    stats: {
      resumesReviewed: 0,
      deepCommunications: 0,
      interviewsScheduled: 0,
      interviewsCompleted: 0,
      offersSent: 0,
      totalProcessed: 0
    },
    dailyTrend: [],
    activePositions: 0,
    periodLabel: '本周'
  })

  const positionProgressData = ref({
    allPositions: [],
    topPositions: [],
    totalActivePositions: 0
  })

  const marketFeedbackData = ref({
    feedback: {
      byCategory: {},
      candidateVoices: []
    },
    summary: {
      totalRejections: 0,
      byCategory: {
        screening: 0,
        interview: 0,
        salary: 0,
        onboard: 0
      },
      topReasons: []
    },
    suggestions: []
  })

  const weeklyReportData = ref({
    period: 'week',
    generatedAt: '',
    stats: {
      resumesReviewed: 0,
      interviewsScheduled: 0,
      offersSent: 0,
      rejections: 0
    },
    bottleneck: {
      resumeScreening: 0,
      interviewing: 0,
      salaryNegotiation: 0
    },
    topRejections: [],
    positionProgress: [],
    suggestions: [],
    activePositions: 0,
    inProgressCandidates: 0
  })

  const dailyReportData = ref({
    summary: {
      resumes: 0,
      interviews: 0,
      offers: 0,
      statusChanges: 0,
      ongoing: 0,
      todayAdded: 0,
      todayOnboarded: 0
    },
    copyText: '',
    date: '',
    generatedAt: ''
  })

  const fetchBottleneckAnalysis = async () => {
    if (fetching.value.bottleneck) return
    
    fetching.value.bottleneck = true
    loadingBottleneck.value = true
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch('/api/recruit-log/bottleneck-analysis', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        bottleneckData.value = data.data
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        handleApiError(new Error('请求超时'), '获取损耗诊断数据超时')
      } else {
        handleApiError(error, '获取损耗诊断数据失败')
      }
    } finally {
      loadingBottleneck.value = false
      fetching.value.bottleneck = false
    }
  }

  const fetchCandidateWarnings = async (params = {}) => {
    if (fetching.value.warnings) return
    
    fetching.value.warnings = true
    loadingWarnings.value = true
    try {
      const queryParams = new URLSearchParams({
        days: params.days || 3,
        minScore: params.minScore || 70
      })
      
      const response = await fetch(`/api/recruit-log/candidate-warnings?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        warningsData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取候选人预警数据失败')
    } finally {
      loadingWarnings.value = false
      fetching.value.warnings = false
    }
  }

  const fetchChannelROI = async () => {
    if (fetching.value.roi) return
    
    fetching.value.roi = true
    loadingROI.value = true
    try {
      const response = await fetch('/api/recruit-log/channel-roi')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        channelROIData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取渠道ROI数据失败')
    } finally {
      loadingROI.value = false
      fetching.value.roi = false
    }
  }

  const fetchWorkloadStats = async (period = 'week') => {
    if (fetching.value.workload) return
    
    fetching.value.workload = true
    loadingWorkload.value = true
    try {
      const response = await fetch(`/api/recruit-log/workload-stats?period=${period}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        workloadData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取工作量统计数据失败')
    } finally {
      loadingWorkload.value = false
      fetching.value.workload = false
    }
  }

  const fetchPositionProgress = async () => {
    if (fetching.value.progress) return
    
    fetching.value.progress = true
    loadingProgress.value = true
    try {
      const response = await fetch('/api/recruit-log/position-progress')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        positionProgressData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取职位进度数据失败')
    } finally {
      loadingProgress.value = false
      fetching.value.progress = false
    }
  }

  const fetchMarketFeedback = async () => {
    if (fetching.value.feedback) return
    
    fetching.value.feedback = true
    loadingFeedback.value = true
    try {
      const response = await fetch('/api/recruit-log/market-feedback')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        marketFeedbackData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取市场反馈数据失败')
    } finally {
      loadingFeedback.value = false
      fetching.value.feedback = false
    }
  }

  const fetchWeeklyReport = async (period = 'week') => {
    if (fetching.value.report) return
    
    fetching.value.report = true
    loadingReport.value = true
    try {
      const response = await fetch(`/api/recruit-log/weekly-report?period=${period}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        weeklyReportData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取周报数据失败')
    } finally {
      loadingReport.value = false
      fetching.value.report = false
    }
  }

  const fetchDailyReport = async () => {
    if (fetching.value.dailyReport) return
    
    fetching.value.dailyReport = true
    loadingDailyReport.value = true
    try {
      const response = await fetch('/api/recruit-log/daily-report')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success && data.data) {
        dailyReportData.value = data.data
      }
    } catch (error) {
      handleApiError(error, '获取日报数据失败')
    } finally {
      loadingDailyReport.value = false
      fetching.value.dailyReport = false
    }
  }

  const refreshAllData = async () => {
    await Promise.all([
      fetchBottleneckAnalysis(),
      fetchCandidateWarnings(),
      fetchChannelROI(),
      fetchWorkloadStats(),
      fetchPositionProgress(),
      fetchMarketFeedback(),
      fetchWeeklyReport()
    ])
  }

  const refreshReport = async (period = 'week') => {
    await Promise.all([
      fetchWorkloadStats(period),
      fetchWeeklyReport(period)
    ])
  }

  const refreshWarnings = async (params = {}) => {
    await fetchCandidateWarnings(params)
  }

  onMounted(() => {
    refreshAllData()
  })

  return {
    bottleneckData,
    warningsData,
    channelROIData,
    workloadData,
    positionProgressData,
    marketFeedbackData,
    weeklyReportData,
    dailyReportData,

    loadingBottleneck,
    loadingWarnings,
    loadingROI,
    loadingWorkload,
    loadingProgress,
    loadingFeedback,
    loadingReport,
    loadingDailyReport,

    fetchBottleneckAnalysis,
    fetchCandidateWarnings,
    fetchChannelROI,
    fetchWorkloadStats,
    fetchPositionProgress,
    fetchMarketFeedback,
    fetchWeeklyReport,
    fetchDailyReport,

    refreshAllData,
    refreshReport,
    refreshWarnings
  }
}
