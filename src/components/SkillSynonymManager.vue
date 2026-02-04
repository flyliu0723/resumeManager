<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="技能同义词管理"
    width="900px"
    :close-on-click-modal="false"
    class="skill-synonym-dialog"
  >
    <div class="dialog-header-actions">
      <el-button type="primary" @click="showBatchImport = true">
        <el-icon><Upload /></el-icon>
        批量导入
      </el-button>
      <el-button @click="exportData">
        <el-icon><Download /></el-icon>
        导出数据
      </el-button>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <!-- 添加/编辑标签页 -->
      <el-tab-pane label="添加/编辑" name="add">
        <div class="add-edit-panel">
          <el-alert
            title="提示：输入主技能名称和同义词，系统会在简历匹配时自动识别这些技能"
            type="info"
            :closable="false"
            class="tip-alert"
          />
          
          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="synonym-form">
            <el-form-item label="主技能" prop="skill">
              <el-input 
                v-model="form.skill" 
                placeholder="如：React"
                :disabled="isEdit"
              />
            </el-form-item>
            
            <el-form-item label="分类" prop="category">
              <el-select v-model="form.category" placeholder="选择分类" filterable allow-create>
                <el-option
                  v-for="cat in categories"
                  :key="cat"
                  :label="cat"
                  :value="cat"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="同义词" prop="synonyms">
              <div class="synonyms-input-wrapper">
                <el-input
                  v-model="synonymInput"
                  placeholder="输入同义词，按回车添加"
                  @keyup.enter="addSynonymTag"
                />
                <el-button type="primary" @click="addSynonymTag">添加</el-button>
              </div>
              <div class="synonyms-tags">
                <el-tag
                  v-for="(syn, index) in form.synonyms"
                  :key="index"
                  closable
                  @close="removeSynonym(index)"
                  class="synonym-tag"
                >
                  {{ syn }}
                </el-tag>
                <el-tag v-if="form.synonyms.length === 0" type="info">暂无同义词</el-tag>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="saveSkill" :loading="saving">
                {{ isEdit ? '更新' : '添加' }}
              </el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- 列表管理标签页 -->
      <el-tab-pane label="列表管理" name="list">
        <div class="list-panel">
          <div class="list-toolbar">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索技能或同义词"
              clearable
              prefix-icon="Search"
              style="width: 300px"
            />
            <el-select v-model="filterCategory" placeholder="筛选分类" clearable style="width: 150px">
              <el-option
                v-for="cat in categories"
                :key="cat"
                :label="cat"
                :value="cat"
              />
            </el-select>
            <el-button type="danger" @click="batchDelete" :disabled="selectedSkills.length === 0">
              批量删除 ({{ selectedSkills.length }})
            </el-button>
          </div>

          <el-table
            :data="filteredSkills"
            v-loading="loading"
            @selection-change="handleSelectionChange"
            row-key="skill"
            border
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="skill" label="主技能" min-width="120" sortable />
            <el-table-column prop="category" label="分类" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ row.category }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="同义词" min-width="250">
              <template #default="{ row }">
                <div class="synonyms-cell">
                  <el-tag
                    v-for="syn in row.synonyms.slice(0, 5)"
                    :key="syn"
                    size="small"
                    type="info"
                    class="cell-synonym-tag"
                  >
                    {{ syn }}
                  </el-tag>
                  <el-tag v-if="row.synonyms.length > 5" size="small" type="warning">
                    +{{ row.synonyms.length - 5 }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button-group>
                  <el-button type="primary" size="small" @click="editSkill(row)">编辑</el-button>
                  <el-button type="danger" size="small" @click="deleteSkill(row)">删除</el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              :total="totalSkills"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 批量导入标签页 -->
      <el-tab-pane label="批量导入" name="import">
        <div class="import-panel">
          <el-radio-group v-model="importFormat" class="import-format">
            <el-radio-button label="csv">CSV 格式</el-radio-button>
            <el-radio-button label="json">JSON 格式</el-radio-button>
          </el-radio-group>

          <div v-if="importFormat === 'csv'" class="format-example">
            <el-alert
              title="CSV 格式示例"
              type="info"
              :closable="false"
            />
            <pre class="example-code">
技能名称,同义词,分类
React,React.js|ReactJS|Next.js,前端框架
Vue,Vue.js|VueJS|Nuxt.js,前端框架
Java,Spring|Spring Boot|JavaEE,后端语言
            </pre>
          </div>

          <div v-if="importFormat === 'json'" class="format-example">
            <el-alert
              title="JSON 格式示例"
              type="info"
              :closable="false"
            />
            <pre class="example-code">
{
  "React": {
    "synonyms": ["React.js", "ReactJS", "Next.js"],
    "category": "前端框架"
  },
  "Vue": {
    "synonyms": ["Vue.js", "VueJS", "Nuxt.js"],
    "category": "前端框架"
  }
}
            </pre>
          </div>

          <el-input
            v-model="importContent"
            type="textarea"
            :rows="10"
            placeholder="粘贴 CSV 或 JSON 数据"
            class="import-textarea"
          />

          <div class="import-actions">
            <el-button @click="clearImport">清空</el-button>
            <el-button type="primary" @click="previewImport">预览</el-button>
            <el-button type="success" @click="confirmImport" :loading="importing">
              确认导入
            </el-button>
          </div>

          <!-- 预览表格 -->
          <el-table v-if="previewData.length > 0" :data="previewData" border class="preview-table">
            <el-table-column prop="skill" label="技能" />
            <el-table-column prop="category" label="分类" />
            <el-table-column label="同义词">
              <template #default="{ row }">
                <el-tag v-for="syn in row.synonyms" :key="syn" size="small" type="info" class="preview-tag">
                  {{ syn }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
      <el-button type="primary" @click="saveAll" :loading="savingAll">保存所有变更</el-button>
    </template>

    <!-- 编辑同义词对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑同义词"
      width="500px"
      append-to-body
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="主技能">
          <el-input v-model="editForm.skill" disabled />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" placeholder="选择分类" filterable allow-create>
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="同义词">
          <div class="edit-synonyms-list">
            <div v-for="(syn, index) in editForm.synonyms" :key="index" class="edit-synonym-item">
              <el-input v-model="editForm.synonyms[index]" size="small" />
              <el-button type="danger" size="small" circle @click="removeEditSynonym(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <el-button type="primary" size="small" @click="addEditSynonym">添加同义词</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Delete, Search } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'save'])

// 状态
const activeTab = ref('list')
const loading = ref(false)
const saving = ref(false)
const savingAll = ref(false)
const importing = ref(false)

// 表单
const formRef = ref(null)
const isEdit = ref(false)
const synonymInput = ref('')

const form = ref({
  skill: '',
  category: '',
  synonyms: []
})

const rules = {
  skill: [{ required: true, message: '请输入主技能名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }]
}

// 数据
const skills = ref([])
const selectedSkills = ref([])
const searchKeyword = ref('')
const filterCategory = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 导入
const showBatchImport = ref(false)
const importFormat = ref('csv')
const importContent = ref('')
const previewData = ref([])

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = ref({
  skill: '',
  category: '',
  synonyms: []
})

// 预定义分类
const categories = ref([
  '前端框架',
  '后端语言',
  '后端框架',
  '数据库',
  '移动端',
  '云服务',
  'DevOps',
  '工具',
  '测试',
  '数据',
  'AI',
  '架构',
  '工程化',
  '前端技术',
  '其他'
])

// 计算属性
const filteredSkills = computed(() => {
  let result = skills.value

  // 分类筛选
  if (filterCategory.value) {
    result = result.filter(s => s.category === filterCategory.value)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(s => 
      s.skill.toLowerCase().includes(keyword) ||
      s.synonyms.some(syn => syn.toLowerCase().includes(keyword))
    )
  }

  return result
})

const totalSkills = computed(() => filteredSkills.value.length)

// 监听
watch(() => props.visible, (val) => {
  if (val) {
    fetchSkills()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'import') {
    showBatchImport.value = true
  }
})

// 方法
const fetchSkills = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/skill-synonyms')
    const data = await response.json()
    if (data.success) {
      skills.value = Object.entries(data.data).map(([skill, info]) => ({
        skill,
        category: info.category,
        synonyms: info.synonyms || []
      }))
    }
  } catch (e) {
    ElMessage.error('获取技能列表失败')
  } finally {
    loading.value = false
  }
}

const addSynonymTag = () => {
  const value = synonymInput.value.trim()
  if (!value) return
  
  if (form.value.synonyms.includes(value)) {
    ElMessage.warning('该同义词已存在')
    return
  }
  
  form.value.synonyms.push(value)
  synonymInput.value = ''
}

const removeSynonym = (index) => {
  form.value.synonyms.splice(index, 1)
}

const saveSkill = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const url = isEdit.value ? `/api/skill-synonyms/${form.value.skill}` : '/api/skill-synonyms'
    const method = isEdit.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        synonyms: form.value.synonyms,
        category: form.value.category
      })
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      resetForm()
      fetchSkills()
      activeTab.value = 'list'
    } else {
      ElMessage.error(data.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  form.value = {
    skill: '',
    category: '',
    synonyms: []
  }
  isEdit.value = false
  synonymInput.value = ''
  formRef.value?.resetFields()
}

const editSkill = (row) => {
  editForm.value = {
    skill: row.skill,
    category: row.category,
    synonyms: [...row.synonyms]
  }
  editDialogVisible.value = true
}

const saveEdit = () => {
  const index = skills.value.findIndex(s => s.skill === editForm.value.skill)
  if (index !== -1) {
    skills.value[index] = { ...editForm.value }
    ElMessage.success('已更新，记得点击"保存所有变更"按钮保存到服务器')
  }
  editDialogVisible.value = false
}

const addEditSynonym = () => {
  editForm.value.synonyms.push('')
}

const removeEditSynonym = (index) => {
  editForm.value.synonyms.splice(index, 1)
}

const deleteSkill = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除技能 "${row.skill}" 吗？`, '确认删除', {
      type: 'warning'
    })

    const response = await fetch(`/api/skill-synonyms/${row.skill}`, {
      method: 'DELETE'
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('删除成功')
      fetchSkills()
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSelectionChange = (selection) => {
  selectedSkills.value = selection
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedSkills.value.length} 个技能吗？`, '确认批量删除', {
      type: 'warning'
    })

    const skillsToDelete = selectedSkills.value.map(s => s.skill)
    
    // 这里应该有一个批量删除的API
    for (const skill of skillsToDelete) {
      await fetch(`/api/skill-synonyms/${skill}`, { method: 'DELETE' })
    }

    ElMessage.success('批量删除成功')
    fetchSkills()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const previewImport = () => {
  if (!importContent.value.trim()) {
    ElMessage.warning('请先输入导入数据')
    return
  }

  try {
    if (importFormat.value === 'csv') {
      previewData.value = parseCSV(importContent.value)
    } else {
      const jsonData = JSON.parse(importContent.value)
      previewData.value = Object.entries(jsonData).map(([skill, info]) => ({
        skill,
        category: info.category,
        synonyms: Array.isArray(info.synonyms) ? info.synonyms : []
      }))
    }
    ElMessage.success(`解析成功，共 ${previewData.value.length} 条记录`)
  } catch (e) {
    ElMessage.error('解析失败，请检查数据格式')
    previewData.value = []
  }
}

const parseCSV = (csv) => {
  const lines = csv.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length >= 3) {
      result.push({
        skill: values[0],
        synonyms: values[1].split('|').filter(s => s),
        category: values[2]
      })
    }
  }

  return result
}

const clearImport = () => {
  importContent.value = ''
  previewData.value = []
}

const confirmImport = async () => {
  if (previewData.value.length === 0) {
    ElMessage.warning('请先预览数据')
    return
  }

  importing.value = true
  try {
    const response = await fetch('/api/skill-synonyms/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: importFormat.value,
        data: previewData.value
      })
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success(`成功导入 ${data.imported || previewData.value.length} 条记录`)
      clearImport()
      fetchSkills()
      activeTab.value = 'list'
    } else {
      ElMessage.error(data.message || '导入失败')
    }
  } catch (e) {
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}

const exportData = () => {
  const exportObj = {}
  skills.value.forEach(s => {
    exportObj[s.skill] = {
      synonyms: s.synonyms,
      category: s.category
    }
  })

  const dataStr = JSON.stringify(exportObj, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `skill-synonyms-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

const saveAll = async () => {
  savingAll.value = true
  try {
    const data = {}
    skills.value.forEach(s => {
      data[s.skill] = {
        synonyms: s.synonyms,
        category: s.category
      }
    })

    const response = await fetch('/api/skill-synonyms/save-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('保存成功')
      emit('save', data)
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    savingAll.value = false
  }
}

const handleSizeChange = (size) => {
  pageSize.value = size
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

onMounted(() => {
  if (props.visible) {
    fetchSkills()
  }
})
</script>

<style scoped>
.skill-synonym-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}

.dialog-header-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.tip-alert {
  margin-bottom: 20px;
}

.synonym-form {
  max-width: 500px;
}

.synonyms-input-wrapper {
  display: flex;
  gap: 10px;
}

.synonyms-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.synonym-tag {
  cursor: pointer;
}

.list-panel {
  padding: 10px 0;
}

.list-toolbar {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.synonyms-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.cell-synonym-tag {
  margin-right: 0;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.import-panel {
  padding: 10px 0;
}

.import-format {
  margin-bottom: 20px;
}

.format-example {
  margin-bottom: 20px;
}

.example-code {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  margin-top: 10px;
  overflow-x: auto;
}

.import-textarea {
  margin-bottom: 15px;
}

.import-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.preview-table {
  margin-top: 20px;
}

.preview-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.edit-synonyms-list {
  max-height: 300px;
  overflow-y: auto;
}

.edit-synonym-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.edit-synonym-item .el-input {
  flex: 1;
}
</style>
