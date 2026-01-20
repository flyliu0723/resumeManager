<template>
  <div class="home-container">
    <div class="sidebar-left">
      <PositionNav />
    </div>
    <div class="main-area">
        <div v-if="currentPosition" class="center-panel">
        <CandidateList
          :candidates="currentCandidates"
          :selected-candidate="selectedCandidateDetail"
          @select="handleSelectCandidate"
          @upload="handleUpload"
          @view-jd="openJD"
        />
      </div>
      <div v-else class="empty-center">
        <el-empty description="请选择职位" />
      </div>
    </div>
    <div class="sidebar-right">
      <CandidateDetail
        :candidate="selectedCandidateDetail"
        :parsing="parsing"
        :evaluating="evaluating"
        :position-archived="currentPosition?.status === 'archived'"
        :position-archive-reason="currentPosition?.archive_reason || ''"
        @view-jd="openJD"
        @parse="handleParse"
        @evaluate="handleEvaluate"
        @schedule="handleSchedule"
      />
    </div>

    <el-drawer
      v-model="showJD"
      title="职位详情"
      direction="rtl"
      size="500px"
    >
      <div v-if="currentPosition" class="jd-drawer-content">
        <div class="jd-header">
          <h2>{{ currentPosition.name }}</h2>
          <el-tag v-if="currentPosition.company" type="info" size="small">{{ currentPosition.company }}</el-tag>
        </div>
        <div v-if="currentPosition.start_date" class="jd-meta">
          <el-icon><Calendar /></el-icon>
          <span>开始日期: {{ currentPosition.start_date }}</span>
        </div>
        <el-divider />
        <div class="jd-section">
          <h4>职位描述</h4>
          <p class="jd-text">{{ currentPosition.description || '暂无描述' }}</p>
        </div>
        <el-divider />
        <div class="notes-section">
          <h4>职位补充</h4>
          <div class="notes-list" v-if="positionNotes.length > 0">
            <div v-for="note in positionNotes" :key="note.id" class="note-item">
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
            暂无补充信息
          </div>
          <div class="add-note-form">
            <el-input
              v-model="newNoteContent"
              placeholder="输入补充信息，按回车或点击添加"
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
        </div>
      </div>
    </el-drawer>


    <el-dialog
      v-model="showUpload"
      title="上传简历"
      width="500px"
      destroy-on-close
    >
      <el-upload
        class="upload-dialog"
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :accept="'.pdf,.doc,.docx'"
        :limit="10"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 PDF、Word 格式，单个文件不超过 10MB
          </div>
        </template>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import PositionNav from '../components/PositionNav.vue'
import CandidateList from '../components/CandidateList.vue'
import CandidateDetail from '../components/CandidateDetail.vue'
import { usePositionStore } from '../stores/position'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, UploadFilled, Plus, Edit, Check, Delete } from '@element-plus/icons-vue'

const store = usePositionStore()
const currentPosition = computed(() => store.getCurrentPosition())
const currentCandidates = computed(() => store.getPositionResumes(store.currentPositionId))

const positionNotes = computed(() => store.positionNotes[store.currentPositionId] || [])

const selectedCandidate = ref(null)
const selectedCandidateDetail = ref(null)
const showJD = ref(false)
const showUpload = ref(false)
const parsing = ref(false)
const evaluating = ref(false)
const newNoteContent = ref('')
const editingNoteId = ref(null)
const editingNoteContent = ref('')

const handleSelectCandidate = async (candidate) => {
  selectedCandidate.value = candidate
  selectedCandidateDetail.value = await store.fetchResumeDetail(candidate.id)
  console.log("🚀 ~ handleSelectCandidate ~ selectedCandidateDetail.value:", selectedCandidateDetail.value)
}

const handleUpload = () => {
  showUpload.value = true
}

const addNote = async () => {
  if (!newNoteContent.value.trim()) return
  if (!store.currentPositionId) return
  
  const note = await store.addPositionNote(store.currentPositionId, newNoteContent.value.trim())
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
  
  const success = await store.updatePositionNote(store.currentPositionId, note.id, editingNoteContent.value.trim())
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
    await ElMessageBox.confirm('确定要删除这条补充信息吗？', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const success = await store.deletePositionNote(store.currentPositionId, note.id)
    if (success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const openJD = async () => {
  showJD.value = true
  if (store.currentPositionId) {
    await store.fetchPositionNotes(store.currentPositionId)
  }
}

const handleFileChange = (file) => {
  const isValidFormat = 
    file.raw.type === 'application/pdf' ||
    file.raw.name.endsWith('.doc') ||
    file.raw.name.endsWith('.docx')
  
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidFormat) {
    ElMessage.error('只能上传 PDF、Word 格式的文件！')
    return
  }

  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB！')
    return
  }

  store.addResume(store.currentPositionId, {
    name: file.name,
    size: file.size,
    type: file.raw.type,
    raw: file.raw
  }).then(async () => {
    ElMessage.success(`${file.name} 上传成功`)
    showUpload.value = false
    
    // 轮询检查评估进度
    if (store.currentPositionId) {
      const resumes = store.getPositionResumes(store.currentPositionId)
      const newResume = resumes[resumes.length - 1]
      if (newResume) {
        await pollResumeDetail(newResume.id, 10)
      }
    }
  }).catch((error) => {
    ElMessage.error('上传失败: ' + (error.message || '未知错误'))
  })
}


const handleParse = async () => {
  if (!selectedCandidate.value) return
  
  parsing.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/resumes/${selectedCandidate.value.id}/parse`, {
      method: 'POST'
    })
    const data = await res.json()
    
    if (data.success) {
      ElMessage.success('解析完成，正在进行匹配评估...')
      
      // 轮询检查评估进度
      await pollResumeDetail(selectedCandidate.value.id, 10)
    } else {
      ElMessage.error('解析失败: ' + data.message)
    }
  } catch (error) {
    ElMessage.error('解析失败: ' + error.message)
  } finally {
    evaluating.value = false
  }
}

async function pollResumeDetail(resumeId, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 500))
    const detail = await store.fetchResumeDetail(resumeId)
    if (detail && detail.evaluation) {
      selectedCandidateDetail.value = detail
      ElMessage.success('评估完成')
      return
    }
  }
  // 超时后仍然刷新一次
  selectedCandidateDetail.value = await store.fetchResumeDetail(resumeId)
}

const handleEvaluate = async () => {
  if (!selectedCandidate.value) return
  
  evaluating.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/resumes/${selectedCandidate.value.id}/evaluate`, {
      method: 'POST'
    })
    const data = await res.json()
    
    if (data.success) {
      ElMessage.success('匹配评估已开始，请稍后...')
      
      // 轮询检查评估进度
      await pollResumeDetail(selectedCandidate.value.id, 10)
    } else {
      ElMessage.error('评估失败: ' + data.message)
    }
  } catch (error) {
    ElMessage.error('评估失败: ' + error.message)
  } finally {
    evaluating.value = false
  }
}

const handleSchedule = () => {
  ElMessage.info('面试安排功能开发中...')
}

watch(() => store.currentPositionId, () => {
  selectedCandidate.value = null
  selectedCandidateDetail.value = null
})
</script>

<style scoped>
.home-container {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

.sidebar-left {
  width: 260px;
  background: #fff;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
}

.main-area {
  flex: 1;
  min-width: 340px;
  max-width: 400px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
}

.center-panel {
  height: 100%;
}

.empty-center {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-right {
  flex: 1;
  min-width: 420px;
  background: #fff;
  overflow: hidden;
}

.jd-drawer-content {
  padding: 0 8px;
}

.jd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.jd-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.jd-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}

.jd-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.jd-text {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.notes-section {
  margin-top: 16px;
}

.notes-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.notes-list {
  margin-bottom: 12px;
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
  padding: 20px;
  color: #909399;
  font-size: 13px;
}

.add-note-form {
  margin-top: 12px;
}

.original-dialog-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.upload-dialog {
  width: 100%;
}

.upload-dialog .el-upload {
  width: 100%;
}

.upload-dialog .el-upload-dragger {
  width: 100%;
}
</style>
