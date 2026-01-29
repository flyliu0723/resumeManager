<template>
  <div class="candidate-detail-panel" v-if="event">
    <div class="panel-header">
      <h3>候选人详情</h3>
      <el-button type="primary" link @click="handleClose">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="detail-tabs">
      <el-tab-pane label="概览" name="overview">
        <div class="overview-section">
          <div class="info-row">
            <span class="label">候选人姓名:</span>
            <span class="value">{{ event.details?.candidateName || '未知' }}</span>
          </div>
          <div class="info-row">
            <span class="label">职位:</span>
            <span class="value">{{ event.position_name || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">事件类型:</span>
            <el-tag :type="getStatusTagType(event.event_type)" size="small">
              {{ getStatusText(event.event_type) }}
            </el-tag>
          </div>
          <div class="info-row">
            <span class="label">变更前阶段:</span>
            <el-tag v-if="event.stage_before" type="info" size="small">
              {{ event.stage_before }}
            </el-tag>
            <span v-else>-</span>
          </div>
          <div class="info-row">
            <span class="label">变更后阶段:</span>
            <el-tag :type="getStageTagType(event.stage_after)" size="small">
              {{ event.stage_after }}
            </el-tag>
          </div>
          <div class="info-row">
            <span class="label">停留时长:</span>
            <span class="value" :class="getDaysClass(event.duration_seconds)">
              {{ formatDays(event.duration_seconds) }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">事件时间:</span>
            <span class="value">{{ formatDateTime(event.event_time) }}</span>
          </div>
          <div class="info-row" v-if="event.details?.note">
            <span class="label">备注:</span>
            <span class="value note-text">{{ event.details.note }}</span>
          </div>
          <div class="info-row" v-if="event.details?.nextInterviewAt">
            <span class="label">下次面试时间:</span>
            <span class="value">{{ formatDateTime(event.details.nextInterviewAt) }}</span>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="风险" name="risk">
        <div class="risk-section">
          <el-alert
            v-if="getRiskLevel() === 'high'"
            title="高风险"
            type="error"
            :closable="false"
            show-icon
          >
            候选人在当前阶段停留时间过长，建议尽快跟进
          </el-alert>
          <el-alert
            v-else-if="getRiskLevel() === 'medium'"
            title="中等风险"
            type="warning"
            :closable="false"
            show-icon
          >
            候选人在当前阶段停留时间较长，建议关注
          </el-alert>
          <el-alert
            v-else
            title="状态正常"
            type="success"
            :closable="false"
            show-icon
          >
            候选人状态正常，按计划推进
          </el-alert>

          <div class="risk-metrics">
            <div class="metric-item">
              <span class="metric-label">停留天数:</span>
              <span class="metric-value" :class="getDaysClass(event.duration_seconds)">
                {{ formatDays(event.duration_seconds) }}
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">当前阶段:</span>
              <span class="metric-value">{{ event.stage_after || '-' }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">事件类型:</span>
              <span class="metric-value">{{ getStatusText(event.event_type) }}</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="时间线" name="timeline">
        <div class="timeline-section">
          <el-timeline>
            <el-timeline-item
              :timestamp="formatDateTime(event.event_time)"
              :type="getTimelineType(event.event_type)"
            >
              <div class="timeline-content">
                <div class="timeline-title">{{ getStatusText(event.event_type) }}</div>
                <div class="timeline-detail">
                  <div class="detail-item">
                    <span class="detail-label">阶段变更:</span>
                    <span class="detail-value">
                      {{ event.stage_before || '-' }} → {{ event.stage_after }}
                    </span>
                  </div>
                  <div class="detail-item" v-if="event.details?.note">
                    <span class="detail-label">备注:</span>
                    <span class="detail-value">{{ event.details.note }}</span>
                  </div>
                  <div class="detail-item" v-if="event.details?.nextInterviewAt">
                    <span class="detail-label">面试时间:</span>
                    <span class="detail-value">{{ formatDateTime(event.details.nextInterviewAt) }}</span>
                  </div>
                  <div class="detail-item" v-if="event.duration_seconds">
                    <span class="detail-label">停留时长:</span>
                    <span class="detail-value">{{ formatDays(event.duration_seconds) }}</span>
                  </div>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  event: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const activeTab = ref('overview')

function handleClose() {
  emit('close')
}

function getRiskLevel() {
  if (!props.event?.duration_seconds) return 'low'
  const days = props.event.duration_seconds / (24 * 60 * 60)
  if (days > 7) return 'high'
  if (days > 3) return 'medium'
  return 'low'
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

function getTimelineType(eventType) {
  const typeMap = {
    'resume_upload': 'primary',
    'interview_scheduled': 'warning',
    'interview_started': 'primary',
    'salary_discussed': 'success',
    'offer_accepted': 'success',
    'candidate_rejected': 'danger',
    'interview_passed': 'success',
    'status_change': 'info'
  }
  return typeMap[eventType] || 'primary'
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
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.candidate-detail-panel {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.detail-tabs {
  padding: 0 10px;
}

:deep(.el-tabs__content) {
  padding: 5px;
}

.overview-section,
.risk-section,
.timeline-section {
  padding: 0 0 10px;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  width: 120px;
  font-size: 14px;
  color: #606266;
  flex-shrink: 0;
}

.info-row .value {
  flex: 1;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.info-row .note-text {
  color: #606266;
  font-weight: normal;
}

.risk-metrics {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e4e7ed;
}

.metric-item:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 14px;
  color: #606266;
}

.metric-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.danger-days {
  color: #f56c6c;
  font-weight: 500;
}

.warning-days {
  color: #e6a23c;
  font-weight: 500;
}

.timeline-content {
  padding-left: 10px;
}

.timeline-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

.timeline-detail {
  padding: 8px 0;
}

.detail-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-label {
  color: #909399;
  margin-right: 8px;
  flex-shrink: 0;
}

.detail-value {
  color: #303133;
  flex: 1;
}

@media (max-width: 768px) {
  .info-row .label {
    width: 100px;
    font-size: 13px;
  }
  
  .info-row .value {
    font-size: 13px;
  }
  
  .metric-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
