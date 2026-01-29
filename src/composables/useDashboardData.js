import { ref, computed, onMounted } from 'vue'
import { api } from '../utils/api'

/**
 * 仪表盘数据管理Hook
 * 提供招聘管理中心所需的各种数据
 */
export function useDashboardData() {
  // 状态数据
  const loading = ref(false)
  const error = ref(null)
  const lastUpdated = ref(null)
  
  // 活动动态数据
  const activityItems = ref([])
  
  // 岗位热度数据
  const heatData = ref([])

  // 统计数据
  const statsData = ref({
    resumes: {
      value: 0,
      change: 0
    },
    interviews: {
      value: 0,
      change: 0
    },
    offers: {
      value: 0,
      change: 0
    }
  })

  // 来源分布数据
  const sourceData = ref([])

  // 面试趋势数据
  const trendData = ref([])

  // 漏斗数据
  const funnelData = ref({
    initial: [],
    second: [],
    final: []
  })

  // 计算属性：总简历数
  const totalResumes = computed(() => {
    return statsData.value.resumes.value
  })

  // 计算属性：总面试数
  const totalInterviews = computed(() => {
    return statsData.value.interviews.value
  })

  // 计算属性：总Offer数
  const totalOffers = computed(() => {
    return statsData.value.offers.value
  })

  // 方法：获取今日统计数据
  async function fetchDailyStats() {
    try {
      loading.value = true
      error.value = null
      const data = await api.get('/stats/daily')
      
      // 适配 API 返回的数据结构
      const normalizedData = {
        resumes: {
          value: data.resumes?.value || data.resumes?.count || 0,
          change: data.resumes?.change || data.resumes?.growth || 0
        },
        interviews: {
          value: data.interviews?.value || data.interviews?.count || 0,
          change: data.interviews?.change || data.interviews?.growth || 0
        },
        offers: {
          value: data.offers?.value || data.offers?.count || 0,
          change: data.offers?.change || data.offers?.growth || 0
        }
      }
      
      statsData.value = normalizedData
      lastUpdated.value = new Date()
    } catch (err) {
      console.error('获取今日统计数据失败:', err)
      error.value = err.message
      // 使用默认数据作为 fallback
      setDefaultStats()
    } finally {
      loading.value = false
    }
  }

  // 方法：获取活动动态
  async function fetchActivities() {
    try {
      loading.value = true
      error.value = null
      const data = await api.get('/activities')
      activityItems.value = data
    } catch (err) {
      console.error('获取活动动态失败:', err)
      error.value = err.message
      // 使用默认数据作为 fallback
      setDefaultActivities()
    } finally {
      loading.value = false
    }
  }

  // 方法：获取岗位热度数据
  async function fetchHeatData() {
    try {
      loading.value = true
      error.value = null
      const data = await api.get('/stats/heat')
      heatData.value = data.map(item => ({
        name: item.positionName,
        bars: item.breakdown.map(b => ({
          width: item.total > 0 ? (b.count / item.total) * 100 : 0,
          color: b.color,
          name: b.name
        }))
      }))
    } catch (err) {
      console.error('获取岗位热度数据失败:', err)
      error.value = err.message
      // 使用默认数据作为 fallback
      setDefaultHeatData()
    } finally {
      loading.value = false
    }
  }

  // 方法：获取简历来源分布
  async function fetchSourceData() {
    try {
      loading.value = true
      error.value = null
      const data = await api.get('/stats/source')
      sourceData.value = data
    } catch (err) {
      console.error('获取简历来源数据失败:', err)
      error.value = err.message
      // 使用默认数据作为 fallback
      setDefaultSourceData()
    } finally {
      loading.value = false
    }
  }

  // 方法：获取面试趋势数据
  async function fetchTrendData() {
    try {
      loading.value = true
      error.value = null
      const data = await api.get('/stats/trend')
      trendData.value = data
    } catch (err) {
      console.error('获取面试趋势数据失败:', err)
      error.value = err.message
      // 使用默认数据作为 fallback
      setDefaultTrendData()
    } finally {
      loading.value = false
    }
  }

  // 方法：获取招聘漏斗数据
  async function fetchFunnelData() {
    try {
      loading.value = true
      error.value = null
      const data = await api.get('/stats/funnel')
      funnelData.value = data
    } catch (err) {
      console.error('获取招聘漏斗数据失败:', err)
      error.value = err.message
      // 使用默认数据作为 fallback
      setDefaultFunnelData()
    } finally {
      loading.value = false
    }
  }

  // 方法：刷新所有数据
  async function refreshAllData() {
    await Promise.all([
      fetchDailyStats(),
      fetchActivities(),
      fetchHeatData(),
      fetchSourceData(),
      fetchTrendData(),
      fetchFunnelData()
    ])
  }

  // 方法：更新活动动态
  function updateActivity(action) {
    const newActivity = {
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      avatar: action.avatar || '系',
      avatarColor: action.color || '#909399',
      action: action.text,
      icon: action.icon || 'Clock'
    }
    activityItems.value.unshift(newActivity)
    // 保持最多10条记录
    if (activityItems.value.length > 10) {
      activityItems.value = activityItems.value.slice(0, 10)
    }
  }

  // 方法：更新统计数据
  function updateStats(type, value, change) {
    if (statsData.value[type]) {
      statsData.value[type].value = value
      statsData.value[type].change = change
      statsData.value[type].trend = change > 0 ? 'up' : 'down'
    }
  }

  // 设置默认统计数据（fallback）
  function setDefaultStats() {
    statsData.value = {
      resumes: {
        value: 15,
        change: 3
      },
      interviews: {
        value: 8,
        change: 2
      },
      offers: {
        value: 2,
        change: 1
      }
    }
  }

  // 设置默认活动数据（fallback）
  function setDefaultActivities() {
    activityItems.value = [
      {
        time: '18:35',
        avatar: '王',
        avatarColor: '#409EFF',
        action: '为王小明 推送了「前端工程师」岗位',
        icon: 'Clock'
      },
      {
        time: '17:50',
        avatar: '李',
        avatarColor: '#67C23A',
        action: '为「王芳」创建了「入职offer」',
        icon: 'Check'
      },
      {
        time: '16:30',
        avatar: '张',
        avatarColor: '#E6A23C',
        action: '为王强 安排了「复试」面试',
        icon: 'Clock'
      },
      {
        time: '16:15',
        avatar: '赵',
        avatarColor: '#909399',
        action: '新增员工简历「赵杰」',
        icon: 'Plus'
      }
    ]
  }

  // 设置默认热度数据（fallback）
  function setDefaultHeatData() {
    heatData.value = [
      {
        name: '前端开发',
        bars: [
          { width: 40, color: '#409EFF' },
          { width: 30, color: '#67C23A' },
          { width: 20, color: '#E6A23C' },
          { width: 10, color: '#909399' }
        ]
      },
      {
        name: '后端开发',
        bars: [
          { width: 45, color: '#409EFF' },
          { width: 25, color: '#67C23A' },
          { width: 20, color: '#E6A23C' },
          { width: 10, color: '#909399' }
        ]
      },
      {
        name: '产品经理',
        bars: [
          { width: 35, color: '#409EFF' },
          { width: 35, color: '#67C23A' },
          { width: 20, color: '#E6A23C' },
          { width: 10, color: '#909399' }
        ]
      },
      {
        name: 'UI设计',
        bars: [
          { width: 30, color: '#409EFF' },
          { width: 40, color: '#67C23A' },
          { width: 20, color: '#E6A23C' },
          { width: 10, color: '#909399' }
        ]
      }
    ]
  }

  // 设置默认来源数据（fallback）
  function setDefaultSourceData() {
    sourceData.value = [
      { name: 'BOSS直聘', value: 40, color: '#409EFF' },
      { name: '拉勾网', value: 30, color: '#67C23A' },
      { name: '猎头推荐', value: 20, color: '#E6A23C' },
      { name: '其他渠道', value: 10, color: '#909399' }
    ]
  }

  // 设置默认趋势数据（fallback）
  function setDefaultTrendData() {
    trendData.value = [
      { date: '2024-01-01', count: 10 },
      { date: '2024-01-02', count: 12 },
      { date: '2024-01-03', count: 15 },
      { date: '2024-01-04', count: 14 },
      { date: '2024-01-05', count: 16 },
      { date: '2024-01-06', count: 18 },
      { date: '2024-01-07', count: 20 },
      { date: '2024-01-08', count: 22 },
      { date: '2024-01-09', count: 25 },
      { date: '2024-01-10', count: 24 },
      { date: '2024-01-11', count: 26 },
      { date: '2024-01-12', count: 28 }
    ]
  }

  // 设置默认漏斗数据（fallback）
  function setDefaultFunnelData() {
    funnelData.value = {
      initial: [
        { id: 1, name: '张明', position: '前端工程师', status: 'pending' },
        { id: 2, name: '李华', position: '产品经理', status: 'pending' }
      ],
      second: [
        { id: 3, name: '王强', position: '后端工程师', status: 'in-progress' },
        { id: 4, name: '赵静', position: 'UI设计师', status: 'in-progress' }
      ],
      final: [
        { id: 5, name: '刘伟', position: '测试工程师', status: 'completed' }
      ]
    }
  }

  // 初始化数据
  onMounted(async () => {
    await refreshAllData()
  })

  return {
    // 状态
    loading,
    error,
    lastUpdated,
    
    // 数据
    activityItems,
    heatData,
    statsData,
    sourceData,
    trendData,
    funnelData,
    
    // 计算属性
    totalResumes: computed(() => statsData.value.resumes.value),
    totalInterviews: computed(() => statsData.value.interviews.value),
    totalOffers: computed(() => statsData.value.offers.value),
    
    // 方法
    fetchDailyStats,
    fetchActivities,
    fetchHeatData,
    fetchSourceData,
    fetchTrendData,
    fetchFunnelData,
    refreshAllData,
    updateActivity,
    updateStats
  }
}
