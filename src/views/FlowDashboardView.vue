<template>
  <div class="flow-dashboard-container">
    <div class="dashboard-toolbar">
      <div class="toolbar-left">
        <h1>流程看板</h1>
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
        @click="statusFilter = 'all'"
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
        :class="{ active: statusFilter === 'interviewing' }"
        @click="statusFilter = 'interviewing'"
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
        :class="{ active: statusFilter === 'salary_negotiation' }"
        @click="statusFilter = 'salary_negotiation'"
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
        :class="{ active: statusFilter === 'closed' }"
        @click="statusFilter = 'closed'"
      >
        <div class="status-icon completed">
          <el-icon><Check /></el-icon>
        </div>
        <div class="status-info">
          <h3>已成单</h3>
          <p class="status-count">{{ statusCounts.completed || 0 }}</p>
        </div>
      </div>
      
      <div 
        class="status-card" 
        :class="{ active: statusFilter === 'rejected' }"
        @click="statusFilter = 'rejected'"
      >
        <div class="status-icon rejected">
          <el-icon><CircleClose /></el-icon>
        </div>
        <div class="status-info">
          <h3>不合适</h3>
          <p class="status-count">{{ statusCounts.rejected || 0 }}</p>
        </div>
      </div>
    </div>

    <div class="boards-container">
      <div v-for="board in filteredBoards" :key="board.key" class="board">
        <div class="board-header">
          <div class="board-title">
            <div class="board-status-icon" :class="getStatusClass(board.mainStatus)">
              <el-icon v-if="board.icon === 'Clock'"><Clock /></el-icon>
              <el-icon v-else-if="board.icon === 'VideoCamera'"><VideoCamera /></el-icon>
              <el-icon v-else-if="board.icon === 'Money'"><Money /></el-icon>
              <el-icon v-else-if="board.icon === 'CircleClose'"><CircleClose /></el-icon>
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
                <div class="candidate-avatar" :class="getAvatarClass(board.mainStatus)">
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
                  <span class="meta-label">当前状态</span>
                  <span class="meta-value">{{ item.statusText }}</span>
                </div>
                <div v-if="item.nextInterviewTime" class="meta-item">
                  <span class="meta-label">下次面试</span>
                  <span class="meta-value" :class="{ 'text-warning': !item.nextInterviewTime }">
                    {{ item.nextInterviewTime || '待定' }}
                  </span>
                </div>
              </div>
              
              <div v-if="item.attention" class="candidate-attention" :class="getAttentionClass(item.attention)">
                <el-icon><Warning /></el-icon>
                <span>{{ item.attention }}</span>
              </div>
              
              <div class="candidate-actions">
                <template v-if="getNormalActions(board.mainStatus, item.subStatus).length > 0 || getRejectActions(board.mainStatus, item.subStatus).length > 0">
                  <!-- 主要操作按钮组 -->
                  <div class="action-buttons-row">
                    <template v-for="(action, idx) in getNormalActions(board.mainStatus, item.subStatus).slice(0, 2)" :key="action.value">
                      <el-button 
                        :type="action.type || 'primary'"
                        size="small"
                        class="action-btn"
                        @click="handleStatusChange(item, action)"
                      >
                        <el-icon v-if="action.icon" class="btn-icon"><component :is="action.icon" /></el-icon>
                        {{ action.label }}
                      </el-button>
                    </template>
                  </div>
                  
                  <!-- 更多操作下拉菜单 -->
                  <el-dropdown 
                    v-if="getNormalActions(board.mainStatus, item.subStatus).length > 2 || getRejectActions(board.mainStatus, item.subStatus).length > 0"
                    trigger="click"
                    @command="(cmd) => handleStatusChange(item, cmd)"
                    class="more-actions-dropdown"
                  >
                    <el-button size="small" class="more-btn">
                      <el-icon><MoreFilled /></el-icon>
                      更多
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu class="action-dropdown-menu">
                        <!-- 额外的正常操作 -->
                        <el-dropdown-item 
                          v-for="action in getNormalActions(board.mainStatus, item.subStatus).slice(2)" 
                          :key="action.value"
                          :command="action"
                        >
                          <el-icon v-if="action.icon"><component :is="action.icon" /></el-icon>
                          <span>{{ action.label }}</span>
                        </el-dropdown-item>
                        
                        <!-- 分隔线 -->
                        <el-dropdown-item v-if="getNormalActions(board.mainStatus, item.subStatus).length > 2 && getRejectActions(board.mainStatus, item.subStatus).length > 0" divided />
                        
                        <!-- 拒绝/不合适操作（红色警示） -->
                        <el-dropdown-item 
                          v-for="action in getRejectActions(board.mainStatus, item.subStatus)" 
                          :key="action.value"
                          :command="action"
                          class="reject-action-item"
                        >
                          <el-icon><CircleClose /></el-icon>
                          <span class="text-danger">{{ action.label }}</span>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
                <template v-else>
                  <el-tag type="info" size="small" effect="dark">已结束</el-tag>
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

  <!-- 状态变更弹窗 -->
  <CandidateActionDialog
    v-model="actionDialogVisible"
    :candidate="selectedCandidate"
    :initial-main-status="targetMainStatus"
    :initial-sub-status="targetSubStatus"
    @success="handleActionSuccess"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { usePositionStore } from '../stores/position'
import { api } from '../utils/api'
import { ElMessage } from 'element-plus'
import { StatusUtils, MAIN_STATUS, SUB_STATUS } from '../constants/interviewStatus'
import CandidateActionDialog from '../components/CandidateActionDialog.vue'
import { 
  Clock, VideoCamera, Money, Check, DocumentRemove, Loading, Warning, 
  Document, Search, MoreFilled, CircleClose, ArrowRight, CircleCheck, 
  ChatDotRound, Calendar, User 
} from '@element-plus/icons-vue'

const positionStore = usePositionStore()

const searchKeyword = ref('')
const selectedPosition = ref('')
const sortBy = ref('default')
const statusFilter = ref('all')
const positions = ref([])

const statusCounts = ref({
  interviewing: 0,
  salaryNegotiation: 0,
  completed: 0,
  rejected: 0
})

// 状态变更弹窗相关
const actionDialogVisible = ref(false)
const selectedCandidate = ref(null)
const targetMainStatus = ref('')
const targetSubStatus = ref('')

// 新的看板定义 - 基于主状态
const rawBoards = reactive([
  {
    key: 'resume_screening',
    mainStatus: 'resume_screening',
    title: '简历筛选',
    icon: 'Document',
    items: [],
    loading: false
  },
  {
    key: 'interviewing',
    mainStatus: 'interviewing',
    title: '面试中',
    icon: 'VideoCamera',
    items: [],
    loading: false
  },
  {
    key: 'salary_negotiation',
    mainStatus: 'salary_negotiation',
    title: '谈薪中',
    icon: 'Money',
    items: [],
    loading: false
  },
  {
    key: 'closed',
    mainStatus: 'closed',
    title: '已成单',
    icon: 'Check',
    items: [],
    loading: false
  }
])

const totalCount = computed(() => {
  return rawBoards.reduce((sum, board) => sum + board.items.length, 0)
})

const filteredBoards = computed(() => {
  let boards = [...rawBoards]
  
  // 根据状态筛选过滤看板
  if (statusFilter.value && statusFilter.value !== 'all') {
    if (statusFilter.value === 'rejected') {
      // 不合适候选人显示在所有看板中，但根据主状态分组
      // 这里我们不过滤看板，而是只过滤候选人
    } else {
      boards = boards.filter(b => b.mainStatus === statusFilter.value)
    }
  }
  
  return boards.map(board => {
    let items = [...board.items]
    
    // 关键词搜索
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      items = items.filter(item => 
        (item.candidateName && item.candidateName.toLowerCase().includes(keyword)) ||
        (item.resumeName && item.resumeName.toLowerCase().includes(keyword)) ||
        (item.positionName && item.positionName.toLowerCase().includes(keyword)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(keyword)))
      )
    }
    
    // 职位筛选
    if (selectedPosition.value) {
      items = items.filter(item => item.positionId === selectedPosition.value)
    }
    
    // 排序
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
    // 使用新的API - 根据主状态获取候选人
    const response = await api.get('/dashboard/candidates-by-main-status', {
      mainStatus: board.mainStatus,
      excludeTerminal: false
    })
    
    board.items = (response || []).map(c => ({
      id: c.id,
      candidateName: c.candidate_name,
      resumeName: c.resume_name,
      positionName: c.position_name,
      positionId: c.position_id,
      mainStatus: c.main_status,
      subStatus: c.sub_status,
      statusText: getStatusDisplayText(c.main_status, c.sub_status),
      daysInStage: calculateDaysInStage(c),
      flowStartAt: c.flow_start_at,
      updateTime: c.update_time,
      nextInterviewTime: formatNextInterviewTime(c.next_interview_at),
      interviewRound: c.interview_round,
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
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getStatusDisplayText = (mainStatus, subStatus) => {
  const main = StatusUtils.getMainStatus(mainStatus || 'resume_screening')
  const sub = StatusUtils.getSubStatus(mainStatus, subStatus)
  
  if (sub) {
    return `${main.label}/${sub.label}`
  }
  return main.label
}

const getAttentionText = (candidate) => {
  const mainStatus = candidate.main_status
  const subStatus = candidate.sub_status
  const daysInStage = calculateDaysInStage(candidate)
  
  // 检查是否为不合适状态
  if (StatusUtils.isRejectedStatus(mainStatus, subStatus)) {
    return '流程已结束'
  }
  
  // 检查是否为终态
  if (StatusUtils.isTerminalStatus(mainStatus, subStatus)) {
    return '流程已完成'
  }
  
  if (mainStatus === 'resume_screening') {
    if (daysInStage > 7) return '筛选时间较长'
    if (daysInStage > 3) return '待筛选'
    return null
  } else if (mainStatus === 'interviewing') {
    if (daysInStage > 21) return '面试周期过长'
    if (daysInStage > 14) return '面试周期较长'
    if (subStatus === 'round_pending') return '待安排面试'
    if (subStatus === 'round_scheduled') return '已安排面试'
    return null
  } else if (mainStatus === 'salary_negotiation') {
    if (daysInStage > 7) return '谈薪时间较长'
    if (subStatus === 'approval_pending') return '审批中'
    return null
  } else if (mainStatus === 'closed') {
    if (subStatus === 'pending_onboard') return '待入职'
    if (subStatus === 'onboarded') return '已入职'
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
  if (attention.includes('过长') || attention.includes('结束')) return 'danger'
  if (attention.includes('较长') || attention.includes('安排')) return 'warning'
  return ''
}

const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

const getAvatarClass = (mainStatus) => {
  const classes = {
    'resume_screening': 'avatar-screening',
    'interviewing': 'avatar-interviewing',
    'salary_negotiation': 'avatar-salary',
    'closed': 'avatar-closed'
  }
  return classes[mainStatus] || ''
}

const getStatusClass = (mainStatus) => {
  const classes = {
    'resume_screening': 'screening',
    'interviewing': 'interviewing',
    'salary_negotiation': 'salary-negotiation',
    'closed': 'completed'
  }
  return classes[mainStatus] || ''
}

// 根据主状态和子状态获取下一步可选操作
const getNextStatuses = (mainStatus, subStatus) => {
  if (!mainStatus || !subStatus) return []
  
  // 检查是否已经是终态
  if (StatusUtils.isTerminalStatus(mainStatus, subStatus)) {
    return []
  }
  
  // 获取当前子状态信息
  const currentSub = StatusUtils.getSubStatus(mainStatus, subStatus)
  if (!currentSub || !currentSub.nextOptions) return []
  
  // 根据nextOptions构建操作列表
  const nextStatuses = []
  
  currentSub.nextOptions.forEach(optionCode => {
    // 检查是否是拒绝状态
    if (optionCode.includes('rejected') || optionCode.includes('abandoned')) {
      const rejectionMap = {
        'screening_rejected': { mainStatus: 'resume_screening', label: '不合适' },
        'interview_rejected': { mainStatus: 'interviewing', label: '不合适' },
        'salary_rejected': { mainStatus: 'salary_negotiation', label: '不合适' },
        'offer_rejected': { mainStatus: 'salary_negotiation', label: '拒绝Offer' },
        'onboard_abandoned': { mainStatus: 'closed', label: '放弃入职' }
      }
      const rejection = rejectionMap[optionCode]
      if (rejection) {
        nextStatuses.push({
          value: optionCode,
          label: rejection.label,
          type: 'danger',
          targetMainStatus: rejection.mainStatus,
          targetSubStatus: optionCode,
          isRejection: true
        })
      }
    } else {
      // 正常流转
      const sub = StatusUtils.getSubStatus(mainStatus, optionCode)
      if (sub) {
        let type = 'primary'
        if (optionCode.includes('passed')) type = 'success'
        if (optionCode === 'all_rounds_passed') type = 'success'
        if (optionCode === 'offer_accepted') type = 'success'
        if (optionCode === 'onboarded') type = 'success'
        
        nextStatuses.push({
          value: optionCode,
          label: sub.label,
          type: type,
          targetMainStatus: mainStatus,
          targetSubStatus: optionCode,
          isRejection: false
        })
      }
    }
  })
  
  return nextStatuses
}

// 获取正常流转操作（排除拒绝操作）
const getNormalActions = (mainStatus, subStatus) => {
  const allActions = getNextStatuses(mainStatus, subStatus)
  return allActions.filter(action => !action.isRejection).map(action => {
    // 添加图标
    const iconMap = {
      'screening_passed': 'CircleCheck',
      'round_pending': 'Calendar',
      'round_scheduled': 'Clock',
      'round_passed': 'Check',
      'all_rounds_passed': 'ArrowRight',
      'approval_pending': 'Document',
      'offer_sent': 'ChatDotRound',
      'offer_accepted': 'CircleCheck',
      'pending_onboard': 'User',
      'onboarded': 'CircleCheck'
    }
    return {
      ...action,
      icon: iconMap[action.value] || 'ArrowRight'
    }
  })
}

// 获取拒绝/不合适操作
const getRejectActions = (mainStatus, subStatus) => {
  const allActions = getNextStatuses(mainStatus, subStatus)
  return allActions.filter(action => action.isRejection).map(action => ({
    ...action,
    icon: 'CircleClose'
  }))
}

// 处理状态变更 - 打开弹窗让用户填写详细信息
const handleStatusChange = (item, targetStatus) => {
  // 设置选中的候选人和目标状态
  selectedCandidate.value = {
    id: item.id,
    candidate_name: item.candidateName,
    resume_name: item.resumeName,
    main_status: item.mainStatus,
    sub_status: item.subStatus,
    interview_round: item.interviewRound,
    position_name: item.positionName
  }
  
  // 设置目标状态（用于在弹窗中预选）
  targetMainStatus.value = targetStatus.targetMainStatus || item.mainStatus
  targetSubStatus.value = targetStatus.targetSubStatus || targetStatus.value
  
  // 打开弹窗
  actionDialogVisible.value = true
}

// 状态变更成功后的回调
const handleActionSuccess = async (result) => {
  ElMessage.success('状态变更成功')
  
  // 刷新看板数据
  await fetchAllBoardData()
  await fetchDashboardStats()
  
  // 清空选中
  selectedCandidate.value = null
  targetMainStatus.value = ''
  targetSubStatus.value = ''
}

const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/dashboard/stats')
    if (response) {
      statusCounts.value = {
        interviewing: response.interviewing || 0,
        salaryNegotiation: response.salaryNegotiation || 0,
        completed: response.closed || 0,
        rejected: response.rejected || 0
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

watch([searchKeyword, selectedPosition, sortBy, statusFilter], () => {
  // 触发响应式更新
})

onMounted(async () => {
  try {
    await fetchPositions()
    await fetchDashboardStats()
    await fetchAllBoardData()
  } catch (error) {
    console.error('加载看板数据失败:', error)
  }
})
</script>

<style scoped>
.flow-dashboard-container {
  padding: 20px 24px;
  background: #f5f7fa;
  height: 100%;
  overflow-y: auto;
}

.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.toolbar-left h1 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 200px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  height: 36px;
}

.search-input :deep(.el-input__inner) {
  font-size: 13px;
}

.position-select {
  width: 160px;
}

.position-select :deep(.el-input__wrapper) {
  border-radius: 8px;
  height: 36px;
}

.sort-select {
  width: 130px;
}

.sort-select :deep(.el-input__wrapper) {
  border-radius: 8px;
  height: 36px;
}

.status-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
}

.status-card {
  flex: 1;
  min-width: 110px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafbfc;
}

.status-card:hover {
  background: #fff;
  border-color: #409eff;
}

.status-card.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.status-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.status-icon.screening {
  background: #f4f4f5;
  color: #909399;
}

.status-icon.interviewing {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-icon.salary-negotiation {
  background: #ecf5ff;
  color: #409eff;
}

.status-icon.completed {
  background: #f0f9eb;
  color: #67c23a;
}

.status-icon.rejected {
  background: #fef0f0;
  color: #f56c6c;
}

.status-info h3 {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin: 0;
}

.status-count {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.boards-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.board {
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.board-header {
  padding: 14px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafbfc;
  flex-shrink: 0;
}

.board-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.board-status-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.board-status-icon.screening {
  background: #f4f4f5;
  color: #909399;
}

.board-status-icon.interviewing {
  background: #fdf6ec;
  color: #e6a23c;
}

.board-status-icon.salary-negotiation {
  background: #ecf5ff;
  color: #409eff;
}

.board-status-icon.completed {
  background: #f0f9eb;
  color: #67c23a;
}

.board-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
}

.board-count {
  background: #909399;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}

.board-items {
  padding: 14px 16px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: #909399;
}

.loading-state .is-loading {
  font-size: 24px;
  margin-bottom: 10px;
}

.candidate-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.candidate-card {
  background: #fafbfc;
  border-radius: 8px;
  padding: 14px;
  cursor: default;
  transition: all 0.2s ease;
  border: 1px solid #e4e7ed;
  position: relative;
}

.candidate-card:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
}

.candidate-card.warning-line {
  border-left: 4px solid #e6a23c;
}

.candidate-card.urgent-line {
  border-left: 4px solid #f56c6c;
}

.card-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 8px 0 0 8px;
}

.card-indicator.danger {
  background: #f56c6c;
}

.card-indicator.warning {
  background: #e6a23c;
}

.card-indicator.caution {
  background: #67c23a;
}

.candidate-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.candidate-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.candidate-avatar.avatar-screening {
  background: #909399;
}

.candidate-avatar.avatar-interviewing {
  background: #409eff;
}

.candidate-avatar.avatar-salary {
  background: #e6a23c;
}

.candidate-avatar.avatar-closed {
  background: #67c23a;
}

.candidate-info {
  flex: 1;
  min-width: 0;
}

.candidate-info h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 3px 0;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.candidate-position {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.days-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.days-badge.danger {
  background: #fef0f0;
  color: #f56c6c;
}

.days-badge.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.days-badge.caution {
  background: #f0f9eb;
  color: #67c23a;
}

.candidate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.candidate-tags .el-tag {
  margin: 0;
  font-size: 11px;
  padding: 2px 8px;
  height: 22px;
  line-height: 18px;
  border-radius: 4px;
  font-weight: 500;
}

.candidate-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.meta-value {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.meta-value.text-warning {
  color: #e6a23c;
}

.candidate-attention {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 6px;
  width: fit-content;
  font-weight: 500;
}

.candidate-attention.danger {
  background: #fef0f0;
  color: #f56c6c;
}

.candidate-attention.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.candidate-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e4e7ed;
}

.action-buttons-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 80px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-btn .btn-icon {
  font-size: 14px;
}

.more-actions-dropdown {
  align-self: flex-end;
}

.more-btn {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-dropdown-menu {
  min-width: 140px;
}

.action-dropdown-menu .el-dropdown-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

.action-dropdown-menu .el-dropdown-menu__item .el-icon {
  font-size: 16px;
}

.reject-action-item {
  color: #f56c6c;
}

.reject-action-item:hover {
  background-color: #fef0f0;
}

.text-danger {
  color: #f56c6c;
  font-weight: 600;
}

.empty-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: #909399;
  text-align: center;
}

.empty-board .el-icon {
  font-size: 36px;
  margin-bottom: 10px;
  opacity: 0.6;
}

.empty-board p {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .boards-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .flow-dashboard-container {
    padding: 16px 20px;
  }
  
  .dashboard-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .toolbar-right {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-input {
    flex: 1;
    min-width: 140px;
  }
  
  .position-select, .sort-select {
    width: 110px;
  }
  
  .status-summary {
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 10px;
  }
  
  .status-card {
    flex-shrink: 0;
    min-width: 100px;
  }
  
  .boards-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .board {
    max-height: 350px;
  }
}
</style>