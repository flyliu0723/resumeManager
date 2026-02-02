<template>
  <el-dialog
    v-model="visible"
    :title="`流转详情 - ${candidateName}`"
    width="700px"
    class="flow-detail-dialog"
  >
    <div class="candidate-info">
      <div class="status-section">
        <el-tag :type="getStatusType(candidate?.main_status, candidate?.sub_status)" size="large">
          {{ getStatusDisplayText(candidate?.main_status, candidate?.sub_status) }}
        </el-tag>
        <span v-if="candidate?.interview_round" class="round-badge">
          第{{ candidate.interview_round }}轮面试
        </span>
      </div>
      <span class="match-score" :class="getMatchLevelClass(candidate?.match_score)">
        匹配度 {{ candidate?.match_score || 0 }}%
      </span>
    </div>

    <el-timeline class="flow-timeline">
      <el-timeline-item
        v-for="(log, index) in logs"
        :key="log.id || index"
        :timestamp="formatTime(log.created_at)"
        :type="getTimelineType(log.to_main_status, log.to_sub_status)"
        placement="top"
      >
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="status-tag" :class="getStatusClass(log.to_main_status, log.to_sub_status)">
              {{ getStatusDisplayText(log.to_main_status, log.to_sub_status) }}
            </span>
            <span v-if="log.from_main_status || log.from_sub_status" class="arrow">←</span>
            <span v-if="log.from_main_status || log.from_sub_status" class="from-status">
              {{ getStatusDisplayText(log.from_main_status, log.from_sub_status) }}
            </span>
          </div>
          <div v-if="log.action_type === 'reject'" class="timeline-rejection">
            <el-tag type="danger" size="small">流程终止</el-tag>
            <span v-if="log.rejection_reason" class="rejection-reason">
              原因：{{ getRejectionReasonLabel(log.rejection_reason) }}
            </span>
          </div>
          <div v-if="log.note" class="timeline-note">
            {{ log.note }}
          </div>
          <div v-if="log.interview_type || log.interview_time" class="timeline-interview">
            <div v-if="log.interview_type" class="interview-item">
              <span class="interview-label">面试类型：</span>
              <span class="interview-value">{{ log.interview_type }}</span>
            </div>
            <div v-if="log.interview_time" class="interview-item">
              <span class="interview-label">面试时间：</span>
              <span class="interview-value">{{ formatDateTime(log.interview_time) }}</span>
            </div>
            <div v-if="log.interviewer" class="interview-item">
              <span class="interview-label">面试官：</span>
              <span class="interview-value">{{ log.interviewer }}</span>
            </div>
          </div>
          <div v-if="log.jd_supplement" class="timeline-jd">
            <div class="jd-label">JD补充：</div>
            <div class="jd-content">{{ log.jd_supplement }}</div>
          </div>
        </div>
      </el-timeline-item>

      <el-timeline-item
        v-if="logs.length === 0"
        timestamp="初始"
        type="primary"
        placement="top"
      >
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="status-tag" :class="getStatusClass(candidate?.main_status, candidate?.sub_status)">
              {{ getStatusDisplayText(candidate?.main_status, candidate?.sub_status) || '简历筛选/待筛选' }}
            </span>
          </div>
          <div class="timeline-note">
            简历导入，初始状态
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button 
        v-if="isReopenable" 
        type="primary" 
        @click="handleReopen"
        :loading="reopening"
      >
        重新打开流程
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePositionStore } from '../stores/position'
import { StatusUtils, REJECTION_REASONS } from '../constants/interviewStatus.js'

const props = defineProps({
  modelValue: Boolean,
  candidate: Object
})

const emit = defineEmits(['update:modelValue', 'reopen'])

const store = usePositionStore()
const reopening = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const logs = computed(() => {
  if (!props.candidate?.id) return []
  return store.getFlowLogs(props.candidate.id)
})

const candidateName = computed(() => {
  return props.candidate?.candidate_name || props.candidate?.name || '未知候选人'
})

const isReopenable = computed(() => {
  // Check if candidate is in a terminal rejected state and can be reopened
  const mainStatus = props.candidate?.main_status
  const subStatus = props.candidate?.sub_status
  return StatusUtils.isRejectedStatus(mainStatus, subStatus) || 
         StatusUtils.isTerminalStatus(mainStatus, subStatus)
})

watch(visible, async (val) => {
  if (val && props.candidate?.id) {
    await store.fetchFlowLogs(props.candidate.id)
  }
})

const handleReopen = async () => {
  reopening.value = true
  try {
    await store.reopenCandidate(props.candidate.id)
    emit('reopen', props.candidate)
    visible.value = false
  } finally {
    reopening.value = false
  }
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusDisplayText = (mainStatus, subStatus) => {
  if (!mainStatus && !subStatus) return '简历筛选/待筛选'
  
  const main = StatusUtils.getMainStatus(mainStatus || 'resume_screening')
  const sub = StatusUtils.getSubStatus(mainStatus, subStatus)
  
  if (sub) {
    return `${main.label}/${sub.label}`
  }
  return main.label
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

const getStatusClass = (mainStatus, subStatus) => {
  const isTerminal = StatusUtils.isTerminalStatus(mainStatus, subStatus)
  const isRejected = StatusUtils.isRejectedStatus(mainStatus, subStatus)
  const isSuccess = StatusUtils.isSuccessStatus(mainStatus, subStatus)
  
  if (isSuccess) return 'status-success'
  if (isRejected || isTerminal) return 'status-rejected'
  if (mainStatus === 'resume_screening') return 'status-screening'
  if (mainStatus === 'interviewing') return 'status-interviewing'
  if (mainStatus === 'salary_negotiation') return 'status-salary'
  return 'status-default'
}

const getTimelineType = (mainStatus, subStatus) => {
  const isTerminal = StatusUtils.isTerminalStatus(mainStatus, subStatus)
  const isRejected = StatusUtils.isRejectedStatus(mainStatus, subStatus)
  const isSuccess = StatusUtils.isSuccessStatus(mainStatus, subStatus)
  
  if (isSuccess) return 'success'
  if (isRejected || isTerminal) return 'danger'
  return 'primary'
}

const getRejectionReasonLabel = (reasonCode) => {
  const reason = Object.values(REJECTION_REASONS).find(r => r.code === reasonCode)
  return reason?.label || reasonCode
}

const getMatchLevelClass = (score) => {
  if (score === null || score === undefined) return 'none'
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}
</script>

<style scoped>
.candidate-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.round-badge {
  padding: 4px 12px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.match-score {
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
}

.match-score.high {
  background: #f0f9eb;
  color: #67c23a;
}

.match-score.medium {
  background: #fdf6ec;
  color: #e6a23c;
}

.match-score.low {
  background: #fef0f0;
  color: #f56c6c;
}

.match-score.none {
  background: #f4f4f5;
  color: #909399;
}

.flow-timeline {
  padding: 0 20px;
}

.timeline-content {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.status-screening {
  background: #f4f4f5;
  color: #909399;
}

.status-interviewing {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-salary {
  background: #ecf5ff;
  color: #409eff;
}

.status-success {
  background: #f0f9eb;
  color: #67c23a;
}

.status-rejected {
  background: #fef0f0;
  color: #f56c6c;
}

.arrow {
  color: #909399;
  font-size: 12px;
}

.from-status {
  color: #909399;
  font-size: 12px;
}

.timeline-rejection {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: #fef0f0;
  border-radius: 4px;
}

.rejection-reason {
  font-size: 13px;
  color: #f56c6c;
}

.timeline-note {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.timeline-interview {
  background: #f0f9ff;
  padding: 10px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
  border-left: 3px solid #409eff;
}

.interview-item {
  display: flex;
  margin-bottom: 4px;
}

.interview-item:last-child {
  margin-bottom: 0;
}

.interview-label {
  font-size: 12px;
  color: #909399;
  width: 70px;
  flex-shrink: 0;
}

.interview-value {
  font-size: 13px;
  color: #303133;
}

.timeline-jd {
  background: #fff7e6;
  padding: 10px 12px;
  border-radius: 4px;
  border-left: 3px solid #e6a23c;
}

.jd-label {
  font-size: 12px;
  color: #e6a23c;
  margin-bottom: 4px;
}

.jd-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
