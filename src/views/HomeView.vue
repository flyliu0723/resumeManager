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
        :position-id="currentPosition?.id"
        :position-name="currentPosition?.name"
        @view-jd="openJD"
        @parse="handleParse"
        @evaluate="handleEvaluate"
        @schedule="handleSchedule"
        @success="handleStatusUpdateSuccess"
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
          <div class="jd-section-header">
            <h4>职位描述</h4>
            <el-button 
              type="primary" 
              size="small" 
              :loading="parsingJD"
              @click="handleParseJD"
            >
              提取JD
            </el-button>
          </div>
          <p class="jd-text">{{ currentPosition.description || '暂无描述' }}</p>
        </div>
        <el-divider />
        
        <!-- 提取的JD信息 -->
        <div v-if="hasParsedJD" class="parsed-section">
          <h4>提取的信息</h4>
          
          <!-- 技能标签 -->
          <div class="parsed-item">
            <label>技能要求：</label>
            <div class="skills-container">
              <el-tag
                v-for="skill in parsedSkills"
                :key="skill"
                closable
                @close="removeSkill(skill)"
              >
                {{ skill }}
              </el-tag>
              <span v-if="parsedSkills.length === 0" class="empty-text">暂无技能信息</span>
            </div>
          </div>
          
          <!-- 学历要求 -->
          <div class="parsed-item">
            <label>学历要求：</label>
            <el-input
              v-model="parsedEducation"
              placeholder="请输入学历要求"
              size="small"
            />
          </div>
          
          <!-- 经验要求 -->
          <div class="parsed-item">
            <label>经验要求：</label>
            <el-input
              type="textarea"
              v-model="parsedExperience"
              placeholder="请输入经验要求"
              size="small"
            />
          </div>
          
          <!-- 保存按钮 -->
          <div class="parsed-actions">
            <el-button type="primary" size="small" @click="saveParsedJD">
              保存
            </el-button>
          </div>
        </div>
        
        <el-divider v-if="hasParsedJD" />
        
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
        :accept="['.pdf', '.doc', '.docx']"
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
      
      <div class="upload-form" v-if="selectedFile">
        <el-form label-width="80px">
          <el-form-item label="简历来源">
            <el-select v-model="uploadForm.source" placeholder="请选择来源">
              <el-option label="BOSS直聘" value="boss" />
              <el-option label="拉勾网" value="lagou" />
              <el-option label="猎聘网" value="liepin" />
              <el-option label="猎头推荐" value="recruiter" />
              <el-option label="其他渠道" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="uploadForm.note" type="textarea" placeholder="请输入备注信息" :rows="3" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="confirmUpload">确认上传</el-button>
            <el-button @click="cancelUpload">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PositionNav from '../components/PositionNav.vue'
import CandidateList from '../components/CandidateList.vue'
import CandidateDetail from '../components/CandidateDetail.vue'
import { usePositionStore } from '../stores/position'
import { api } from '../utils/api'
import { Calendar, UploadFilled, Plus, Edit, Check, Delete } from '@element-plus/icons-vue'

const store = usePositionStore()

onMounted(() => {
  store.fetchPositions()
})

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

// JD解析相关状态
const parsingJD = ref(false)
const parsedSkills = ref([])
const parsedEducation = ref('')
const parsedExperience = ref('')

// 计算属性：判断是否已解析JD
const hasParsedJD = computed(() => {
  return parsedSkills.value.length > 0 || parsedEducation.value || parsedExperience.value
})

// 上传表单数据
const selectedFile = ref(null)
const uploadForm = ref({
  source: 'other',
  note: ''
})

const handleSelectCandidate = async (candidate) => {
  selectedCandidate.value = candidate
  selectedCandidateDetail.value = candidate
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
    // 获取已解析的JD数据
    const parsedData = await store.fetchParsedJD(store.currentPositionId)
    if (parsedData) {
      parsedSkills.value = parsedData.skills || []
      parsedEducation.value = parsedData.education || ''
      parsedExperience.value = parsedData.experience || ''
    }
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

  // 存储选中的文件
  selectedFile.value = file
}

const confirmUpload = () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  const file = selectedFile.value
  store.addResume(store.currentPositionId, {
    name: file.name,
    size: file.size,
    type: file.raw.type,
    raw: file.raw,
    source: uploadForm.value.source,
    note: uploadForm.value.note
  }).then(async () => {
    ElMessage.success(`${file.name} 上传成功`)
    showUpload.value = false
    resetUploadForm()
    
    // 轮询检查评估进度
    if (store.currentPositionId) {
      await store.fetchResumes(store.currentPositionId)
      const matches = store.getPositionResumes(store.currentPositionId)
      const newMatch = matches[0]
      if (newMatch) {
        await pollMatchDetail(newMatch.id, 20)
      }
    }
  }).catch((error) => {
    ElMessage.error('上传失败: ' + (error.message || '未知错误'))
  })
}

const cancelUpload = () => {
  showUpload.value = false
  resetUploadForm()
}

const resetUploadForm = () => {
  selectedFile.value = null
  uploadForm.value = {
    source: 'other',
    note: ''
  }
}


const handleParse = async () => {
  if (!selectedCandidate.value) return
  
  const resumeId = selectedCandidate.value.resume_id
  const positionId = selectedCandidate.value.position_id
  
  if (!resumeId) {
    ElMessage.error('简历ID不存在')
    return
  }
  
  parsing.value = true
  try {
    await api.post(`/resumes/${resumeId}/parse?positionId=${positionId}`)
    ElMessage.success('解析已开始，请稍后...')
    
    await pollResumeDetail(resumeId, 10)
  } catch (error) {
    ElMessage.error('解析失败: ' + error.message)
  } finally {
    parsing.value = false
  }
}

const handleEvaluate = async () => {
  if (!selectedCandidate.value) return
  
  const matchId = selectedCandidate.value.id
  const resumeId = selectedCandidate.value.resume_id
  const positionId = selectedCandidate.value.position_id
  
  if (!matchId || !resumeId || !positionId) {
    ElMessage.error('缺少必要的信息')
    return
  }
  
  evaluating.value = true
  try {
    await api.post(`/positions/${positionId}/resumes/${resumeId}/evaluate`)
    ElMessage.success('匹配评估已开始，请稍后...')
    
    await pollMatchDetail(matchId, 10)
  } catch (error) {
    ElMessage.error('评估失败: ' + error.message)
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

async function pollMatchDetail(matchId, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (store.currentPositionId) {
      await store.fetchResumes(store.currentPositionId)
      const matches = store.getPositionResumes(store.currentPositionId)
      const match = matches.find(m => m.id === matchId)
      if (match && match.evaluation) {
        selectedCandidateDetail.value = match
        selectedCandidate.value = match
        ElMessage.success('评估完成')
        return
      }
    }
  }
  // 超时后仍然刷新一次
  if (store.currentPositionId) {
    await store.fetchResumes(store.currentPositionId)
    const matches = store.getPositionResumes(store.currentPositionId)
    const match = matches.find(m => m.id === matchId)
    if (match) {
      selectedCandidateDetail.value = match
      selectedCandidate.value = match
    }
  }
}

const handleSchedule = () => {
  ElMessage.info('面试安排功能开发中...')
}

// 状态更新成功后的处理
const handleStatusUpdateSuccess = async (result) => {
  ElMessage.success('状态更新成功')
  
  // 刷新当前职位的候选人列表
  if (store.currentPositionId) {
    await store.fetchResumes(store.currentPositionId)
  }
  
  // 刷新当前选中候选人的详情
  if (selectedCandidateDetail.value?.id && result?.id) {
    const updatedMatch = await store.fetchResumeDetail(selectedCandidateDetail.value.id)
    if (updatedMatch) {
      selectedCandidateDetail.value = updatedMatch
    }
  }
}

// 解析JD
const handleParseJD = async () => {
  if (!store.currentPositionId) return
  
  parsingJD.value = true
  try {
    const result = await store.parsePositionJD(store.currentPositionId)
    if (result) {
      parsedSkills.value = result.skills || []
      parsedEducation.value = result.education || ''
      parsedExperience.value = result.experience || ''
      ElMessage.success('JD解析成功')
    } else {
      ElMessage.error('JD解析失败')
    }
  } catch (error) {
    ElMessage.error('JD解析失败: ' + error.message)
  } finally {
    parsingJD.value = false
  }
}

// 保存解析结果
const saveParsedJD = async () => {
  if (!store.currentPositionId) return
  
  try {
    // 保存技能
    await store.updateParsedField(store.currentPositionId, 'parsed_skills', parsedSkills.value)
    // 保存学历
    await store.updateParsedField(store.currentPositionId, 'parsed_education', parsedEducation.value)
    // 保存经验
    await store.updateParsedField(store.currentPositionId, 'parsed_experience', parsedExperience.value)
    
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

// 删除技能标签
const removeSkill = (skill) => {
  const index = parsedSkills.value.indexOf(skill)
  if (index > -1) {
    parsedSkills.value.splice(index, 1)
  }
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

.jd-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.jd-section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.parsed-section {
  margin-top: 16px;
}

.parsed-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.parsed-item {
  margin-bottom: 16px;
}

.parsed-item label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skills-container .el-tag {
  margin-right: 0;
}

.empty-text {
  color: #909399;
  font-size: 13px;
}

.parsed-actions {
  margin-top: 16px;
  text-align: right;
}

.parsed-item .el-input {
  width: 100%;
}
</style>
