<template>
  <el-dialog
    v-model="visible"
    :title="`JD补充 - ${positionName}`"
    width="480px"
  >
    <div class="jd-extra-list" v-if="notes.length > 0">
      <div v-for="note in notes" :key="note.id" class="note-item">
        <div class="note-content">
          <el-input
            v-if="editingNoteId === note.id"
            v-model="editingNoteContent"
            size="small"
            @keydown.enter="saveNoteEdit(note)"
            @blur="saveNoteEdit(note)"
          />
          <span v-else>{{ note.content }}</span>
        </div>
        <div class="note-actions">
          <el-button v-if="editingNoteId !== note.id" type="primary" link size="small" @click="startEditNote(note)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button v-if="editingNoteId === note.id" type="success" link size="small" @click="saveNoteEdit(note)">
            <el-icon><Check /></el-icon>
          </el-button>
          <el-button type="danger" link size="small" @click="deleteNote(note)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <div v-else class="no-notes">
      暂无JD补充信息
    </div>
    
    <div class="add-note-form">
      <el-input
        v-model="newNoteContent"
        placeholder="输入JD补充信息，按回车或点击添加"
        size="small"
        @keydown.enter="addNote"
        clearable
      >
        <template #append>
          <el-button @click="addNote" :disabled="!newNoteContent.trim()">
            <el-icon><Plus /></el-icon>
          </el-button>
        </template>
      </el-input>
    </div>
    
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePositionStore } from '../stores/position'
import { ElMessage } from 'element-plus'
import { Edit, Check, Delete, Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  positionId: Number,
  positionName: String
})

const emit = defineEmits(['update:modelValue'])

const store = usePositionStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const notes = computed(() => store.positionNotes[props.positionId] || [])
const newNoteContent = ref('')
const editingNoteId = ref(null)
const editingNoteContent = ref('')

watch(visible, async (val) => {
  if (val && props.positionId) {
    await store.fetchPositionNotes(props.positionId)
  }
})

const addNote = async () => {
  if (!newNoteContent.value.trim() || !props.positionId) return
  
  const note = await store.addPositionNote(props.positionId, newNoteContent.value.trim())
  if (note) {
    ElMessage.success('添加成功')
    newNoteContent.value = ''
  } else {
    ElMessage.error('添加失败')
  }
}

const startEditNote = (note) => {
  editingNoteId.value = note.id
  editingNoteContent.value = note.content
}

const saveNoteEdit = async (note) => {
  if (!editingNoteContent.value.trim()) {
    editingNoteId.value = null
    return
  }
  
  const success = await store.updatePositionNote(props.positionId, note.id, editingNoteContent.value.trim())
  if (success) {
    ElMessage.success('更新成功')
  } else {
    ElMessage.error('更新失败')
  }
  editingNoteId.value = null
  editingNoteContent.value = ''
}

const deleteNote = async (note) => {
  try {
    const success = await store.deletePositionNote(props.positionId, note.id)
    if (success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败: ' + e.message)
    }
  }
}
</script>

<style scoped>
.jd-extra-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.note-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
}

.note-content {
  flex: 1;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  word-break: break-word;
}

.note-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.no-notes {
  text-align: center;
  padding: 30px 20px;
  color: #909399;
  font-size: 13px;
}

.add-note-form {
  margin-top: 12px;
}
</style>
