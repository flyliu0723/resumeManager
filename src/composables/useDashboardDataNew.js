/**
 * Dashboard 数据获取 Composable - 支持新状态系统
 */

import { ref, computed, onMounted } from 'vue'
import { StatusUtils, MAIN_STATUS } from '../constants/interviewStatus'

export function useDashboardData() {
  // 状态数据
  const activityItems = ref([])
  const heatData = ref([])
  const sourceData = ref([])
  const trendData = ref([])
  const funnelData = ref({
    resumeScreening: [],
    interviewing: [],
    salaryNegotiation: [],
    closed: [],
    rejected: []
  })
  const newStatsData = ref({
    resumeScreening: 0,
    pendingReview: 0,
    interviewing: 0,
    roundPending: 0,
    roundScheduled: 0,
    salaryNegotiation: 0,
    approvalPending: 0,
    closed: 0,
    onboarded: 0,
    pendingOnboard: 0,
    rejected: 0,
    rejectedThisMonth: 0
  })
  const funnelMetrics = ref({
    conversionRate: 0,
    avgDays: 0,
    dropOffRate: 0
  })
  
  const loadingActivities = ref(false)
  const loadingFunnel = ref(false)

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      
      if (data.success && data.data) {
        // 确保数据完整，使用默认值填充缺失的字段
        newStatsData.value = {
          resumeScreening: data.data.resumeScreening || 0,
          pendingReview: data.data.pendingReview || 0,
          interviewing: data.data.interviewing || 0,
          roundPending: data.data.roundPending || 0,
          roundScheduled: data.data.roundScheduled || 0,
          salaryNegotiation: data.data.salaryNegotiation || 0,
          approvalPending: data.data.approvalPending || 0,
          closed: data.data.closed || 0,
          onboarded: data.data.onboarded || 0,
          pendingOnboard: data.data.pendingOnboard || 0,
          rejected: data.data.rejected || 0,
          rejectedThisMonth: data.data.rejectedThisMonth || 0
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  // 获取漏斗数据
  const fetchFunnelData = async () => {
    loadingFunnel.value = true
    try {
      // 获取各阶段的候选人列表
      const stages = ['resume_screening', 'interviewing', 'salary_negotiation', 'closed', 'rejected']
      const funnelResult = {}
      
      for (const stage of stages) {
        // 使用正确的 API 端点获取按主状态分组的候选人
        const response = await fetch(`/api/dashboard/candidates-by-main-status?mainStatus=${stage}&limit=10`)
        const data = await response.json()
        
        if (data.success && data.data && Array.isArray(data.data)) {
          funnelResult[stage] = data.data.map(item => ({
            id: item.id,
            candidateName: item.candidate_name,
            positionTitle: item.position_name,
            mainStatus: item.main_status,
            subStatus: item.sub_status,
            interviewRound: item.interview_round,
            initials: item.initials || (item.candidate_name?.charAt(0) || '?'),
            avatarColor: item.avatar_color || '#409EFF',
            daysInStage: item.days_in_stage || 0
          }))
        } else {
          funnelResult[stage] = []
        }
      }
      
      funnelData.value = {
        resumeScreening: funnelResult.resume_screening || [],
        interviewing: funnelResult.interviewing || [],
        salaryNegotiation: funnelResult.salary_negotiation || [],
        closed: funnelResult.closed || [],
        rejected: funnelResult.rejected || []
      }
      
      // 计算漏斗指标
      const total = funnelData.value.resumeScreening.length + 
                    funnelData.value.interviewing.length +
                    funnelData.value.salaryNegotiation.length +
                    funnelData.value.closed.length +
                    funnelData.value.rejected.length
                    
      if (total > 0) {
        funnelMetrics.value = {
          conversionRate: Math.round((funnelData.value.closed.length / total) * 100),
          avgDays: 15, // 可以从后端获取
          dropOffRate: Math.round((funnelData.value.rejected.length / total) * 100)
        }
      }
    } catch (error) {
      console.error('获取漏斗数据失败:', error)
    } finally {
      loadingFunnel.value = false
    }
  }

  // 获取操作动态（最近7天）
  const fetchActivities = async () => {
    loadingActivities.value = true
    try {
      console.log('\n========== [前端获取操作动态] ==========')
      console.log('[前端] 请求时间:', new Date().toLocaleString('zh-CN'))

      // 使用 dashboard API，它从流程日志表获取数据
      const response = await fetch('/api/dashboard/activities?limit=50')
      const data = await response.json()

      console.log('[前端] 收到数据条数:', data.data?.length || 0)
      if (data.data && data.data.length > 0) {
        console.log('[前端] 最新一条数据:', JSON.stringify(data.data[0], null, 2))
      }

      if (data.success && data.data && Array.isArray(data.data)) {
        // 过滤最近7天的数据
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const filteredData = data.data.filter(item => {
          // 处理缺少 created_at 的情况：使用当前时间作为默认值
          if (!item.created_at) {
            item.created_at = new Date().toISOString()
            return true
          }
          const itemDate = new Date(item.created_at)
          const isValid = itemDate >= sevenDaysAgo
          return isValid
        })

        console.log('[前端] 过滤后数据条数:', filteredData.length)
        if (filteredData.length > 0) {
          console.log('[前端] 过滤后最新一条:', JSON.stringify(filteredData[0], null, 2))
        }

        activityItems.value = filteredData.map((item, idx) => {
          // 根据目标主状态确定阶段类型和颜色
          const mainStatusTo = item.main_status_to
          const subStatusTo = item.sub_status_to
          
          // 确定阶段类型和颜色
          let stageType = 'default'
          let stageLabel = '变更'
          let stageColor = '#909399'
          
          switch (mainStatusTo) {
            case 'resume_screening':
              stageType = 'screening'
              stageLabel = '筛选'
              stageColor = '#909399'
              break
            case 'interviewing':
              stageType = 'interviewing'
              stageLabel = '面试'
              stageColor = '#409EFF'
              break
            case 'salary_negotiation':
              stageType = 'salary'
              stageLabel = '谈薪'
              stageColor = '#E6A23C'
              break
            case 'closed':
              stageType = 'success'
              stageLabel = '成单'
              stageColor = '#67C23A'
              break
            case 'rejected':
              stageType = 'rejected'
              stageLabel = '结束'
              stageColor = '#F56C6C'
              break
          }
          
          // 如果是拒绝操作，调整样式
          if (item.action_type === 'reject' || subStatusTo?.includes('rejected') || subStatusTo?.includes('abandoned')) {
            stageType = 'rejected'
            stageLabel = '结束'
            stageColor = '#F56C6C'
          }
          
          // 如果是重新打开
          if (item.action_type === 'reopen') {
            stageType = 'reopen'
            stageLabel = '重开'
            stageColor = '#13C2C2'
          }
          
          const mappedItem = {
            time: item.created_at,
            avatar: item.operator_name?.charAt(0) || '系',
            avatarColor: item.operator_color || '#409EFF',
            action: item.action_description || '状态变更',
            statusChange: item.action_type === 'status_change' || !item.action_type,
            actionType: item.action_type,
            fromStatus: item.from_status,
            toStatus: item.to_status,
            mainStatusFrom: item.main_status_from,
            mainStatusTo: item.main_status_to,
            subStatusFrom: item.sub_status_from,
            subStatusTo: item.sub_status_to,
            stageType,
            stageLabel,
            stageColor
          }
          
          return mappedItem
        })
      } else {
        activityItems.value = []
      }
    } catch (error) {
      console.error('获取操作动态失败:', error)
      activityItems.value = []
    } finally {
      loadingActivities.value = false
    }
  }

  // 获取图表数据
  const fetchChartData = async () => {
    try {
      // 岗位热度数据
      console.log('【岗位热度】开始请求数据...')
      const heatResponse = await fetch('/api/dashboard/heat-data')
      const heatResult = await heatResponse.json()
      console.log('【岗位热度】API返回结果:', heatResult)
      if (heatResult.success) {
        // 直接使用后端返回的格式：{name, bars: [{type, count}, ...]}
        // 图表组件已配置为堆叠柱状图，能正确处理这种格式
        heatData.value = heatResult.data
        console.log('【岗位热度】设置到heatData:', heatData.value)
      } else {
        console.error('【岗位热度】API返回失败:', heatResult)
      }
      
      // 来源分布数据
      const sourceResponse = await fetch('/api/dashboard/source-data')
      const sourceResult = await sourceResponse.json()
      if (sourceResult.success) {
        sourceData.value = sourceResult.data
      }
      
      // 趋势数据
      console.log('【趋势数据】开始请求...')
      const trendResponse = await fetch('/api/dashboard/trend-data')
      const trendResult = await trendResponse.json()
      console.log('【趋势数据】API返回:', trendResult)
      if (trendResult.success) {
        // 转换字段名：后端返回 newInterviews，图表期望 count
        trendData.value = trendResult.data.map(item => ({
          date: item.date,
          count: item.newInterviews || 0  // 图表显示面试数
        }))
        console.log('【趋势数据】转换后:', trendData.value)
      }
    } catch (error) {
      console.error('获取图表数据失败:', error)
    }
  }

  // 刷新所有数据
  const refreshAllData = async () => {
    await Promise.all([
      fetchStats(),
      fetchFunnelData(),
      fetchActivities(),
      fetchChartData()
    ])
  }

  // 仅刷新漏斗数据
  const refreshFunnelData = async () => {
    await fetchFunnelData()
  }

  onMounted(() => {
    refreshAllData()
  })

  return {
    // 数据
    activityItems,
    heatData,
    sourceData,
    trendData,
    funnelData,
    newStatsData,
    funnelMetrics,
    
    // 加载状态
    loadingActivities,
    loadingFunnel,
    
    // 方法
    refreshAllData,
    refreshFunnelData
  }
}
