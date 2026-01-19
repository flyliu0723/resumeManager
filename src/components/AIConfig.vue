<template>
  <div class="ai-config-container">
    <div class="config-header">
      <h3>AI 解析配置</h3>
      <el-button type="primary" @click="showAddDialog">添加配置</el-button>
    </div>

    <div class="config-list">
      <el-table :data="configs" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="配置名称" min-width="120">
          <template #default="{ row }">
            <span>{{ row.name }}</span>
            <el-tag v-if="row.is_active" type="success" size="small" class="active-tag">已启用</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="provider" label="提供商" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getProviderTagType(row.provider)">
              {{ getProviderLabel(row.provider) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="model" label="模型" min-width="120">
          <template #default="{ row }">
            <span>{{ row.model || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="api_url" label="API 地址" min-width="150">
          <template #default="{ row }">
            <span class="api-url">{{ row.api_url || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="80" align="center">
          <template #default="{ row }">
            <span>{{ row.priority }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click="testConfig(row)">测试</el-button>
              <el-button type="success" size="small" @click="setActive(row)" :disabled="row.is_active">启用</el-button>
              <el-button type="warning" size="small" @click="editConfig(row)">编辑</el-button>
              <el-button type="danger" size="small" @click="deleteConfig(row)">删除</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="configs.length === 0 && !loading" class="empty-tip">
        <el-empty description="暂无 AI 配置" />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑配置' : '添加配置'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="formData.name" placeholder="如: 智谱GLM-4" />
        </el-form-item>

        <el-form-item label="提供商" prop="provider">
          <el-select v-model="formData.provider" placeholder="选择提供商" @change="handleProviderChange">
            <el-option
              v-for="provider in providers"
              :key="provider.value"
              :label="provider.label"
              :value="provider.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="['zhipu', 'minimax', 'deepseek', 'openai'].includes(formData.provider)" label="API Key" prop="api_key">
          <el-input v-model="formData.api_key" placeholder="输入 API Key" show-password />
          <div class="form-tip">{{ getApiKeyTip() }}</div>
        </el-form-item>

        <el-form-item label="API 地址" prop="api_url">
          <el-input v-model="formData.api_url" :placeholder="getApiUrlPlaceholder()" />
        </el-form-item>

        <el-form-item label="模型" prop="model">
          <el-select v-model="formData.model" placeholder="选择模型" filterable allow-create>
            <el-option
              v-for="model in availableModels"
              :key="model.value"
              :label="model.label"
              :value="model.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级">
          <el-input-number v-model="formData.priority" :min="0" :max="99" />
          <span class="form-tip">数字越小优先级越高</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="testDialogVisible" title="测试结果" width="400px">
      <div :class="['test-result', testResult.success ? 'success' : 'error']">
        <el-icon :size="48">
          <CircleCheck v-if="testResult.success" />
          <CircleClose v-else />
        </el-icon>
        <p>{{ testResult.message }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'

const API_BASE = 'http://localhost:3000'

const configs = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const testDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const testResult = ref({ success: false, message: '' })

const providers = ref([])
const availableModels = ref([])

const formData = ref({
  id: null,
  name: '',
  provider: 'zhipu',
  api_key: '',
  api_url: 'https://open.bigmodel.cn/api/paas/v4',
  model: '',
  priority: 0
})

const rules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  provider: [{ required: true, message: '请选择提供商', trigger: 'change' }],
  api_key: [{ required: true, message: '请输入 API Key', trigger: 'blur' }]
}

const getProviderLabel = (provider) => {
  const found = providers.value.find(p => p.value === provider)
  return found ? found.label : provider
}

const getProviderTagType = (provider) => {
  const types = {
    zhipu: 'success',
    minimax: 'warning',
    deepseek: '',
    openai: 'info'
  }
  return types[provider] || ''
}

const getApiKeyTip = () => {
  const tips = {
    zhipu: '在智谱AI开放平台获取: https://open.bigmodel.cn/usercenter/apikeys',
    minimax: '在MiniMax开放平台获取: https://api.minimax.chat/user-center/basics',
    deepseek: '在DeepSeek官网获取: https://platform.deepseek.com/api-keys',
    openai: '在 OpenAI 官网获取: https://platform.openai.com/api-keys'
  }
  return tips[formData.value.provider] || ''
}

const getApiUrlPlaceholder = () => {
  const placeholders = {
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    minimax: 'https://api.minimax.chat/v1',
    deepseek: 'https://api.deepseek.com',
    openai: 'https://api.openai.com/v1'
  }
  return placeholders[formData.value.provider] || ''
}

const handleProviderChange = () => {
  fetchModels(formData.value.provider)

  const defaultUrls = {
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    minimax: 'https://api.minimax.chat/v1',
    deepseek: 'https://api.deepseek.com',
    openai: 'https://api.openai.com/v1'
  }

  formData.value.api_url = defaultUrls[formData.value.provider] || ''
  formData.value.model = ''
}

const fetchProviders = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/ai-providers`)
    const data = await res.json()
    if (data.success) {
      providers.value = data.data
    }
  } catch (e) {
    console.error('获取提供商列表失败:', e)
  }
}

const fetchModels = async (provider) => {
  try {
    const res = await fetch(`${API_BASE}/api/ai-models?provider=${provider}`)
    const data = await res.json()
    if (data.success) {
      availableModels.value = data.data
    }
  } catch (e) {
    console.error('获取模型列表失败:', e)
  }
}

const fetchConfigs = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/ai-configs`)
    const data = await res.json()
    if (data.success) {
      configs.value = data.data
    }
  } catch (e) {
    ElMessage.error('获取配置列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  formData.value = {
    id: null,
    name: '',
    provider: 'zhipu',
    api_key: '',
    api_url: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4',
    priority: configs.value.length
  }
  fetchModels('zhipu')
  dialogVisible.value = true
}

const editConfig = (config) => {
  isEdit.value = true
  formData.value = { ...config }
  fetchModels(config.provider)
  dialogVisible.value = true
}

const saveConfig = async () => {
  try {
    await formRef.value.validate()
    saving.value = true

    const url = isEdit.value
      ? `${API_BASE}/api/ai-configs/${formData.value.id}`
      : `${API_BASE}/api/ai-configs`

    const method = isEdit.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    })

    const data = await res.json()

    if (data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      dialogVisible.value = false
      fetchConfigs()
    } else {
      ElMessage.error(data.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const testConfig = async (config) => {
  try {
    const res = await fetch(`${API_BASE}/api/ai-configs/${config.id}/test`, {
      method: 'POST'
    })
    const data = await res.json()
    testResult.value = data
    testDialogVisible.value = true
  } catch (e) {
    testResult.value = { success: false, message: '测试请求失败' }
    testDialogVisible.value = true
  }
}

const setActive = async (config) => {
  try {
    await ElMessageBox.confirm(`确定要启用 "${config.name}" 作为当前解析器吗？`, '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await fetch(`${API_BASE}/api/ai-configs/${config.id}/set-active`, {
      method: 'POST'
    })
    const data = await res.json()

    if (data.success) {
      ElMessage.success('已启用')
      fetchConfigs()
    } else {
      ElMessage.error(data.message || '操作失败')
    }
  } catch (e) {
    // 用户取消
  }
}

const deleteConfig = async (config) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置 "${config.name}" 吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const res = await fetch(`${API_BASE}/api/ai-configs/${config.id}`, {
      method: 'DELETE'
    })
    const data = await res.json()

    if (data.success) {
      ElMessage.success('删除成功')
      fetchConfigs()
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch (e) {
    // 用户取消
  }
}

onMounted(() => {
  fetchProviders()
  fetchConfigs()
})
</script>

<style scoped>
.ai-config-container {
  background: #fff;
  border-radius: 4px;
  padding: 20px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.config-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.active-tag {
  margin-left: 8px;
}

.api-url {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.empty-tip {
  padding: 40px 0;
}

.test-result {
  text-align: center;
  padding: 20px;
}

.test-result.success {
  color: #67c23a;
}

.test-result.error {
  color: #f56c6c;
}

.test-result p {
  margin-top: 10px;
  font-size: 14px;
}
</style>
