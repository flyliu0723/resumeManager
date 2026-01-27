<template>
  <el-dialog
    v-model="visible"
    title="更新候选人状态"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px" :rules="rules" ref="formRef">
      <el-form-item label="当前状态">
        <el-tag :type="getStatusType(candidate?.current_status || candidate?.status)" size="large">
          {{ getStatusText(candidate?.current_status || candidate?.status) }}
        </el-tag>
      </el-form-item>

      <el-form-item label="下一步" prop="toStatus">
        <el-select v-model="form.toStatus" placeholder="请选择状态" style="width: 100%">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="备注说明">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="3"
          placeholder="请输入状态变更说明（选填）"
        />
      </el-form-item>

      <el-form-item label="JD补充">
        <el-input
          v-model="form.jdSupplement"
          type="textarea"
          :rows="3"
          placeholder="如有新的招聘要求，可在此补充（选填）"
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

const props = defineProps({
  modelValue: Boolean,
  candidate: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)
const submitting = ref(false)

const form = ref({
  toStatus: '',
  note: '',
  jdSupplement: ''
})

const statusOptions = [
  { value: '待沟通', label: '待沟通' },
  { value: '待面试', label: '待面试' },
  { value: '面试中', label: '面试中' },
  { value: '谈薪中', label: '谈薪中' },
  { value: '已成单', label: '已成单' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' }
]

const rules = {
  toStatus: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const getStatusType = (status) => {
  const types = {
    '待沟通': 'warning',
    '待面试': 'info',
    '面试中': 'success',
    '谈薪中': 'success',
    '已成单': 'success',
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
    '谈薪中': '谈薪中',
    '已成单': '已成单',
    '已通过': '已通过',
    '已拒绝': '已拒绝'
  }
  return texts[status] || status || '未知'
}

watch(visible, (val) => {
  if (val) {
    form.value = {
      toStatus: '',
      note: '',
      jdSupplement: ''
    }
  }
})

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    const fromStatus = props.candidate?.current_status || props.candidate?.status

    const result = await api.post('/flow-logs/match/flow-log', {
      matchId: props.candidate.id,
      fromStatus,
      toStatus: form.value.toStatus,
      note: form.value.note,
      jdSupplement: form.value.jdSupplement
    })

    emit('success', result)
    visible.value = false
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>
