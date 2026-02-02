<template>
  <el-dialog
    v-model="visible"
    title="更新候选人状态"
    width="560px"
    :close-on-click-modal="false"
    class="candidate-action-dialog"
  >
    <el-form :model="form" label-width="120px" :rules="rules" ref="formRef">
      <!-- 当前状态显示 -->
      <el-form-item label="当前状态">
        <div class="current-status">
          <el-tag :type="getMainStatusType(candidate?.main_status)" size="large" effect="dark">
            {{ getMainStatusLabel(candidate?.main_status) }}
          </el-tag>
          <el-tag :type="getSubStatusType(candidate?.sub_status)" size="large" class="sub-status-tag">
            {{ getSubStatusLabel(candidate?.main_status, candidate?.sub_status) }}
          </el-tag>
        </div>
      </el-form-item>

      <!-- 新状态选择 - 两步选择 -->
      <el-form-item label="新状态" prop="newSubStatus">
        <div class="status-selector">
          <!-- 第一步：选择主状态 -->
          <el-select 
            v-model="form.newMainStatus" 
            placeholder="选择招聘阶段" 
            style="width: 100%"
            size="large"
            @change="handleMainStatusChange"
          >
            <el-option
              v-for="item in mainStatusOptions"
              :key="item.code"
              :label="item.label"
              :value="item.code"
            >
              <div style="display: flex; align-items: center; padding: 8px 0;">
                <el-icon style="margin-right: 12px; font-size: 18px;"><component :is="item.icon" /></el-icon>
                <div>
                  <div style="font-weight: 500; font-size: 15px;">{{ item.label }}</div>
                  <div style="font-size: 12px; color: #909399; margin-top: 2px;">{{ item.description }}</div>
                </div>
              </div>
            </el-option>
          </el-select>
        </div>
      </el-form-item>

      <!-- 子状态选择 -->
      <el-form-item label="详细状态" prop="newSubStatus" v-if="form.newMainStatus">
        <el-select 
          v-model="form.newSubStatus" 
          placeholder="选择具体状态" 
          style="width: 100%"
          size="large"
        >
          <el-option
            v-for="item in availableSubStatuses"
            :key="item.code"
            :label="item.label"
            :value="item.code"
          >
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
              <div style="display: flex; align-items: center;">
                <span 
                  :style="{ 
                    color: item.color, 
                    fontWeight: 600, 
                    fontSize: '14px',
                    marginRight: '12px'
                  }"
                >
                  {{ item.label }}
                </span>
                <el-tag v-if="item.isTerminal" type="danger" size="small">终态</el-tag>
              </div>
              <span style="color: #909399; font-size: 13px;">{{ item.action }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 拒绝原因选择（当选择不合适状态时显示） -->
      <template v-if="isRejectionStatus">
        <el-form-item label="拒绝原因" prop="rejectionReasonCode">
          <el-select v-model="form.rejectionReasonCode" placeholder="请选择拒绝原因" style="width: 100%">
            <el-option-group
              v-for="group in rejectionReasonGroups"
              :key="group.category"
              :label="group.label"
            >
              <el-option
                v-for="item in group.reasons"
                :key="item.code"
                :label="item.label"
                :value="item.code"
              />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item label="详细说明">
          <el-input
            v-model="form.rejectionReasonDetail"
            type="textarea"
            :rows="2"
            placeholder="请详细说明拒绝原因（选填）"
          />
        </el-form-item>

        <el-form-item label="给候选人反馈">
          <el-input
            v-model="form.candidateFeedback"
            type="textarea"
            :rows="2"
            placeholder="填写给候选人的反馈信息（选填）"
          />
        </el-form-item>

        <el-form-item label="是否可重新打开">
          <el-switch v-model="form.isReopenable" active-text="是" inactive-text="否" />
        </el-form-item>

        <el-form-item v-if="form.isReopenable" label="重新打开条件">
          <el-input
            v-model="form.reopenConditions"
            placeholder="例如：3个月后可重新投递"
          />
        </el-form-item>
      </template>

      <!-- 面试安排（当安排面试时显示） -->
      <template v-if="isInterviewStatus">
        <el-form-item label="面试轮次">
          <el-input-number v-model="form.interviewRound" :min="1" :max="10" />
          <span style="margin-left: 8px; color: #909399">第 {{ form.interviewRound }} 轮</span>
        </el-form-item>

        <el-form-item label="面试时间">
          <el-date-picker
            v-model="form.nextInterviewAt"
            type="datetime"
            placeholder="选择面试时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </el-form-item>

        <el-form-item label="面试官">
          <el-input v-model="form.interviewerName" placeholder="面试官姓名" />
        </el-form-item>
      </template>

      <!-- 通用备注 -->
      <el-form-item label="备注说明">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="3"
          placeholder="请输入状态变更说明（选填）"
        />
      </el-form-item>

      <!-- 内部备注（仅拒绝时显示） -->
      <el-form-item v-if="isRejectionStatus" label="内部备注">
        <el-input
          v-model="form.internalNotes"
          type="textarea"
          :rows="2"
          placeholder="内部备注（不对候选人展示）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        确认变更
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../utils/api'
import { 
  MAIN_STATUS, 
  SUB_STATUS, 
  REJECTION_REASONS,
  StatusUtils 
} from '../constants/interviewStatus'
import { Document, UserFilled, Money, CircleCheck, CircleClose } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  candidate: Object,
  initialMainStatus: {
    type: String,
    default: ''
  },
  initialSubStatus: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)
const submitting = ref(false)

const form = ref({
  newMainStatus: '',
  newSubStatus: '',
  note: '',
  // 拒绝相关
  rejectionReasonCode: '',
  rejectionReasonDetail: '',
  candidateFeedback: '',
  isReopenable: false,
  reopenConditions: '',
  internalNotes: '',
  // 面试相关
  interviewRound: 1,
  nextInterviewAt: '',
  interviewerName: ''
})

// 主状态选项
const mainStatusOptions = computed(() => {
  return Object.values(MAIN_STATUS).map(status => ({
    ...status,
    icon: getIconComponent(status.icon)
  }))
})

// 根据选择的主状态获取可用的子状态
const availableSubStatuses = computed(() => {
  if (!form.value.newMainStatus) return []
  
  const subStatuses = SUB_STATUS[form.value.newMainStatus]
  if (!subStatuses) return []
  
  return Object.values(subStatuses).map(sub => ({
    code: sub.code,
    label: sub.label,
    color: sub.color,
    action: sub.action,
    isTerminal: sub.isTerminal || false
  }))
})

// 是否选择了拒绝状态
const isRejectionStatus = computed(() => {
  return form.value.newSubStatus && (
    form.value.newSubStatus.includes('rejected') || 
    form.value.newSubStatus.includes('abandoned')
  )
})

// 是否选择了面试相关状态
const isInterviewStatus = computed(() => {
  return form.value.newMainStatus === 'interviewing' && 
    ['round_scheduled', 'round_pending'].includes(form.value.newSubStatus)
})

// 拒绝原因分组
const rejectionReasonGroups = computed(() => {
  const groups = {}
  
  Object.values(REJECTION_REASONS).forEach(reason => {
    if (!groups[reason.category]) {
      groups[reason.category] = {
        category: reason.category,
        label: getCategoryLabel(reason.category),
        reasons: []
      }
    }
    groups[reason.category].reasons.push(reason)
  })
  
  return Object.values(groups)
})

const rules = {
  newSubStatus: [{ required: true, message: '请选择新状态', trigger: 'change' }],
  rejectionReasonCode: [{ 
    required: true, 
    message: '请选择拒绝原因', 
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (isRejectionStatus.value && !value) {
        callback(new Error('请选择拒绝原因'))
      } else {
        callback()
      }
    }
  }]
}

// 获取图标组件
function getIconComponent(iconName) {
  const iconMap = {
    'Document': Document,
    'ChatDotRound': UserFilled,
    'Money': Money,
    'CircleCheck': CircleCheck,
    'CircleClose': CircleClose
  }
  return iconMap[iconName] || Document
}

// 获取分类标签
function getCategoryLabel(category) {
  const labels = {
    'screening': '简历筛选阶段',
    'interview': '面试阶段',
    'salary': '谈薪阶段',
    'onboard': '入职阶段',
    'other': '其他'
  }
  return labels[category] || category
}

// 主状态标签类型
function getMainStatusType(mainStatus) {
  const typeMap = {
    'resume_screening': 'info',
    'interviewing': 'primary',
    'salary_negotiation': 'warning',
    'closed': 'success',
    'rejected': 'danger'
  }
  return typeMap[mainStatus] || 'info'
}

// 子状态标签类型
function getSubStatusType(subStatus) {
  if (subStatus?.includes('rejected') || subStatus?.includes('abandoned')) return 'danger'
  if (subStatus?.includes('passed') || subStatus === 'onboarded' || subStatus === 'offer_accepted') return 'success'
  if (subStatus?.includes('pending')) return 'warning'
  if (subStatus?.includes('scheduled') || subStatus === 'offer_sent') return 'primary'
  return 'info'
}

// 获取主状态标签
function getMainStatusLabel(mainStatus) {
  return MAIN_STATUS[mainStatus?.toUpperCase()]?.label || mainStatus || '未知'
}

// 获取子状态标签
function getSubStatusLabel(mainStatus, subStatus) {
  return StatusUtils.getSubStatus(mainStatus, subStatus)?.label || subStatus || '未知'
}

// 处理主状态变更
function handleMainStatusChange() {
  form.value.newSubStatus = ''
}

// 禁用过去的日期
const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    // 如果有初始状态值，使用它们；否则留空让用户选择
    const hasInitialStatus = props.initialMainStatus && props.initialSubStatus
    
    form.value = {
      newMainStatus: props.initialMainStatus || '',
      newSubStatus: props.initialSubStatus || '',
      note: '',
      rejectionReasonCode: '',
      rejectionReasonDetail: '',
      candidateFeedback: '',
      isReopenable: false,
      reopenConditions: '',
      internalNotes: '',
      interviewRound: (props.candidate?.interview_round || 0) + 1,
      nextInterviewAt: '',
      interviewerName: ''
    }
  }
})

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    // 构建请求参数
    const params = {
      mainStatus: form.value.newMainStatus,
      subStatus: form.value.newSubStatus,
      note: form.value.note,
      actionType: isRejectionStatus.value ? 'reject' : 'status_change'
    }

    // 拒绝相关参数
    if (isRejectionStatus.value) {
      params.rejectionReasonCode = form.value.rejectionReasonCode
      params.rejectionReasonDetail = form.value.rejectionReasonDetail
      params.candidateFeedback = form.value.candidateFeedback
      params.isReopenable = form.value.isReopenable
      params.reopenConditions = form.value.reopenConditions
      params.internalNotes = form.value.internalNotes
    }

    // 面试相关参数
    if (isInterviewStatus.value && form.value.nextInterviewAt) {
      params.nextInterviewAt = form.value.nextInterviewAt
      params.interviewRound = form.value.interviewRound
    }

    // 调用新API
    const result = await api.put(`/positions/position-resumes/${props.candidate.id}/status`, params)

    emit('success', result)
    visible.value = false
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.candidate-action-dialog .current-status {
  display: flex;
  gap: 8px;
  align-items: center;
}

.candidate-action-dialog .sub-status-tag {
  margin-left: 8px;
}

.candidate-action-dialog .status-selector {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 120px;
}

:deep(.el-select-group__title) {
  font-weight: 600;
  color: #303133;
  padding-left: 12px;
}
</style>
