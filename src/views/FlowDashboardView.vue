<template>
  <div class="flow-dashboard-container">
    <div class="dashboard-toolbar">
      <div class="toolbar-left">
        <h1>流程管理</h1>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索候选人..."
          prefix-icon="Search"
          clearable
          class="search-input"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="selectedPosition" placeholder="全部职位" clearable class="position-select">
          <el-option label="全部职位" value="" />
          <el-option 
            v-for="pos in positions" 
            :key="pos.id" 
            :label="pos.name" 
            :value="pos.id" 
          />
        </el-select>
        <el-select v-model="sortBy" class="sort-select">
          <el-option label="默认排序" value="default" />
          <el-option label="停留最久↑" value="daysDesc" />
          <el-option label="停留最短↓" value="daysAsc" />
          <el-option label="最新更新" value="timeDesc" />
          <el-option label="最早更新" value="timeAsc" />
        </el-select>
      </div>
    </div>

    <div class="status-summary">
      <div 
        class="status-card" 
        :class="{ active: statusFilter === 'all' }"
      >
        <div class="status-icon">
          <el-icon><Document /></el-icon>
        </div>
        <div class="status-info">
          <h3>全部</h3>
          <p class="status-count">{{ totalCount }}</p>
        </div>
      </div>
      
      <div 
        class="status-card" 
        :class="{ active: statusFilter === '待面试' }"
      >
        <div class="status-icon interview-pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="status-info">
          <h3>待面试</h3>
          <p class="status-count">{{ statusCounts.interviewPending || 0 }}</p>
        </div>
      </div>
      
      <div 
        class="status-card" 
        :class="{ active: statusFilter === '面试中' }"
      >
        <div class="status-icon interviewing">
          <el-icon><VideoCamera /></el-icon>
        </div>
        <div class="status-info">
          <h3>面试中</h3>
          <p class="status-count">{{ statusCounts.interviewing || 0 }}</p>
        </div>
      </div>
      
      <div 
        class="status-card" 
        :class="{ active: statusFilter === '谈薪中' }"
      >
        <div class="status-icon salary-negotiation">
          <el-icon><Money /></el-icon>
        </div>
        <div class="status-info">
          <h3>谈薪中</h3>
          <p class="status-count">{{ statusCounts.salaryNegotiation || 0 }}</p>
        </div>
      </div>
      
      <div 
        class="status-card" 
        :class="{ active: statusFilter === '已成单' }"
      >
        <div class="status-icon completed">
          <el-icon><Check /></el-icon>
        </div>
        <div class="status-info">
          <h3>已成单</h3>
          <p class="status-count">{{ statusCounts.completed || 0 }}</p>
        </div>
      </div>
    </div>

    <div class="boards-container">
      <div v-for="board in filteredBoards" :key="board.status" class="board">
        <div class="board-header">
          <div class="board-title">
            <div class="board-status-icon" :class="getStatusClass(board.status)">
              <el-icon v-if="getStatusIcon(board.status) === 'Clock'"><Clock /></el-icon>
              <el-icon v-else-if="getStatusIcon(board.status) === 'VideoCamera'"><VideoCamera /></el-icon>
              <el-icon v-else-if="getStatusIcon(board.status) === 'Money'"><Money /></el-icon>
              <el-icon v-else><Document /></el-icon>
            </div>
            <h3>{{ board.title }}</h3>
            <span class="board-count">{{ board.items.length }}</span>
          </div>
        </div>
        
        <div class="board-items">
          <div v-if="board.loading" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon>
            <p>加载中...</p>
          </div>
          
          <div v-else-if="board.items.length > 0" class="candidate-cards">
            <div 
              v-for="item in board.items" 
              :key="item.id" 
              class="candidate-card"
              :class="{ 'warning-line': item.daysInStage >= 7, 'urgent-line': item.daysInStage >= 14 }"
            >
              <div class="card-indicator" :class="getDaysClass(item.daysInStage)"></div>
              <div class="candidate-header">
                <div class="candidate-avatar" :class="getAvatarClass(board.status)">
                  {{ getAvatarText(item.candidateName || item.resumeName) }}
                </div>
                <div class="candidate-info">
                  <h4>{{ item.candidateName || item.resumeName }}</h4>
                  <span class="candidate-position">{{ item.positionName }}</span>
                </div>
                <div class="days-badge" :class="getDaysClass(item.daysInStage)">
                  {{ item.daysInStage }}天
                </div>
              </div>
              
              <div v-if="item.tags && item.tags.length > 0" class="candidate-tags">
                <el-tag 
                  v-for="tag in item.tags" 
                  :key="tag" 
                  size="small"
                  :type="getTagType(tag)"
                >
                  {{ tag }}
                </el-tag>
              </div>
              
              <div class="candidate-meta">
                <div class="meta-item">
                  <span class="meta-label">下次面试</span>
                  <span class="meta-value" :class="{ 'text-warning': item.nextInterviewTime === '待沟通' }">
                    {{ item.nextInterviewTime || '待沟通' }}
                  </span>
                </div>
              </div>
              
              <div v-if="item.attention" class="candidate-attention" :class="getAttentionClass(item.attention)">
                <el-icon><Warning /></el-icon>
                <span>{{ item.attention }}</span>
              </div>
              
              <div class="candidate-actions">
                <template v-if="getNextStatuses(board.status).length > 0">
                  <el-button 
                    :type="getNextStatuses(board.status)[0].type || 'primary'"
                    size="small"
                    @click="handleStatusChange(item, getNextStatuses(board.status)[0].value)"
                  >
                    {{ getNextStatuses(board.status)[0].label }}
                  </el-button>
                  <el-dropdown 
                    v-if="getNextStatuses(board.status).length > 1"
                    trigger="click"
                    @command="(cmd) => handleStatusChange(item, cmd)"
                  >
                    <el-button size="small">
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item 
                          v-for="(status, index) in getNextStatuses(board.status).slice(1)" 
                          :key="status.value"
                          :command="status.value"
                          :disabled="status.value === '已拒绝'"
                        >
                          <span :class="{ 'text-danger': status.type === 'danger' }">{{ status.label }}</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-board">
            <el-icon><DocumentRemove /></el-icon>
            <p>暂无候选人</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useInterviewFlow } from '../hooks/useInterviewFlow'
import { usePositionStore } from '../stores/position'
import { interviewFlowApi } from '../utils/interviewFlowApi'
import { api } from '../utils/api'
import { ElMessage } from 'element-plus'
import { House, Clock, VideoCamera, Money, Check, DocumentRemove, Loading, Warning, Document, Search, MoreFilled } from '@element-plus/icons-vue'

const { backToDashboard } = useInterviewFlow()
const positionStore = usePositionStore()

const searchKeyword = ref('')
const selectedPosition = ref('')
const sortBy = ref('default')
const statusFilter = ref('all')
const positions = ref([])

const statusCounts = ref({
  interviewPending: 0,
  interviewing: 0,
  salaryNegotiation: 0,
  completed: 0
})

const rawBoards = reactive([
  {
    status: '待面试',
    title: '待面试候选人',
    items: [],
    loading: false
  },
  {
    status: '面试中',
    title: '面试中候选人',
    items: [],
    loading: false
  },
  {
    status: '谈薪中',
    title: '谈薪中候选人',
    items: [],
    loading: false
  }
])

const totalCount = computed(() => {
  return rawBoards.reduce((sum, board) => sum + board.items.length, 0)
})

const filteredBoards = computed(() => {
  return rawBoards.map(board => {
    let items = [...board.items]
    
    if (statusFilter.value && statusFilter.value !== 'all' && board.status !== statusFilter.value) {
      return { ...board, items: [] }
    }
    
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      items = items.filter(item => 
        (item.candidateName && item.candidateName.toLowerCase().includes(keyword)) ||
        (item.resumeName && item.resumeName.toLowerCase().includes(keyword)) ||
        (item.positionName && item.positionName.toLowerCase().includes(keyword)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(keyword)))
      )
    }
    
    if (selectedPosition.value) {
      items = items.filter(item => item.positionId === selectedPosition.value)
    }
    
    if (sortBy.value === 'daysDesc') {
      items.sort((a, b) => b.daysInStage - a.daysInStage)
    } else if (sortBy.value === 'daysAsc') {
      items.sort((a, b) => a.daysInStage - b.daysInStage)
    } else if (sortBy.value === 'timeDesc') {
      items.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime))
    } else if (sortBy.value === 'timeAsc') {
      items.sort((a, b) => new Date(a.updateTime) - new Date(b.updateTime))
    }
    
    return { ...board, items }
  })
})

const handleSearch = () => {
  // 搜索由 computed 处理
}

const fetchPositions = async () => {
  try {
    if (positionStore.positions.length === 0) {
      await positionStore.fetchPositions()
    }
    positions.value = positionStore.positions
  } catch (error) {
    console.error('获取职位列表失败:', error)
  }
}

const fetchCandidatesByBoard = async (board) => {
  board.loading = true
  try {
    const response = await interviewFlowApi.getCandidatesByStatus({
      status: board.status
    })
    
    board.items = (response || []).map(c => ({
      id: c.id,
      candidateName: c.candidate_name,
      resumeName: c.resume_name,
      positionName: c.position_name,
      positionId: c.position_id,
      positionCompany: c.position_company,
      daysInStage: calculateDaysInStage(c),
      status: c.current_status,
      flowStartAt: c.flow_start_at,
      updateTime: c.update_time,
      nextInterviewTime: formatNextInterviewTime(c.next_interview_at),
      attention: getAttentionText(c),
      tags: generateTags(c)
    }))
  } catch (error) {
    console.error(`获取${board.title}失败:`, error)
  } finally {
    board.loading = false
  }
}

const fetchAllBoardData = async () => {
  await Promise.all(rawBoards.map(board => fetchCandidatesByBoard(board)))
}

const generateTags = (candidate) => {
  const tags = []
  const pd = candidate.parsed_data_obj || candidate.parsed_data || {}
  
  if (pd.years && pd.years !== '不限') {
    tags.push(pd.years)
  }
  
  if (pd.latest_company) {
    const company = pd.latest_company
    if (company.includes('阿里') || company.includes('腾讯') || company.includes('字节') || 
        company.includes('百度') || company.includes('华为')) {
      tags.push(company.substring(0, 4))
    }
  }
  
  if (candidate.match_score >= 80) {
    tags.push('高分')
  }
  
  if (candidate.evaluation) {
    try {
      const evalData = typeof candidate.evaluation === 'string' ? JSON.parse(candidate.evaluation) : candidate.evaluation
      if (evalData?.urgent) {
        tags.push('急招')
      }
    } catch (e) {}
  }
  
  return tags.slice(0, 3)
}

const getTagType = (tag) => {
  if (tag === '高分') return 'success'
  if (tag === '急招') return 'danger'
  if (tag.includes('年')) return ''
  if (tag.includes('阿里') || tag.includes('腾讯') || tag.includes('字节')) return 'warning'
  return ''
}

const calculateDaysInStage = (candidate) => {
  if (candidate.update_time) {
    const updateTime = new Date(candidate.update_time)
    return Math.floor((new Date() - updateTime) / (1000 * 60 * 60 * 24))
  }
  if (!candidate.flow_start_at) {
    const matchedAt = new Date(candidate.matched_at)
    return Math.floor((new Date() - matchedAt) / (1000 * 60 * 60 * 24))
  }
  const flowStartAt = new Date(candidate.flow_start_at)
  return Math.floor((new Date() - flowStartAt) / (1000 * 60 * 60 * 24))
}

const formatNextInterviewTime = (dateStr) => {
  if (!dateStr) return '待沟通'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '待沟通'
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getAttentionText = (candidate) => {
  const status = candidate.current_status
  const daysInStage = calculateDaysInStage(candidate)
  
  if (status === '待面试') {
    if (daysInStage > 14) return '面试安排延迟'
    if (daysInStage > 7) return '面试安排中'
    return null
  } else if (status === '面试中') {
    if (daysInStage > 21) return '面试周期过长'
    if (daysInStage > 14) return '面试周期较长'
    return null
  } else if (status === '谈薪中') {
    if (daysInStage > 7) return '谈薪时间较长'
    return null
  }
  return null
}

const getDaysClass = (days) => {
  if (days >= 14) return 'danger'
  if (days >= 7) return 'warning'
  if (days >= 3) return 'caution'
  return ''
}

const getAttentionClass = (attention) => {
  if (attention.includes('延迟') || attention.includes('过长')) return 'danger'
  if (attention.includes('安排') || attention.includes('较长')) return 'warning'
  return ''
}

const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

const getAvatarClass = (status) => {
  const classes = {
    '待面试': 'avatar-interview-pending',
    '面试中': 'avatar-interviewing',
    '谈薪中': 'avatar-salary-negotiation'
  }
  return classes[status] || ''
}

const getStatusClass = (status) => {
  const classes = {
    '待面试': 'interview-pending',
    '面试中': 'interviewing',
    '谈薪中': 'salary-negotiation'
  }
  return classes[status] || ''
}

const getStatusIcon = (status) => {
  const icons = {
    '待面试': 'Clock',
    '面试中': 'VideoCamera',
    '谈薪中': 'Money'
  }
  return icons[status] || 'Document'
}

const nextStatusMap = {
  '待面试': [
    { value: '面试中', label: '进入面试', type: 'primary' },
    { value: '已拒绝', label: '不合适', type: 'danger' }
  ],
  '面试中': [
    { value: '谈薪中', label: '进入谈薪', type: 'primary' },
    { value: '已通过', label: '面试通过', type: 'success' },
    { value: '已拒绝', label: '不合适', type: 'danger' }
  ],
  '谈薪中': [
    { value: '已成单', label: '确认成单', type: 'success' },
    { value: '已拒绝', label: '放弃', type: 'danger' }
  ]
}

const getNextStatuses = (currentStatus) => {
  return nextStatusMap[currentStatus] || []
}

const handleStatusChange = async (item, toStatus) => {
  try {
    const result = await api.post('/flow-logs/match/flow-log', {
      matchId: item.id,
      fromStatus: item.status,
      toStatus: toStatus,
      note: '',
      jdSupplement: ''
    })
    
    ElMessage.success(`已将 ${item.candidateName || item.resumeName} 变更为 ${toStatus}`)
    
    await fetchAllBoardData()
    
    const statsResponse = await interviewFlowApi.getDashboardStats()
    statusCounts.value = statsResponse
  } catch (error) {
    console.error('状态变更失败:', error)
    ElMessage.error('状态变更失败')
  }
}

watch([searchKeyword, selectedPosition, sortBy, statusFilter], () => {
  // 触发响应式更新
})

onMounted(async () => {
  try {
    await fetchPositions()
    
    const statsResponse = await interviewFlowApi.getDashboardStats()
    statusCounts.value = statsResponse
    
    await fetchAllBoardData()
  } catch (error) {
    console.error('加载看板数据失败:', error)
  }
})
</script>

<style scoped>
.flow-dashboard-container {
  padding: 16px 20px;
  background: #ffffff;
  height: 100%;
  overflow-y: auto;
}

.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.toolbar-left h1 {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  width: 180px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

.position-select {
  width: 140px;
}

.sort-select {
  width: 120px;
}

.status-summary {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.status-card {
  flex: 1;
  min-width: 90px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-card:hover {
  background: #fff;
  border-color: #e4e7ed;
}

.status-card.active {
  background: #ecf5ff;
  border-color: #409EFF;
}

.status-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.status-icon.interview-pending {
  background: #ecf5ff;
  color: #409EFF;
}

.status-icon.interviewing {
  background: #fdf6ec;
  color: #E6A23C;
}

.status-icon.salary-negotiation {
  background: #fdf6ec;
  color: #E6A23C;
}

.status-icon.completed {
  background: #f0f9eb;
  color: #67C23A;
}

.status-info h3 {
  font-size: 11px;
  font-weight: 400;
  color: #909399;
  margin: 0;
}

.status-count {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.boards-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.board {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.board-header {
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
  flex-shrink: 0;
}

.board-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.board-status-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.board-status-icon.interview-pending {
  background: #ecf5ff;
  color: #409EFF;
}

.board-status-icon.interviewing {
  background: #fdf6ec;
  color: #E6A23C;
}

.board-status-icon.salary-negotiation {
  background: #fdf6ec;
  color: #E6A23C;
}

.board-title h3 {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin: 0;
  flex: 1;
}

.board-count {
  background: #f5f7fa;
  color: #606266;
  font-size: 11px;
  font-weight: 400;
  padding: 2px 6px;
  border-radius: 4px;
}

.board-items {
  padding: 10px 12px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  color: #c0c4cc;
}

.loading-state .is-loading {
  font-size: 18px;
  margin-bottom: 6px;
}

.candidate-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.candidate-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 10px;
  cursor: default;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  position: relative;
}

.candidate-card:hover {
  background: #fff;
  border-color: #e4e7ed;
}

.candidate-card.warning-line {
  border-left: 3px solid #E6A23C;
}

.candidate-card.urgent-line {
  border-left: 3px solid #F56C6C;
}

.card-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 6px 0 0 6px;
}

.card-indicator.danger {
  background: #F56C6C;
}

.card-indicator.warning {
  background: #E6A23C;
}

.card-indicator.caution {
  background: #909399;
}

.candidate-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.candidate-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  flex-shrink: 0;
}

.candidate-avatar.avatar-interview-pending {
  background: #409EFF;
}

.candidate-avatar.avatar-interviewing {
  background: #E6A23C;
}

.candidate-avatar.avatar-salary-negotiation {
  background: #E6A23C;
}

.candidate-info {
  flex: 1;
  min-width: 0;
}

.candidate-info h4 {
  font-size: 12px;
  font-weight: 500;
  margin: 0 0 2px 0;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.candidate-position {
  font-size: 10px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.days-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.days-badge.danger {
  background: #fef0f0;
  color: #F56C6C;
}

.days-badge.warning {
  background: #fdf6ec;
  color: #E6A23C;
}

.days-badge.caution {
  background: #f4f4f5;
  color: #909399;
}

.candidate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.candidate-tags .el-tag {
  margin: 0;
  font-size: 10px;
  padding: 0 4px;
  height: 18px;
  line-height: 16px;
}

.candidate-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.meta-label {
  font-size: 10px;
  color: #909399;
}

.meta-value {
  font-size: 11px;
  font-weight: 500;
  color: #303133;
}

.meta-value.text-warning {
  color: #E6A23C;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.meta-label {
  font-size: 10px;
  color: #909399;
}

.meta-value {
  font-size: 11px;
  font-weight: 500;
  color: #303133;
}

.meta-value.text-warning {
  color: #E6A23C;
}

.candidate-attention {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 10px;
  margin-top: 4px;
  width: fit-content;
}

.candidate-attention.danger {
  background: #fef0f0;
  color: #F56C6C;
}

.candidate-attention.warning {
  background: #fdf6ec;
  color: #E6A23C;
}

.candidate-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #ebeef5;
  justify-content: flex-end;
}

.candidate-actions .el-button--primary {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  max-width: 120px;
}

.candidate-actions .el-dropdown .el-button {
  padding: 4px 6px;
  font-size: 11px;
}

.candidate-actions .el-dropdown .el-icon {
  font-size: 14px;
}

.text-danger {
  color: #F56C6C;
}

.empty-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  color: #c0c4cc;
  text-align: center;
}

.empty-board .el-icon {
  font-size: 28px;
  margin-bottom: 6px;
  opacity: 0.5;
}

.empty-board p {
  margin: 0;
  font-size: 11px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flow-dashboard-container {
    padding: 12px 16px;
  }
  
  .dashboard-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-input {
    flex: 1;
    min-width: 120px;
  }
  
  .position-select, .sort-select {
    width: 100px;
  }
  
  .status-summary {
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 8px;
  }
  
  .status-card {
    flex-shrink: 0;
    min-width: 80px;
  }
  
  .boards-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .board {
    max-height: 300px;
  }
}
</style>