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
            @click="store.setCurrentPosition(position.id)"
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
            <div class="position-count">{{ getResumeCount(position.id) }}</div>
          </div>
          <div v-if="store.activePositions.length === 0" class="empty-tip">暂无招聘中的职位</div>
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
            @click="store.setCurrentPosition(position.id)"
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
            <div class="position-count archived-count">{{ getResumeCount(position.id) }}</div>
          </div>
          <div v-if="store.archivedPositions.length === 0" class="empty-tip">暂无已归档的职位</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '新增职位' : '编辑职位'" width="480px">
      <el-form :model="form" label-width="80px" :rules="rules" ref="formRef">
        <el-form-item label="职位名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入职位名称" />
        </el-form-item>
        <el-form-item label="所属公司">
          <el-autocomplete
            v-model="form.company"
            :fetch-suggestions="searchCompany"
            placeholder="请输入公司名称"
            :trigger-on-focus="false"
            clearable
            @select="handleCompanySelect"
          />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="form.start_date" type="date" placeholder="选择开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="职位描述">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入职位描述（JD）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <!-- <el-button v-if="dialogType === 'edit'" type="danger" @click="handleDelete" :loading="submitLoading">删除职位</el-button> -->
        <div style="flex: 1"></div>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="archiveDialogVisible" title="归档职位" width="420px">
      <div class="archive-dialog-content">
        <div class="archive-position-info">
          <strong>{{ form.name }}</strong>
          <span class="archive-company">{{ form.company }}</span>
        </div>
        <el-form label-width="80px">
          <el-form-item label="归档原因" required>
            <el-input v-model="archiveReason" type="textarea" :rows="3" placeholder="请输入归档原因（必填）" maxlength="200" show-word-limit />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="archiveDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="handleArchive" :loading="archiveLoading" :disabled="!archiveReason.trim()">确认归档</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePositionStore } from '../stores/position'
import { api } from '../utils/api'
import { useMessage, useConfirm } from '../hooks'
import { Plus, ArrowDown, Edit, FolderOpened, RefreshRight } from '@element-plus/icons-vue'

const store = usePositionStore()
const { success, error } = useMessage()
const { confirm } = useConfirm()

const activeExpanded = ref(true)
const archivedExpanded = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const archiveDialogVisible = ref(false)
const archiveReason = ref('')
const formRef = ref(null)
const submitLoading = ref(false)
const archiveLoading = ref(false)

const form = ref({ id: null, name: '', company: '', start_date: new Date().toISOString().split('T')[0], description: '' })
const rules = { name: [{ required: true, message: '请输入职位名称', trigger: 'blur' }] }

const companyOptions = ref([])
const searchLoading = ref(false)

const getResumeCount = (positionId) => store.getPositionResumes(positionId).length

const showAddDialog = () => {
  form.value = { id: null, name: '', company: '', start_date: new Date().toISOString().split('T')[0], description: '' }
  dialogType.value = 'add'
  dialogVisible.value = true
}

const showEditDialog = (position) => {
  form.value = { ...position }
  dialogType.value = 'edit'
  dialogVisible.value = true
}

const showArchiveDialog = (position) => {
  form.value = { ...position }
  archiveReason.value = ''
  archiveDialogVisible.value = true
}

const searchCompany = (keyword, cb) => {
  if (!keyword) return cb([])
  searchLoading.value = true
  api.get('/companies/search', { keyword }).then(data => {
    companyOptions.value = data || []
    cb(companyOptions.value.map(c => ({ value: c.name })))
  }).catch(() => cb([])).finally(() => searchLoading.value = false)
}

const handleCompanySelect = (item) => { form.value.company = item.value }

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    if (dialogType.value === 'add') {
      await store.addPosition(form.value)
    } else {
      await store.updatePosition(form.value.id, form.value)
    }
    
    dialogVisible.value = false
    success(dialogType.value === 'add' ? '添加成功' : '更新成功')
  } catch (e) {
    if (e !== 'cancel') error(e.message || '操作失败')
  } finally {
    submitLoading.value = false
  }
}

const handleArchive = async () => {
  try {
    archiveLoading.value = true
    await store.archivePosition(form.value.id, archiveReason.value)
    archiveDialogVisible.value = false
    success('已归档')
  } catch (e) {
    error(e.message || '归档失败')
  } finally {
    archiveLoading.value = false
  }
}

const handleRestore = async (position) => {
  try {
    await confirm(`确定要恢复职位 "${position.name}" 吗？`)
    await store.restorePosition(position.id)
    success('已恢复')
  } catch (e) {
    if (e !== 'cancel') error(e.message || '恢复失败')
  }
}

const handleDelete = async () => {
  try {
    await confirm(`确定要删除职位 "${form.value.name}" 吗？删除后无法恢复`, '警告', { type: 'error' })
    await store.deletePosition(form.value.id)
    dialogVisible.value = false
    success('已删除')
  } catch (e) {
    if (e !== 'cancel') error(e.message || '删除失败')
  }
}
</script>

<style scoped>
.position-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.nav-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.position-sections {
  flex: 1;
  overflow-y: auto;
}

.section {
  border-bottom: 1px solid #e4e7ed;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: #f5f7fa;
}

.expand-icon {
  transition: transform 0.2s;
  color: #909399;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.section-content {
  padding: 0 8px 8px;
}

.position-item {
  display: flex;
  align-items: center;
  padding: 12px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.position-item:hover {
  background: #f5f7fa;
}

.position-item.active {
  background: #ecf5ff;
}

.position-item.archived {
  opacity: 0.8;
}

.position-info {
  flex: 1;
  min-width: 0;
}

.position-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.position-company {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.position-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.position-item:hover .position-actions {
  opacity: 1;
}

.position-count {
  font-size: 12px;
  color: #909399;
  padding: 2px 8px;
  background: #f4f4f5;
  border-radius: 10px;
  margin-left: 8px;
}

.archived-count {
  background: #fdf6ec;
  color: #e6a23c;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.archive-dialog-content {
  padding: 0 8px;
}

.archive-position-info {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.archive-position-info strong {
  font-size: 16px;
  color: #303133;
}

.archive-company {
  font-size: 13px;
  color: #909399;
}
</style>
