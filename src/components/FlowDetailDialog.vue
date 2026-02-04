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
        :type="getTimelineType(log.main_status_to, log.sub_status_to)"
        placement="top"
      >
        <div class="timeline-content">
          <!-- 状态变更信息 -->
          <div class="timeline-header">
            <span class="status-tag" :class="getStatusClass(log.main_status_to, log.sub_status_to)">
              {{ getStatusDisplayText(log.main_status_to, log.sub_status_to) }}
            </span>
            <span v-if="log.main_status_from || log.sub_status_from" class="arrow">←</span>
            <span v-if="log.main_status_from || log.sub_status_from" class="from-status">
              {{ getStatusDisplayText(log.main_status_from, log.sub_status_from) }}
            </span>
          </div>
          
          <!-- 操作类型标识 -->
          <div v-if="log.action_type" class="timeline-action">
            <el-tag 
              :type="log.action_type === 'reject' ? 'danger' : log.action_type === 'interview' ? 'warning' : 'info'" 
              size="small"
            >
              {{ getActionTypeLabel(log.action_type) }}
            </el-tag>
          </div>
          
          <!-- 拒绝原因 -->
          <div v-if="log.action_type === 'reject' || log.rejection_reason" class="timeline-rejection">
            <el-tag type="danger" size="small">流程终止</el-tag>
            <span v-if="log.rejection_reason" class="rejection-reason">
              原因：{{ getRejectionReasonLabel(log.rejection_reason) }}
            </span>
          </div>
          
          <!-- 备注信息 -->
          <div v-if="log.note" class="timeline-note">
            <div class="note-label">备注：</div>
            <div class="note-content">{{ log.note }}</div>
          </div>
          
          <!-- 面试信息 -->
          <div v-if="log.interview_type || log.interview_time || log.interviewer" class="timeline-interview">
            <div class="section-label">面试安排</div>
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
          
          <!-- JD补充信息 -->
          <div v-if="log.jd_supplement" class="timeline-jd">
            <div class="section-label">JD补充信息</div>
            <div class="jd-content">{{ log.jd_supplement }}</div>
          </div>
          
          <!-- 其他变更内容（如果有metadata） -->
          <div v-if="log.metadata_json" class="timeline-metadata">
            <div class="section-label">详细变更</div>
            <div class="metadata-content">{{ formatMetadata(log.metadata_json) }}</div>
          </div>
        </div>
      </el-timeline-item>

      <!-- 初始状态展示（当没有任何流转记录时） -->
      <el-timeline-item
        v-if="logs.length === 0"
        :timestamp="formatTime(candidate?.matched_at) || '初始'"
        type="primary"
        placement="top"
      >
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="status-tag" :class="getStatusClass(candidate?.main_status, candidate?.sub_status)">
              {{ getStatusDisplayText(candidate?.main_status, candidate?.sub_status) }}
            </span>
            <span class="init-label">当前状态</span>
          </div>
          <div class="timeline-note">
            简历导入系统，初始状态为"{{ getStatusDisplayText(candidate?.main_status, candidate?.sub_status) }}"
          </div>
          <div v-if="candidate?.evaluation" class="timeline-evaluation">
            <div class="eval-label">AI评估：</div>
            <div class="eval-score">匹配度 {{ candidate.match_score }}%</div>
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

const getActionTypeLabel = (actionType) => {
  const labels = {
    'status_change': '状态变更',
    'reject': '流程终止',
    'interview': '面试安排',
    'reopen': '重新打开',
    'note_added': '添加备注',
    'jd_updated': 'JD更新'
  }
  return labels[actionType] || actionType
}

const formatMetadata = (metadataJson) => {
  try {
    const metadata = JSON.parse(metadataJson)
    const parts = []
    
    // 处理状态变更信息
    if (metadata.old_main_status || metadata.new_main_status) {
      const oldMain = metadata.old_main_status 
        ? StatusUtils.getMainStatus(metadata.old_main_status)?.label || metadata.old_main_status
        : ''
      const newMain = metadata.new_main_status
        ? StatusUtils.getMainStatus(metadata.new_main_status)?.label || metadata.new_main_status
        : ''
      const oldSub = metadata.old_sub_status
        ? StatusUtils.getSubStatus(metadata.old_main_status, metadata.old_sub_status)?.label || metadata.old_sub_status
        : ''
      const newSub = metadata.new_sub_status
        ? StatusUtils.getSubStatus(metadata.new_main_status, metadata.new_sub_status)?.label || metadata.new_sub_status
        : ''
      
      const fromStatus = oldMain && oldSub ? `${oldMain}/${oldSub}` : oldMain || '初始'
      const toStatus = newMain && newSub ? `${newMain}/${newSub}` : newMain
      
      parts.push(`状态变更: ${fromStatus} → ${toStatus}`)
    }
    
    // 处理其他字段
    const ignoreFields = ['old_main_status', 'old_sub_status', 'new_main_status', 'new_sub_status']
    Object.entries(metadata).forEach(([key, value]) => {
      if (!ignoreFields.includes(key) && value) {
        const label = getFieldLabel(key)
        parts.push(`${label}: ${value}`)
      }
    })
    
    return parts.join(' | ')
  } catch {
    return metadataJson
  }
}

const getFieldLabel = (key) => {
  const labels = {
    'interview_round': '面试轮次',
    'rejection_reason': '拒绝原因',
    'operator': '操作人',
    'operation_time': '操作时间',
    'note': '备注',
    'reason': '原因',
    'candidate_feedback': '候选人反馈'
  }
  return labels[key] || key
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

.init-label {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.timeline-action {
  margin-bottom: 8px;
}

.timeline-evaluation {
  background: #f0f9ff;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
  margin-top: 8px;
}

.eval-label {
  font-size: 12px;
  color: #409eff;
  margin-bottom: 4px;
}

.eval-score {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.section-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
  font-weight: 500;
}

.note-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.note-content {
  color: #303133;
  line-height: 1.6;
}

.timeline-metadata {
  background: #f4f4f5;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
}

.metadata-content {
  font-size: 12px;
  color: #606266;
  font-family: monospace;
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
