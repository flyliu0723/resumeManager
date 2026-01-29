<template>
  <div class="interviews-table">
    <el-table
      :data="events"
      v-loading="loading"
      @row-click="handleRowClick"
      :row-class-name="getRowClassName"
      class="candidates-table"
      stripe
      highlight-current-row
    >
      <el-table-column type="selection" width="55" />

      <el-table-column label="候选人" min-width="200">
        <template #default="{ row }">
          <div class="candidate-cell">
            <el-avatar :size="32" :src="row.details?.avatar || ''">
              {{ row.details?.candidateName?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="candidate-info">
              <div class="candidate-name">{{ row.details?.candidateName || '未知' }}</div>
              <div class="candidate-id">ID: {{ row.candidate_id }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="职位" prop="position_name" min-width="150" />

      <el-table-column label="当前阶段" min-width="120">
        <template #default="{ row }">
          <el-tag :type="getStageTagType(row.stage_after)" size="small">
            {{ row.stage_after || '-' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="停留天数" min-width="100" sortable>
        <template #default="{ row }">
          <span :class="getDaysClass(row.duration_seconds)">
            {{ formatDays(row.duration_seconds) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="状态" min-width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.event_type)" size="small">
            {{ getStatusText(row.event_type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="备注" min-width="150">
        <template #default="{ row }">
          <div class="attention-cell" :title="row.details?.note">
            {{ row.details?.note || '-' }}
          </div>
        </template>
      </el-table-column>

      <el-table-column label="时间" prop="event_time" min-width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.event_time) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['row-click'])

function handleRowClick(row) {
  emit('row-click', row)
}

function getRowClassName({ row }) {
  if (row.duration_seconds && row.duration_seconds > 7 * 24 * 60 * 60) {
    return 'warning-row'
  }
  return ''
}

function getStageTagType(stage) {
  const typeMap = {
    '待面试': 'warning',
    '面试中': 'primary',
    '谈薪中': 'success',
    '已成单': 'success',
    '已拒绝': 'danger',
    '已通过': 'success'
  }
  return typeMap[stage] || 'info'
}

function getStatusTagType(eventType) {
  const typeMap = {
    'resume_upload': 'info',
    'interview_scheduled': 'warning',
    'interview_started': 'primary',
    'salary_discussed': 'success',
    'offer_accepted': 'success',
    'candidate_rejected': 'danger',
    'interview_passed': 'success',
    'status_change': 'info'
  }
  return typeMap[eventType] || 'info'
}

function getStatusText(eventType) {
  const textMap = {
    'resume_upload': '简历上传',
    'interview_scheduled': '面试安排',
    'interview_started': '面试开始',
    'salary_discussed': '谈薪中',
    'offer_accepted': '已成单',
    'candidate_rejected': '已拒绝',
    'interview_passed': '已通过',
    'status_change': '状态变更'
  }
  return textMap[eventType] || eventType
}

function formatDays(seconds) {
  if (!seconds) return '-'
  const days = Math.floor(seconds / (24 * 60 * 60))
  return days > 0 ? `${days}天` : '<1天'
}

function getDaysClass(seconds) {
  if (!seconds) return ''
  const days = seconds / (24 * 60 * 60)
  if (days > 7) return 'danger-days'
  if (days > 3) return 'warning-days'
  return ''
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (hours < 24) {
    return `${hours}小时前`
  } else if (hours < 48) {
    return '1天前'
  } else {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
</script>

<style scoped>
.interviews-table {
  width: 100%;
}

.candidate-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.candidate-info {
  display: flex;
  flex-direction: column;
}

.candidate-name {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
}

.candidate-id {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.attention-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
  font-size: 13px;
  color: #606266;
}

:deep(.warning-row) {
  background-color: #fef0f0 !important;
}

.danger-days {
  color: #f56c6c;
  font-weight: 500;
}

.warning-days {
  color: #e6a23c;
  font-weight: 500;
}

@media (max-width: 768px) {
  .candidate-cell {
    gap: 8px;
  }
  
  .candidate-name {
    font-size: 13px;
  }
  
  .attention-cell {
    max-width: 100px;
  }
}
</style>
