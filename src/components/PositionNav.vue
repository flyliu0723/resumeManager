<template>
  <div class="position-nav">
    <div class="nav-header">
      <h3>职位</h3>
      <el-button type="primary" size="small" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        新增
      </el-button>
    </div>

    <div class="position-sections">
      <div class="section active-section">
        <div class="section-header" @click="activeExpanded = !activeExpanded">
          <el-icon :class="['expand-icon', { expanded: activeExpanded }]"><ArrowDown /></el-icon>
          <span class="section-title">招聘中 ({{ store.activePositions.length }})</span>
        </div>
        <div v-show="activeExpanded" class="section-content">
          <div
            v-for="position in store.activePositions"
            :key="position.id"
            :class="['position-item', { active: store.currentPositionId === position.id }]"
            @click="handleSelect(position.id)"
          >
            <div class="position-info">
              <div class="position-name">{{ position.name }}</div>
              <div class="position-company">{{ position.company || '未设置公司' }}</div>
            </div>
            <div class="position-actions" @click.stop>
              <el-button type="primary" link size="small" @click="showEditDialog(position)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="warning" link size="small" @click="showArchiveDialog(position)">
                <el-icon><FolderOpened /></el-icon>
              </el-button>
            </div>
            <div class="position-count">
              {{ getResumeCount(position.id) }}
            </div>
          </div>
          <div v-if="store.activePositions.length === 0" class="empty-tip">
            暂无招聘中的职位
          </div>
        </div>
      </div>

      <div class="section archived-section">
        <div class="section-header" @click="archivedExpanded = !archivedExpanded">
          <el-icon :class="['expand-icon', { expanded: archivedExpanded }]"><ArrowDown /></el-icon>
          <span class="section-title">已归档 ({{ store.archivedPositions.length }})</span>
        </div>
        <div v-show="archivedExpanded" class="section-content">
          <div
            v-for="position in store.archivedPositions"
            :key="position.id"
            :class="['position-item archived', { active: store.currentPositionId === position.id }]"
            @click="handleSelect(position.id)"
          >
            <div class="position-info">
              <div class="position-name">{{ position.name }}</div>
              <div class="position-company">{{ position.company || '未设置公司' }}</div>
            </div>
            <div class="position-actions" @click.stop>
              <el-button type="success" link size="small" @click="handleRestore(position)">
                <el-icon><RefreshRight /></el-icon>
              </el-button>
            </div>
            <div class="position-count archived-count">
              {{ getResumeCount(position.id) }}
            </div>
          </div>
          <div v-if="store.archivedPositions.length === 0" class="empty-tip">
            暂无已归档的职位
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="addDialogVisible" title="新增职位" width="480px">
      <el-form :model="positionForm" label-width="80px" :rules="formRules" ref="formRef">
        <el-form-item label="职位名称" prop="name">
          <el-input v-model="positionForm.name" placeholder="请输入职位名称" />
        </el-form-item>
        <el-form-item label="所属公司" prop="company">
          <el-autocomplete
            v-model="positionForm.company"
            :fetch-suggestions="searchCompanies"
            placeholder="请输入公司名称"
            :trigger-on-focus="false"
            clearable
            @select="handleCompanySelect"
          />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="positionForm.start_date"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="职位描述">
          <el-input
            v-model="positionForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入职位描述（JD）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="loading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑职位" width="480px">
      <el-form :model="editForm" label-width="80px" :rules="formRules">
        <el-form-item label="职位名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入职位名称" />
        </el-form-item>
        <el-form-item label="所属公司" prop="company">
          <el-autocomplete
            v-model="editForm.company"
            :fetch-suggestions="searchCompanies"
            placeholder="请输入公司名称"
            :trigger-on-focus="false"
            clearable
            @select="handleEditCompanySelect"
          />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="editForm.start_date"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="职位描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入职位描述（JD）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="danger" @click="handleDelete" :loading="deleting">删除职位</el-button>
        <div style="flex: 1"></div>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEdit" :loading="editing">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="archiveDialogVisible" title="归档职位" width="420px">
      <div class="archive-dialog-content">
        <div class="archive-position-info">
          <strong>{{ archiveForm.name }}</strong>
          <span class="archive-company">{{ archiveForm.company }}</span>
        </div>
        <el-form :model="archiveForm" label-width="80px">
          <el-form-item label="归档原因" required>
            <el-input
              v-model="archiveForm.reason"
              type="textarea"
              :rows="3"
              placeholder="请输入归档原因（必填）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="archiveDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="handleArchive" :loading="archiving" :disabled="!archiveForm.reason.trim()">确认归档</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { Plus, ArrowDown, Edit, Delete, FolderOpened, FolderRemove } from '@element-plus/icons-vue'
import { usePositionStore } from '../stores/position'
import { api } from '../utils/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = usePositionStore()
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const archiveDialogVisible = ref(false)
const loading = ref(false)
const editing = ref(false)
const deleting = ref(false)
const archiving = ref(false)
const formRef = ref(null)
const companyList = ref([])
const editingId = ref(null)
const activeExpanded = ref(true)
const archivedExpanded = ref(false)

const positionForm = reactive({
  name: '',
  company: '',
  start_date: new Date().toISOString().split('T')[0],
  description: ''
})

const editForm = reactive({
  name: '',
  company: '',
  start_date: '',
  description: ''
})

const archiveForm = reactive({
  id: null,
  name: '',
  company: '',
  reason: ''
})

const formRules = {
  name: [{ required: true, message: '请输入职位名称', trigger: 'blur' }]
}

const getResumeCount = (positionId) => {
  const resumes = store.resumes[positionId] || []
  return resumes.length
}

const handleSelect = (id) => {
  store.setCurrentPosition(id)
}

const showAddDialog = () => {
  positionForm.name = ''
  positionForm.company = ''
  positionForm.start_date = new Date().toISOString().split('T')[0]
  positionForm.description = ''
  addDialogVisible.value = true
}

const searchCompanies = async (keyword, cb) => {
  if (!keyword) {
    cb([])
    return
  }
  try {
    const companies = await api.get('/companies/search', { keyword })
    companyList.value = companies || []
    cb(companyList.value.map(c => ({ value: c.name })))
  } catch (error) {
    console.error('搜索公司失败:', error)
    cb([])
  }
}

const handleCompanySelect = (item) => {
  positionForm.company = item.value
}

const handleAdd = async () => {
  if (!positionForm.name.trim()) {
    ElMessage.warning('请输入职位名称')
    return
  }
  
  loading.value = true
  try {
    const id = await store.addPosition({
      name: positionForm.name,
      company: positionForm.company,
      start_date: positionForm.start_date,
      description: positionForm.description
    })

    if (id) {
      addDialogVisible.value = false
      ElMessage.success('职位添加成功')
    } else {
      ElMessage.error('添加失败，请刷新列表重试')
      store.fetchPositions()
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleEditCompanySelect = (item) => {
  editForm.company = item.value
}

const showEditDialog = (position) => {
  editingId.value = position.id
  editForm.name = position.name || ''
  editForm.company = position.company || ''
  editForm.start_date = position.start_date || ''
  editForm.description = position.description || ''
  editDialogVisible.value = true
}

const showArchiveDialog = (position) => {
  archiveForm.id = position.id
  archiveForm.name = position.name
  archiveForm.company = position.company
  archiveForm.reason = ''
  archiveDialogVisible.value = true
}

const handleArchive = async () => {
  if (!archiveForm.reason.trim()) {
    ElMessage.warning('请输入归档原因')
    return
  }
  
  archiving.value = true
  try {
    const success = await store.archivePosition(archiveForm.id, archiveForm.reason)
    if (success) {
      archiveDialogVisible.value = false
      ElMessage.success('职位已归档')
    } else {
      ElMessage.error('归档失败')
    }
  } catch (error) {
    ElMessage.error('归档失败: ' + error.message)
  } finally {
    archiving.value = false
  }
}

const handleRestore = async (position) => {
  try {
    await ElMessageBox.confirm(`确定要恢复职位"${position.name}"吗？`, '恢复职位', {
      confirmButtonText: '确定恢复',
      cancelButtonText: '取消',
      type: 'info'
    })
    
    const success = await store.restorePosition(position.id)
    if (success) {
      ElMessage.success('职位已恢复')
    } else {
      ElMessage.error('恢复失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('恢复失败: ' + error.message)
    }
  }
}

const handleEdit = async () => {
  if (!editForm.name.trim()) {
    ElMessage.warning('请输入职位名称')
    return
  }
  
  editing.value = true
  try {
    const success = await store.updatePosition(editingId.value, {
      name: editForm.name,
      company: editForm.company,
      start_date: editForm.start_date,
      description: editForm.description
    })
    
    if (success) {
      editDialogVisible.value = false
      ElMessage.success('更新成功')
    } else {
      ElMessage.error('更新失败')
    }
  } catch (error) {
    ElMessage.error('更新失败: ' + error.message)
  } finally {
    editing.value = false
  }
}

const handleDelete = async () => {
  if (!editingId.value) return
  
  try {
    await ElMessageBox.confirm('确定要删除该职位吗？删除后无法恢复。', '警告', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    deleting.value = true
    const resumes = store.getPositionResumes(editingId.value)
    if (resumes.length > 0) {
      ElMessage.warning('该职位下还有简历，请先删除简历后再删除职位')
      return
    }
    
    const success = await store.deletePosition(editingId.value)
    
    if (success) {
      editDialogVisible.value = false
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败，请刷新列表重试')
      store.fetchPositions()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  store.fetchPositions()
})
</script>

<style scoped>
.position-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.nav-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.position-sections {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.section-header:hover {
  background: #f5f7fa;
}

.expand-icon {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s;
  margin-right: 6px;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.section-content {
  padding: 4px 0;
}

.position-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.position-item:hover {
  background: #f5f7fa;
}

.position-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.position-item.archived {
  opacity: 0.7;
}

.position-item.archived:hover {
  background: #fdf6ec;
}

.position-item.archived.active {
  background: #fdf6ec;
  border-color: #e6a23c;
}

.position-info {
  flex: 1;
  min-width: 0;
}

.position-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  margin-right: 8px;
}

.position-item:hover .position-actions {
  opacity: 1;
}

.position-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.position-company {
  font-size: 12px;
  color: #909399;
}

.position-count {
  background: #e4e7ed;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.position-item.active .position-count {
  background: #409eff;
  color: #fff;
}

.position-count.archived-count {
  background: #fdf6ec;
  color: #e6a23c;
}

.empty-tip {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 12px;
}

.archive-dialog-content {
  padding: 10px 0;
}

.archive-position-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.archive-company {
  color: #909399;
  font-size: 13px;
}
</style>
