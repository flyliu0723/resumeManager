<template>
  <div class="position-nav">
    <div class="nav-header">
      <h3>职位管理</h3>
      <el-button type="primary" size="small" @click="showAddDialog">新增职位</el-button>
    </div>
    
    <el-menu
      :default-active="String(store.currentPositionId)"
      @select="handleSelect"
    >
      <el-menu-item 
        v-for="position in store.positions" 
        :key="position.id" 
        :index="String(position.id)"
      >
        <span>{{ position.name }}</span>
        <div class="menu-actions" @click.stop>
          <el-button type="primary" link size="small" @click="showEditDialog(position)">
            <el-icon><edit /></el-icon>
          </el-button>
        </div>
      </el-menu-item>
    </el-menu>

    <el-dialog v-model="addDialogVisible" title="新增职位" width="500px">
      <el-form :model="positionForm" label-width="80px">
        <el-form-item label="职位名称">
          <el-input v-model="positionForm.name" placeholder="请输入职位名称" />
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
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑职位" width="500px">
      <el-form :model="positionForm" label-width="80px">
        <el-form-item label="职位名称">
          <el-input v-model="positionForm.name" placeholder="请输入职位名称" />
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
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { usePositionStore } from '../stores/position'
import { ElMessage } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'

const store = usePositionStore()
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const editingId = ref(null)
const positionForm = reactive({
  name: '',
  description: ''
})

const showAddDialog = () => {
  positionForm.name = ''
  positionForm.description = ''
  addDialogVisible.value = true
}

const showEditDialog = (position) => {
  editingId.value = position.id
  positionForm.name = position.name
  positionForm.description = position.description || ''
  editDialogVisible.value = true
}

const handleSelect = (index) => {
  store.setCurrentPosition(Number(index))
}

const handleAdd = async () => {
  if (!positionForm.name.trim()) {
    ElMessage.warning('请输入职位名称')
    return
  }
  
  const id = await store.addPosition({
    name: positionForm.name,
    description: positionForm.description
  })
  
  if (id) {
    store.setCurrentPosition(id)
    addDialogVisible.value = false
    ElMessage.success('职位添加成功')
  } else {
    ElMessage.error('添加失败')
  }
}

const handleEdit = async () => {
  if (!positionForm.name.trim()) {
    ElMessage.warning('请输入职位名称')
    return
  }
  
  const success = await store.updatePosition(editingId.value, {
    name: positionForm.name,
    description: positionForm.description
  })
  
  if (success) {
    await store.fetchPositions()
    editDialogVisible.value = false
    ElMessage.success('职位更新成功')
  } else {
    ElMessage.error('更新失败')
  }
}
</script>

<style scoped>
.position-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e6e6e6;
}

.nav-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
}

.nav-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.el-menu {
  flex: 1;
  border-right: none;
}

.el-menu-item {
  height: 50px;
  line-height: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-menu-item:hover {
  background-color: #f5f7fa;
}

.el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
}

.menu-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.el-menu-item:hover .menu-actions {
  opacity: 1;
}
</style>
