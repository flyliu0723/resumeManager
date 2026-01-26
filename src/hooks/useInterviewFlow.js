import { ref, computed } from 'vue'
import { interviewFlowApi } from '../utils/interviewFlowApi'
import { api } from '../utils/api'

export function useInterviewFlow() {
  const loading = ref(false)
  const candidates = ref([])
  const positions = ref([])
  const overview = ref({
    total: 0,
    active: 0,
    averageDaysInProcess: 0
  })
  const riskFactors = ref([])
  const timelineEvents = ref([])

  const searchQuery = ref('')
  const positionFilter = ref('all')
  const statusFilter = ref('ongoing')
  const activeDetails = ref(['overview'])
  const statsFilter = ref('stable')

  const filteredCandidates = computed(() => {
    return candidates.value.filter(candidate => {
      const matchesSearch = candidate.candidate_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          candidate.resume_name?.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchesSearch
    })
  })

  const activeCandidatesCount = computed(() => {
    return overview.value.active || 0
  })

  const averageDaysInProcess = computed(() => {
    return overview.value.averageDaysInProcess || 0
  })

  const fetchCandidates = async () => {
    try {
      loading.value = true
      const params = {
        positionId: positionFilter.value === 'all' ? undefined : positionFilter.value,
        status: statusFilter.value
      }
      const data = await interviewFlowApi.getCandidates(params)
      candidates.value = data || []
    } catch (error) {
      console.error('获取候选人数据失败:', error)
      candidates.value = []
    } finally {
      loading.value = false
    }
  }

  const fetchOverview = async () => {
    try {
      const params = {
        positionId: positionFilter.value === 'all' ? undefined : positionFilter.value
      }
      const data = await interviewFlowApi.getOverview(params)
      overview.value = data || { total: 0, active: 0, averageDaysInProcess: 0 }
    } catch (error) {
      console.error('获取概览数据失败:', error)
      overview.value = { total: 0, active: 0, averageDaysInProcess: 0 }
    }
  }

  const fetchRiskFactors = async () => {
    try {
      const params = {
        positionId: positionFilter.value === 'all' ? undefined : positionFilter.value
      }
      const data = await interviewFlowApi.getRiskFactors(params)
      riskFactors.value = data || ['当前无明显风险因素']
    } catch (error) {
      console.error('获取风险因素失败:', error)
      riskFactors.value = ['获取风险因素失败']
    }
  }

  const fetchTimeline = async () => {
    try {
      const params = {
        positionId: positionFilter.value === 'all' ? undefined : positionFilter.value,
        statusFilter: statsFilter.value
      }
      const data = await interviewFlowApi.getTimeline(params)
      timelineEvents.value = data || []
    } catch (error) {
      console.error('获取时间线数据失败:', error)
      timelineEvents.value = []
    }
  }

  const fetchPositions = async () => {
    try {
      const data = await api.get('/positions')
      positions.value = data || []
    } catch (error) {
      console.error('获取职位列表失败:', error)
      positions.value = []
    }
  }

  const fetchAllData = async () => {
    await Promise.all([
      fetchCandidates(),
      fetchOverview(),
      fetchRiskFactors(),
      fetchTimeline()
    ])
  }

  const getStatusType = (status) => {
    const types = {
      'At Risk': 'warning',
      'Waiting': 'info',
      'Stable': 'success',
      'Stalling': 'danger'
    }
    return types[status] || 'default'
  }

  const backToDashboard = () => {
    window.location.href = '/'
  }

  return {
    loading,
    candidates,
    positions,
    overview,
    riskFactors,
    timelineEvents,
    searchQuery,
    positionFilter,
    statusFilter,
    activeDetails,
    statsFilter,
    filteredCandidates,
    activeCandidatesCount,
    averageDaysInProcess,
    fetchCandidates,
    fetchOverview,
    fetchRiskFactors,
    fetchTimeline,
    fetchPositions,
    fetchAllData,
    getStatusType,
    backToDashboard
  }
}
