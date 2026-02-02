<template>
  <el-dialog
    v-model="visible"
    :title="`${candidate?.candidateName || '候选人详情'}`"
    width="900px"
    class="candidate-detail-dialog"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <!-- 头部：头像和基本信息 -->
      <div class="header-section">
        <div class="avatar-container">
          <div class="avatar" :style="{ backgroundColor: getAvatarColor() }">
            {{ getAvatarText() }}
          </div>
          <div class="avatar-badge" v-if="candidate?.isRejected">
            <el-tag type="danger" size="small" effect="dark">已拒绝</el-tag>
          </div>
        </div>
        <div class="basic-info">
          <div class="name-row">
            <h2 class="candidate-name">{{ candidate?.candidateName || '未知候选人' }}</h2>
            <el-tag
              :type="getStatusType(candidate?.mainStatus)"
              size="large"
              class="status-tag"
            >
              {{ getStatusLabel(candidate?.mainStatus, candidate?.subStatus) }}
            </el-tag>
          </div>
          <div class="position-row">
            <el-icon><OfficeBuilding /></el-icon>
            <span class="position-title">{{ candidate?.positionTitle || '-' }}</span>
          </div>
          <div class="meta-row">
            <el-tag v-if="candidate?.interviewRound > 0" type="info" size="small">
              第 {{ candidate.interviewRound }} 轮面试
            </el-tag>
            <el-tag v-if="candidate?.isTerminal" type="warning" size="small" effect="plain">
              已终止
            </el-tag>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 状态操作区域 -->
      <div class="action-section" v-if="!candidate?.isTerminal">
        <div class="section-title">
          <el-icon><Switch /></el-icon>
          <span>状态变更</span>
        </div>

        <div class="current-status-display">
          <span class="label">当前状态：</span>
          <el-tag :type="getStatusType(candidate?.mainStatus)" effect="dark">
            {{ getStatusLabel(candidate?.mainStatus, candidate?.subStatus) }}
          </el-tag>
        </div>

        <!-- 下一步操作按钮 -->
        <div class="next-actions">
          <span class="label">下一步操作：</span>
          <div class="action-buttons">
            <template v-if="availableNextStatuses.length > 0">
              <el-button
                v-for="status in availableNextStatuses"
                :key="status.value"
                :type="getButtonType(status.type)"
                @click="handleStatusChange(status)"
                size="default"
              >
                {{ status.label }}
              </el-button>
            </template>
            <el-empty v-else description="暂无可用的下一步操作" :image-size="60" />
          </div>
        </div>

        <!-- 拒绝按钮 -->
        <div class="reject-section" v-if="candidate?.canReject && !candidate?.isRejected">
          <el-divider content-position="left">或</el-divider>
          <el-button type="danger" @click="showRejectDialog" :icon="CircleClose">
            不合适 - 结束流程
          </el-button>
        </div>

        <!-- 重新打开按钮 -->
        <div class="reopen-section" v-if="candidate?.isRejected">
          <el-alert
            title="此候选人已被标记为不合适"
            type="warning"
            :closable="false"
            show-icon
            class="reopen-alert"
          >
            <template #default>
              <el-button type="primary" @click="handleReopen" :icon="RefreshLeft" size="small">
                重新打开流程
              </el-button>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- 拒绝记录 -->
      <div class="rejection-section" v-if="candidate?.rejectionRecord">
        <div class="section-title">
          <el-icon><WarningFilled /></el-icon>
          <span>拒绝记录</span>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="拒绝原因">
            {{ candidate.rejectionRecord.reason }}
          </el-descriptions-item>
          <el-descriptions-item label="拒绝时间">
            {{ formatDateTime(candidate.rejectionRecord.rejectedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="备注说明" v-if="candidate.rejectionRecord.note">
            {{ candidate.rejectionRecord.note }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人" v-if="candidate.rejectionRecord.operatorName">
            {{ candidate.rejectionRecord.operatorName }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 面试轮次 -->
      <div class="interview-section" v-if="candidate?.interviewRounds?.length > 0">
        <div class="section-title">
          <el-icon><Calendar /></el-icon>
          <span>面试记录 ({{ candidate.interviewRounds.length }}轮)</span>
        </div>
        <div class="interview-cards">
          <el-card
            v-for="(round, index) in candidate.interviewRounds"
            :key="round.id || index"
            class="interview-card"
            :class="{ 'current-round': round.roundNumber === candidate.interviewRound }"
          >
            <template #header>
              <div class="card-header">
                <span class="round-number">第 {{ round.roundNumber }} 轮</span>
                <el-tag :type="getInterviewStatusType(round.status)" size="small">
                  {{ getInterviewStatusText(round.status) }}
                </el-tag>
              </div>
            </template>
            <div class="card-body">
              <div class="info-row" v-if="round.interviewerName">
                <span class="label">面试官：</span>
                <span class="value">{{ round.interviewerName }}</span>
              </div>
              <div class="info-row" v-if="round.scheduledAt">
                <span class="label">安排时间：</span>
                <span class="value">{{ formatDateTime(round.scheduledAt) }}</span>
              </div>
              <div class="info-row" v-if="round.actualAt">
                <span class="label">实际时间：</span>
                <span class="value">{{ formatDateTime(round.actualAt) }}</span>
              </div>
              <div class="info-row" v-if="round.duration">
                <span class="label">时长：</span>
                <span class="value">{{ round.duration }} 分钟</span>
              </div>
              <div class="feedback-section" v-if="round.feedback">
                <el-divider content-position="left">面试反馈</el-divider>
                <div class="feedback-content">{{ round.feedback }}</div>
                <el-rate
                  v-if="round.rating"
                  v-model="round.rating"
                  disabled
                  show-score
                  text-color="#ff9900"
                />
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <el-divider />

      <!-- 状态流转历史 -->
      <div class="history-section">
        <div class="section-title">
          <el-icon><Clock /></el-icon>
          <span>流转历史</span>
        </div>
        <el-timeline>
          <el-timeline-item
            v-for="(log, index) in candidate?.flowLogs || []"
            :key="log.id || index"
            :timestamp="formatDateTime(log.createdAt)"
            :type="getTimelineType(log.toStatus)"
            placement="top"
          >
            <div class="timeline-content">
              <div class="timeline-header">
                <el-tag :type="getStatusType(log.toStatus)" size="small">
                  {{ getStatusLabel(log.toMainStatus, log.toSubStatus) }}
                </el-tag>
                <span v-if="log.fromStatus" class="arrow">←</span>
                <span v-if="log.fromStatus" class="from-status">
                  {{ getStatusLabel(log.fromMainStatus, log.fromSubStatus) }}
                </span>
              </div>
              <div class="timeline-body">
                <div v-if="log.note" class="note-text">
                  备注：{{ log.note }}
                </div>
                <div v-if="log.operatorName" class="operator-text">
                  操作人：{{ log.operatorName }}
                </div>
              </div>
            </div>
          </el-timeline-item>

          <el-timeline-item
            v-if="!candidate?.flowLogs?.length"
            timestamp="开始"
            type="primary"
            placement="top"
          >
            <div class="timeline-content">
              <div class="timeline-header">
                <el-tag type="info" size="small">流程开始</el-tag>
              </div>
              <div class="timeline-body">
                <div class="note-text">候选人进入招聘流程</div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="refreshData" :loading="refreshing" :icon="Refresh">
        刷新
      </el-button>
    </template>
  </el-dialog>

  <!-- 拒绝原因选择对话框 -->
  <el-dialog
    v-model="rejectDialogVisible"
    title="标记为不合适"
    width="500px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="rejectForm" label-width="100px" ref="rejectFormRef">
      <el-form-item label="拒绝原因" prop="reason" required>
        <el-select v-model="rejectForm.reason" placeholder="请选择拒绝原因" style="width: 100%">
          <el-option
            v-for="reason in rejectionReasons"
            :key="reason.value"
            :label="reason.label"
            :value="reason.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="其他原因" v-if="rejectForm.reason === 'other'">
        <el-input
          v-model="rejectForm.customReason"
          type="textarea"
          :rows="2"
          placeholder="请输入具体原因"
        />
      </el-form-item>

      <el-form-item label="备注说明">
        <el-input
          v-model="rejectForm.note"
          type="textarea"
          :rows="3"
          placeholder="补充说明（选填）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="rejectDialogVisible = false">取消</el-button>
      <el-button type="danger" @click="handleReject" :loading="rejecting">
        确认拒绝
      </el-button>
    </template>
  </el-dialog>

  <!-- 状态变更确认对话框 -->
  <el-dialog
    v-model="statusChangeDialogVisible"
    :title="`确认变更为：${selectedStatus?.label}`"
    width="500px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form :model="statusChangeForm" label-width="100px">
      <el-form-item label="当前状态">
        <el-tag :type="getStatusType(candidate?.mainStatus)">
          {{ getStatusLabel(candidate?.mainStatus, candidate?.subStatus) }}
        </el-tag>
      </el-form-item>

      <el-form-item label="目标状态">
        <el-tag :type="getStatusType(selectedStatus?.value)">
          {{ selectedStatus?.label }}
        </el-tag>
      </el-form-item>

      <el-form-item label="备注说明">
        <el-input
          v-model="statusChangeForm.note"
          type="textarea"
          :rows="3"
          placeholder="请输入状态变更说明（选填）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="statusChangeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmStatusChange" :loading="changingStatus">
        确认变更
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  OfficeBuilding,
  Switch,
  CircleClose,
  RefreshLeft,
  WarningFilled,
  Calendar,
  Clock,
  Refresh
} from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  candidate: Object
})

const emit = defineEmits(['update:modelValue', 'refresh', 'statusChange', 'reject', 'reopen'])

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 刷新状态
const refreshing = ref(false)

// 拒绝对话框
const rejectDialogVisible = ref(false)
const rejectFormRef = ref(null)
const rejecting = ref(false)
const rejectForm = ref({
  reason: '',
  customReason: '',
  note: ''
})

// 拒绝原因选项
const rejectionReasons = [
  { value: 'skills_mismatch', label: '技能不匹配' },
  { value: 'experience_mismatch', label: '经验不匹配' },
  { value: 'salary_mismatch', label: '薪资期望不匹配' },
  { value: 'location_mismatch', label: '地点不匹配' },
  { value: 'culture_mismatch', label: '企业文化不匹配' },
  { value: 'candidate_declined', label: '候选人主动放弃' },
  { value: 'interview_failed', label: '面试未通过' },
  { value: 'other', label: '其他原因' }
]

// 状态变更对话框
const statusChangeDialogVisible = ref(false)
const changingStatus = ref(false)
const selectedStatus = ref(null)
const statusChangeForm = ref({
  note: ''
})

// 可用的下一步状态（根据当前状态动态生成）
const availableNextStatuses = computed(() => {
  const currentStatus = props.candidate?.mainStatus
  const subStatus = props.candidate?.subStatus

  const statusMap = {
    'new': [
      { value: 'screening', label: '进入筛选', type: 'primary' },
      { value: 'interviewing', label: '直接面试', type: 'success' }
    ],
    'screening': [
      { value: 'interviewing', label: '通过筛选，安排面试', type: 'success' },
      { value: 'rejected', label: '筛选不通过', type: 'danger' }
    ],
    'interviewing': [
      { value: 'interview_passed', label: '面试通过', type: 'success' },
      { value: 'interview_failed', label: '面试未通过', type: 'danger' },
      { value: 'next_round', label: '进入下一轮面试', type: 'primary' }
    ],
    'interview_passed': [
      { value: 'salary_negotiation', label: '进入谈薪', type: 'warning' },
      { value: 'offer', label: '发送Offer', type: 'success' }
    ],
    'salary_negotiation': [
      { value: 'offer', label: '确认薪资，发送Offer', type: 'success' },
      { value: 'rejected', label: '谈薪失败', type: 'danger' }
    ],
    'offer': [
      { value: 'accepted', label: '候选人接受Offer', type: 'success' },
      { value: 'rejected', label: '候选人拒绝Offer', type: 'danger' }
    ]
  }

  return statusMap[currentStatus] || []
})

// 获取头像文字
const getAvatarText = () => {
  const name = props.candidate?.candidateName
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

// 获取头像颜色
const getAvatarColor = () => {
  const name = props.candidate?.candidateName || ''
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c',
    '#909399', '#b37feb', '#ff85c0', '#36cfc9'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// 获取状态类型（用于标签颜色）
const getStatusType = (status) => {
  const types = {
    'new': 'info',
    'screening': 'warning',
    'interviewing': 'primary',
    'interview_passed': 'success',
    'interview_failed': 'danger',
    'salary_negotiation': 'warning',
    'offer': 'success',
    'accepted': 'success',
    'rejected': 'danger',
    'round_scheduled': 'primary',
    'round_completed': 'success',
    'round_failed': 'danger'
  }
  return types[status] || 'info'
}

// 获取状态标签文本
const getStatusLabel = (mainStatus, subStatus) => {
  const statusLabels = {
    'new': '新建',
    'screening': '筛选中',
    'interviewing': subStatus === 'round_scheduled' ? '面试中（已安排）' : '面试中',
    'interview_passed': '面试通过',
    'interview_failed': '面试未通过',
    'salary_negotiation': '谈薪中',
    'offer': '已发Offer',
    'accepted': '已接受',
    'rejected': '已拒绝'
  }
  return statusLabels[mainStatus] || mainStatus || '未知状态'
}

// 获取按钮类型
const getButtonType = (type) => {
  const typeMap = {
    'primary': 'primary',
    'success': 'success',
    'warning': 'warning',
    'danger': 'danger'
  }
  return typeMap[type] || 'default'
}

// 获取面试状态类型
const getInterviewStatusType = (status) => {
  const types = {
    'scheduled': 'primary',
    'ongoing': 'warning',
    'completed': 'success',
    'cancelled': 'info',
    'passed': 'success',
    'failed': 'danger'
  }
  return types[status] || 'info'
}

// 获取面试状态文本
const getInterviewStatusText = (status) => {
  const texts = {
    'scheduled': '已安排',
    'ongoing': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'passed': '已通过',
    'failed': '未通过'
  }
  return texts[status] || status || '未知'
}

// 获取时间线类型
const getTimelineType = (status) => {
  const types = {
    'new': 'primary',
    'screening': 'warning',
    'interviewing': 'primary',
    'interview_passed': 'success',
    'interview_failed': 'danger',
    'salary_negotiation': 'warning',
    'offer': 'success',
    'accepted': 'success',
    'rejected': 'danger'
  }
  return types[status] || 'primary'
}

// 格式化日期时间
const formatDateTime = (dateStr) => {
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

// 刷新数据
const refreshData = async () => {
  refreshing.value = true
  try {
    emit('refresh', props.candidate?.id)
  } finally {
    refreshing.value = false
  }
}

// 显示拒绝对话框
const showRejectDialog = () => {
  rejectForm.value = {
    reason: '',
    customReason: '',
    note: ''
  }
  rejectDialogVisible.value = true
}

// 处理拒绝
const handleReject = async () => {
  if (!rejectForm.value.reason) {
    ElMessage.warning('请选择拒绝原因')
    return
  }

  if (rejectForm.value.reason === 'other' && !rejectForm.value.customReason) {
    ElMessage.warning('请输入具体原因')
    return
  }

  rejecting.value = true
  try {
    const reason = rejectForm.value.reason === 'other'
      ? rejectForm.value.customReason
      : rejectionReasons.find(r => r.value === rejectForm.value.reason)?.label

    emit('reject', {
      candidateId: props.candidate?.id,
      reason,
      note: rejectForm.value.note
    })

    rejectDialogVisible.value = false
    ElMessage.success('已标记为不合适')
  } catch (error) {
    console.error('拒绝操作失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    rejecting.value = false
  }
}

// 处理状态变更
const handleStatusChange = (status) => {
  selectedStatus.value = status
  statusChangeForm.value = { note: '' }
  statusChangeDialogVisible.value = true
}

// 确认状态变更
const confirmStatusChange = async () => {
  changingStatus.value = true
  try {
    emit('statusChange', {
      candidateId: props.candidate?.id,
      fromStatus: props.candidate?.mainStatus,
      toStatus: selectedStatus.value.value,
      note: statusChangeForm.value.note
    })

    statusChangeDialogVisible.value = false
    ElMessage.success('状态变更成功')
  } catch (error) {
    console.error('状态变更失败:', error)
    ElMessage.error('状态变更失败，请重试')
  } finally {
    changingStatus.value = false
  }
}

// 处理重新打开
const handleReopen = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重新打开此候选人的招聘流程吗？',
      '确认重新打开',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    emit('reopen', {
      candidateId: props.candidate?.id
    })

    ElMessage.success('流程已重新打开')
  } catch {
    // 用户取消
  }
}

// 监听对话框打开
watch(visible, (val) => {
  if (val) {
    // 对话框打开时的初始化操作
    console.log('打开候选人详情对话框:', props.candidate?.id)
  }
})
</script>

<style scoped>
.candidate-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

.dialog-content {
  padding: 20px;
}

/* 头部区域 */
.header-section {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32px;
  font-weight: 600;
}

.avatar-badge {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
}

.basic-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.candidate-name {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.status-tag {
  font-size: 14px;
}

.position-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
  margin-bottom: 12px;
}

.position-title {
  font-weight: 500;
}

.meta-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 分区标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.section-title .el-icon {
  font-size: 18px;
  color: #409eff;
}

/* 操作区域 */
.action-section {
  margin-bottom: 24px;
}

.current-status-display {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.current-status-display .label {
  font-size: 14px;
  color: #606266;
}

.next-actions {
  margin-bottom: 16px;
}

.next-actions .label {
  display: block;
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reject-section {
  margin-top: 16px;
}

.reopen-section {
  margin-top: 16px;
}

.reopen-alert {
  margin-bottom: 0;
}

/* 拒绝记录 */
.rejection-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fef0f0;
  border-radius: 8px;
  border: 1px solid #fde2e2;
}

/* 面试轮次 */
.interview-section {
  margin-bottom: 24px;
}

.interview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.interview-card {
  transition: all 0.3s ease;
}

.interview-card.current-round {
  border: 2px solid #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.interview-card :deep(.el-card__header) {
  padding: 12px 16px;
  background: #f5f7fa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.round-number {
  font-weight: 600;
  color: #303133;
}

.card-body {
  padding: 8px 0;
}

.card-body .info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.card-body .label {
  color: #909399;
  width: 80px;
  flex-shrink: 0;
}

.card-body .value {
  color: #606266;
  flex: 1;
}

.feedback-section {
  margin-top: 12px;
}

.feedback-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

/* 历史记录 */
.history-section {
  margin-top: 16px;
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

.arrow {
  color: #909399;
  font-size: 12px;
}

.from-status {
  color: #909399;
  font-size: 13px;
}

.timeline-body {
  font-size: 13px;
}

.note-text {
  color: #606266;
  margin-bottom: 4px;
}

.operator-text {
  color: #909399;
  font-size: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .name-row {
    flex-direction: column;
    gap: 8px;
  }

  .position-row {
    justify-content: center;
  }

  .meta-row {
    justify-content: center;
  }

  .interview-cards {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    justify-content: center;
  }
}
</style>
