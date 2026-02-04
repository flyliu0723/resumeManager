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
      @close="handleDrawerClose"
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
        
        <el-tabs v-model="jdActiveTab" class="jd-tabs">
          <!-- 职位描述标签页 -->
          <el-tab-pane label="职位描述" name="jd">
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
          </el-tab-pane>
          
          <!-- 推荐简历标签页 -->
          <el-tab-pane label="推荐简历" name="recommend">
            <div class="recommend-tab-content">
              <!-- 状态显示 -->
              <div v-if="getRecommendStatus().status === 'processing'" class="recommend-status">
                <el-alert
                  :title="getRecommendStatus().message || '正在计算推荐...'"
                  type="info"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <el-progress :percentage="50" :indeterminate="true" :stroke-width="2" />
                  </template>
                </el-alert>
              </div>
              
              <!-- 开始推荐按钮 -->
              <div v-if="hasParsedJD && getRecommendStatus().status !== 'processing'" class="recommend-actions">
                <el-button
                  type="primary"
                  size="small"
                  :loading="recommendLoading"
                  @click="handleStartRecommend"
                >
                  <el-icon><MagicStick /></el-icon>
                  {{ getPositionRecommendations().length > 0 ? '重新推荐' : '开始推荐' }}
                </el-button>
              </div>
              
              <!-- 推荐列表组件 -->
              <RecommendResumeList
                :position-id="currentPosition.id"
                :position-parsed="hasParsedJD"
                :recommendations="getPositionRecommendations()"
                :loading="recommendLoading"
                :loading-more="false"
                :has-more="recommendHasMore"
                @refresh="handleRefreshRecommend"
                @load-more="handleLoadMoreRecommend"
                @accept="handleAcceptRecommend"
                @view-detail="handleViewRecommendDetail"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
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
          accept=".pdf,.doc,.docx"
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
      
      <div class="upload-form" v-if="selectedFile && !uploading">
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

      <div v-if="uploading" class="uploading-status">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p class="uploading-text">{{ uploadingText }}</p>
        <p class="uploading-tip">文件解析中，请稍候...</p>
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
import RecommendResumeList from '../components/RecommendResumeList.vue'
import { usePositionStore } from '../stores/position'
import { api } from '../utils/api'
import { Calendar, UploadFilled, Plus, Edit, Check, Delete, MagicStick, Loading } from '@element-plus/icons-vue'

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
const uploading = ref(false)
const uploadingText = ref('正在上传...')
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

// 推荐简历相关状态
const jdActiveTab = ref('jd')
const recommendLoading = ref(false)
const recommendStatusPolling = ref(null)
const currentRecommendPage = ref(1)
const recommendPageSize = 10

// 计算属性：判断是否已解析JD
const hasParsedJD = computed(() => {
  return parsedSkills.value.length > 0 || parsedEducation.value || parsedExperience.value
})

// 推荐相关计算属性
const recommendHasMore = computed(() => {
  const recommendations = store.getPositionRecommendations(store.currentPositionId)
  return recommendations.length >= currentRecommendPage.value * recommendPageSize.value
})

// 获取当前职位的推荐列表
const getPositionRecommendations = () => {
  return store.getPositionRecommendations(store.currentPositionId)
}

// 获取当前职位的推荐状态
const getRecommendStatus = () => {
  return store.getPositionRecommendStatus(store.currentPositionId)
}

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
  // 清理之前的轮询
  handleDrawerClose()
  // 重置标签页
  jdActiveTab.value = 'jd'
  // 重置推荐分页
  currentRecommendPage.value = 1
  
  if (store.currentPositionId) {
    await store.fetchPositionNotes(store.currentPositionId)
    // 获取已解析的JD数据
    const parsedData = await store.fetchParsedJD(store.currentPositionId)
    if (parsedData) {
      parsedSkills.value = parsedData.skills || []
      parsedEducation.value = parsedData.education || ''
      parsedExperience.value = parsedData.experience || ''
    }
    
    // 获取推荐状态
    await store.getRecommendStatus(store.currentPositionId)
    
    // 如果已经有推荐数据，刷新推荐列表
    const existingRecommendations = store.getPositionRecommendations(store.currentPositionId)
    if (existingRecommendations.length > 0) {
      await store.getRecommendations(store.currentPositionId, 1, recommendPageSize.value)
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

const confirmUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  uploading.value = true
  uploadingText.value = '正在上传简历...'

  const file = selectedFile.value
  try {
    await store.addResume(store.currentPositionId, {
      name: file.name,
      size: file.size,
      type: file.raw.type,
      raw: file.raw,
      source: uploadForm.value.source,
      note: uploadForm.value.note
    })

    uploadingText.value = '正在解析简历...'
    await new Promise(r => setTimeout(r, 500))

    ElMessage.success(`${file.name} 上传成功`)
    showUpload.value = false
    resetUploadForm()

    if (store.currentPositionId) {
      await store.fetchResumes(store.currentPositionId)
      const matches = store.getPositionResumes(store.currentPositionId)
      const newMatch = matches[0]
      if (newMatch) {
        await pollMatchDetail(newMatch.id, 20)
        await store.fetchResumes(store.currentPositionId)
      }
    }
  } catch (error) {
    ElMessage.error('上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploading.value = false
  }
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

// 抽屉关闭时的清理
const handleDrawerClose = () => {
  // 停止轮询推荐状态
  if (recommendStatusPolling.value) {
    clearInterval(recommendStatusPolling.value)
    recommendStatusPolling.value = null
  }
}

// 开始推荐
const handleStartRecommend = async () => {
  if (!store.currentPositionId) return
  
  recommendLoading.value = true
  try {
    // 先清空现有推荐
    store.recommendations[store.currentPositionId] = []
    
    const result = await store.triggerRecommend(store.currentPositionId)
    if (result) {
      ElMessage.success('推荐计算已启动')
      // 开始轮询状态
      startPollRecommendStatus()
    }
  } catch (error) {
    ElMessage.error('启动推荐失败: ' + error.message)
  } finally {
    recommendLoading.value = false
  }
}

// 轮询推荐状态
const startPollRecommendStatus = () => {
  // 清除之前的轮询
  if (recommendStatusPolling.value) {
    clearInterval(recommendStatusPolling.value)
  }
  
  // 立即检查一次
  pollRecommendStatus()
  
  // 每2秒检查一次状态
  recommendStatusPolling.value = setInterval(async () => {
    await pollRecommendStatus()
  }, 2000)
  
  // 30秒后自动停止轮询
  setTimeout(() => {
    if (recommendStatusPolling.value) {
      clearInterval(recommendStatusPolling.value)
      recommendStatusPolling.value = null
    }
  }, 30000)
}

const pollRecommendStatus = async () => {
  if (!store.currentPositionId) return
  
  const status = await store.getRecommendStatus(store.currentPositionId)
  if (status) {
    if (status.status === 'completed') {
      // 计算完成，获取推荐列表
      if (recommendStatusPolling.value) {
        clearInterval(recommendStatusPolling.value)
        recommendStatusPolling.value = null
      }
      await store.getRecommendations(store.currentPositionId, 1, recommendPageSize.value)
      currentRecommendPage.value = 1
    } else if (status.status === 'idle' || status.status === 'error') {
      // 空闲或出错状态，停止轮询
      if (recommendStatusPolling.value) {
        clearInterval(recommendStatusPolling.value)
        recommendStatusPolling.value = null
      }
    }
  }
}

// 刷新推荐列表
const handleRefreshRecommend = async () => {
  if (!store.currentPositionId) return
  
  recommendLoading.value = true
  currentRecommendPage.value = 1
  try {
    await store.getRecommendations(store.currentPositionId, 1, recommendPageSize.value)
    ElMessage.success('刷新成功')
  } catch (error) {
    ElMessage.error('刷新失败: ' + error.message)
  } finally {
    recommendLoading.value = false
  }
}

// 加载更多推荐
const handleLoadMoreRecommend = async () => {
  if (!store.currentPositionId) return
  
  const nextPage = currentRecommendPage.value + 1
  const result = await store.getRecommendations(store.currentPositionId, nextPage, recommendPageSize.value)
  if (result.items.length > 0) {
    currentRecommendPage.value = nextPage
  }
}

// 接受推荐（推进入职流程）
const handleAcceptRecommend = async (item) => {
  if (!store.currentPositionId || !item.resume_id) return
  
  try {
    await ElMessageBox.confirm(
      `确定将"${item.candidate_name}"推进入职流程吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    recommendLoading.value = true
    const result = await store.acceptRecommendation(store.currentPositionId, item.resume_id)
    if (result && result.success) {
      ElMessage.success('已推进入职流程')
      // 刷新推荐列表
      await handleRefreshRecommend()
    } else {
      ElMessage.error(result?.message || '操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + error.message)
    }
  } finally {
    recommendLoading.value = false
  }
}

// 查看推荐详情
const handleViewRecommendDetail = (item) => {
  // 在候选人列表中找到对应的候选人并选中
  const candidates = store.getPositionResumes(store.currentPositionId)
  const match = candidates.find(c => c.resume_id === item.resume_id)
  if (match) {
    handleSelectCandidate(match)
    ElMessage.success('已切换到候选人详情')
  } else {
    ElMessage.warning('未找到对应的候选人信息')
  }
}

watch(() => store.currentPositionId, () => {
  selectedCandidate.value = null
  selectedCandidateDetail.value = null
  // 清理推荐相关状态
  handleDrawerClose()
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

.uploading-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-icon {
  font-size: 48px;
  color: #409EFF;
  animation: spin 1s linear infinite;
}

.uploading-text {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.uploading-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

/* 推荐简历标签页样式 */
.jd-tabs {
  height: 100%;
}

.jd-tabs :deep(.el-tabs__content) {
  height: calc(100% - 55px);
  overflow-y: auto;
}

.jd-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.recommend-tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.recommend-status {
  margin-bottom: 12px;
}

.recommend-status :deep(.el-alert) {
  margin-bottom: 8px;
}

.recommend-status :deep(.el-progress) {
  margin-top: 8px;
}

.recommend-actions {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 12px;
}

.recommend-actions .el-button {
  font-size: 12px;
}

.recommend-actions .el-icon {
  margin-right: 4px;
}
</style>
