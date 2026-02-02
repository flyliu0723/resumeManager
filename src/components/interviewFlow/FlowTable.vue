<template>
  <div class="flow-table-container">
    <el-table :data="candidates" stripe style="width: 100%" class="flow-table" v-loading="loading">
      <el-table-column prop="candidate_name" label="候选人" min-width="150">
        <template #default="scope">
          <div class="candidate-info">
            <div class="candidate-avatar" :style="{ backgroundColor: getAvatarColor(scope.row.main_status) }">
              {{ getAvatarText(scope.row.candidate_name || scope.row.resume_name) }}
            </div>
            <span class="candidate-name">{{ scope.row.candidate_name || scope.row.resume_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="main_status" label="当前阶段" min-width="120">
        <template #default="scope">
          <span class="stage-text">{{ getMainStatusLabel(scope.row.main_status) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="sub_status" label="详细状态" min-width="120" align="center">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.main_status, scope.row.sub_status)" size="small" class="status-tag">
            {{ getSubStatusLabel(scope.row.main_status, scope.row.sub_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="interview_round" label="面试轮次" min-width="100" align="center">
        <template #default="scope">
          <span v-if="scope.row.interview_round" class="round-text">第{{ scope.row.interview_round }}轮</span>
          <span v-else class="no-round">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="daysInStage" label="停留天数" min-width="100" align="center">
        <template #default="scope">
          <el-tag :type="getDaysTagType(scope.row.daysInStage)" size="small">
            {{ scope.row.daysInStage || 0 }}天
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="最后更新" min-width="140">
        <template #default="scope">
          <span class="time-text">{{ formatTime(scope.row.updated_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="100" align="center" fixed="right">
        <template #default="scope">
          <el-button type="primary" link size="small" @click="$emit('view-detail', scope.row)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { StatusUtils, MAIN_STATUS } from '../../constants/interviewStatus.js'

defineProps({
  candidates: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['view-detail'])

const getAvatarColor = (mainStatus) => {
  const main = StatusUtils.getMainStatus(mainStatus || 'resume_screening')
  return main?.color || '#909399'
}

const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

const getMainStatusLabel = (mainStatus) => {
  const main = StatusUtils.getMainStatus(mainStatus || 'resume_screening')
  return main?.label || '简历筛选'
}

const getSubStatusLabel = (mainStatus, subStatus) => {
  const sub = StatusUtils.getSubStatus(mainStatus, subStatus)
  return sub?.label || '待筛选'
}

const getStatusType = (mainStatus, subStatus) => {
  const isTerminal = StatusUtils.isTerminalStatus(mainStatus, subStatus)
  const isRejected = StatusUtils.isRejectedStatus(mainStatus, subStatus)
  const isSuccess = StatusUtils.isSuccessStatus(mainStatus, subStatus)
  
  if (isSuccess) return 'success'
  if (isRejected || isTerminal) return 'danger'
  if (mainStatus === 'resume_screening') return 'info'
  if (mainStatus === 'interviewing') return 'warning'
  if (mainStatus === 'salary_negotiation') return 'primary'
  return 'info'
}

const getDaysTagType = (days) => {
  if (!days || days <= 3) return 'success'
  if (days <= 7) return 'warning'
  return 'danger'
}

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.flow-table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
  overflow: hidden;
}

.flow-table {
  border: none;
}

.flow-table th {
  background-color: #fafafa;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
}

.flow-table td {
  border-bottom: 1px solid #ebeef5;
  padding: 12px 16px;
}

.candidate-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.candidate-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.candidate-name {
  font-size: 14px;
  color: #303133;
}

.stage-text {
  font-size: 14px;
  color: #606266;
}

.days-text {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.status-tag {
  font-size: 12px;
  padding: 2px 8px;
}

.attention-text {
  font-size: 13px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flow-table-container {
    overflow-x: auto;
  }
}
</style>
