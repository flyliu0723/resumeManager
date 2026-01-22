<template>
  <el-dialog
    v-model="visible"
    :title="`流转详情 - ${candidateName}`"
    width="600px"
    class="flow-detail-dialog"
  >
    <div class="candidate-info">
      <el-tag :type="getStatusType(candidate?.current_status || candidate?.status)" size="large">
        {{ getStatusText(candidate?.current_status || candidate?.status) }}
      </el-tag>
      <span class="match-score" :class="getMatchLevelClass(candidate?.match_score)">
        {{ candidate?.match_score || 0 }}%
      </span>
    </div>

    <el-timeline class="flow-timeline">
      <el-timeline-item
        v-for="(log, index) in logs"
        :key="log.id || index"
        :timestamp="formatTime(log.created_at)"
        :type="getTimelineType(log.to_status)"
        placement="top"
      >
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="status-tag" :class="getStatusClass(log.to_status)">
              {{ getStatusText(log.to_status) }}
            </span>
            <span v-if="log.from_status" class="arrow">←</span>
            <span v-if="log.from_status" class="from-status">
              {{ getStatusText(log.from_status) }}
            </span>
          </div>
          <div v-if="log.note" class="timeline-note">
            {{ log.note }}
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
            <span class="status-tag" :class="getStatusClass(candidate?.current_status || candidate?.status)">
              {{ getStatusText(candidate?.current_status || candidate?.status) || '待沟通' }}
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
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePositionStore } from '../stores/position'

const props = defineProps({
  modelValue: Boolean,
  candidate: Object
})

const emit = defineEmits(['update:modelValue'])

const store = usePositionStore()

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

watch(visible, async (val) => {
  if (val && props.candidate?.id) {
    await store.fetchFlowLogs(props.candidate.id)
  }
})

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

const getStatusType = (status) => {
  const types = {
    '待沟通': 'warning',
    '待面试': 'success',
    '面试中': 'success',
    '已通过': 'success',
    '已拒绝': 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    '待沟通': '待沟通',
    '待面试': '待面试',
    '面试中': '面试中',
    '已通过': '已通过',
    '已拒绝': '已拒绝'
  }
  return texts[status] || status || ''
}

const getStatusClass = (status) => {
  const classes = {
    '待沟通': 'status-pending',
    '待面试': 'status-interview',
    '面试中': 'status-interviewing',
    '已通过': 'status-passed',
    '已拒绝': 'status-rejected'
  }
  return classes[status] || ''
}

const getTimelineType = (status) => {
  const types = {
    '待沟通': 'warning',
    '待面试': 'success',
    '面试中': 'success',
    '已通过': 'success',
    '已拒绝': 'danger'
  }
  return types[status] || 'primary'
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
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
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

.status-pending {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-interview,
.status-interviewing {
  background: #ecf5ff;
  color: #409eff;
}

.status-passed {
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

.timeline-note {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
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
