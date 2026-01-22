<template>
  <div class="resume-preview">
    <div class="preview-header">
      <h4>已上传简历</h4>
      <span class="count">({{ resumes.length }}份)</span>
    </div>

    <div v-if="resumes.length === 0" class="empty-tip">
      <el-empty description="暂无上传的简历" :image-size="80" />
    </div>

    <div v-else class="resume-list">
      <div 
        v-for="resume in resumes" 
        :key="resume.id" 
        class="resume-item"
      >
        <div class="resume-info">
          <el-icon class="file-icon"><document /></el-icon>
          <div class="resume-detail">
            <span class="resume-name">
              {{ resume.candidate_name || '未知' }}
              <el-tag size="small" type="info" class="file-tag">{{ resume.name }}</el-tag>
              <el-tag v-if="resume.parsed_data" size="small" type="success">已解析</el-tag>
              <el-tag v-else size="small" type="warning">未解析</el-tag>
            </span>
            <span class="resume-size">{{ formatSize(resume.size) }} · {{ formatDate(resume.created_at) }}</span>
          </div>
        </div>
        <div class="resume-actions">
          <el-button type="primary" link @click="previewResume(resume)">
            <el-icon><view /></el-icon>
            预览
          </el-button>
          <el-button type="success" link @click="viewParsedResult(resume)" :disabled="!resume.parsed_data">
            <el-icon><document-checked /></el-icon>
            解析结果
          </el-button>
          <el-button type="warning" link :loading="parsingIds.includes(resume.id)" @click="parseResume(resume)">
            <el-icon><document /></el-icon>
            重新解析
          </el-button>
          <el-button type="danger" link @click="deleteResume(resume.id)">
            <el-icon><delete /></el-icon>
            删除
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      :title="previewFile?.name"
      width="80%"
      top="5vh"
    >
      <div class="preview-content">
        <iframe 
          v-if="previewFile && isPDF(previewFile)"
          :src="`http://localhost:3000/api/resumes/${previewFile.id}/preview`"
          class="preview-frame"
        />
        <div v-else class="word-tip">
          <el-icon size="48"><warning /></el-icon>
          <p>Word 文档无法在线预览，请下载后查看</p>
          <p class="file-info">文件名: {{ previewFile?.name }}</p>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="parsedVisible"
      :title="`解析结果 - ${parsedResultData?.name || currentParsedResume?.candidate_name || '未知'}`"
      width="70%"
      top="5vh"
    >
      <div v-if="parsedResultData" class="parsed-result">
        <div class="result-meta">
          <el-tag type="info">解析时间: {{ formatDate(parsedResultData.parsed_at || currentParsedResume?.parsed_at) }}</el-tag>
          <el-tag type="success">解析器: {{ parsedResultData.parser || currentParsedResume?.parser || '未知' }}</el-tag>
          <el-tag v-if="parsedResultData.model || currentParsedResume?.model" type="warning">模型: {{ parsedResultData.model || currentParsedResume?.model }}</el-tag>
        </div>

        <el-divider content-position="left">基本信息</el-divider>
        <div class="info-cards">
          <div class="info-card">
            <div class="card-icon"><el-icon><user /></el-icon></div>
            <div class="card-content">
              <span class="card-label">姓名</span>
              <span class="card-value">{{ parsedResultData.name || currentParsedResume?.candidate_name || '未知' }}</span>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon"><el-icon><message /></el-icon></div>
            <div class="card-content">
              <span class="card-label">邮箱</span>
              <span class="card-value">{{ parsedResultData.email || '未提取到' }}</span>
            </div>
          </div>
          <div class="info-card">
            <div class="card-icon"><el-icon><phone /></el-icon></div>
            <div class="card-content">
              <span class="card-label">电话</span>
              <span class="card-value">{{ parsedResultData.mobile || '未提取到' }}</span>
            </div>
          </div>
        </div>

        <el-divider content-position="left">技能标签</el-divider>
        <div class="skills-container">
          <el-tag 
            v-for="skill in (parsedResultData.skills || [])" 
            :key="skill" 
            type="primary" 
            class="skill-tag"
          >
            {{ skill }}
          </el-tag>
          <span v-if="!parsedResultData.skills || parsedResultData.skills.length === 0" class="no-data">未提取到技能</span>
        </div>

        <el-divider content-position="left">教育背景</el-divider>
        <div class="section-content">
          <p v-if="parsedResultData.education">{{ parsedResultData.education }}</p>
          <p v-else class="no-data">未提取到教育背景</p>
        </div>

        <el-divider content-position="left">工作经历</el-divider>
        <div class="section-content">
          <p v-if="parsedResultData.experience">{{ parsedResultData.experience }}</p>
          <p v-else class="no-data">未提取到工作经历</p>
        </div>

        <el-divider content-position="left">公司经历</el-divider>
        <div class="companies-container">
          <el-tag 
            v-for="company in (parsedResultData.companies || [])" 
            :key="company" 
            type="success" 
            class="company-tag"
          >
            {{ company }}
          </el-tag>
          <span v-if="!parsedResultData.companies || parsedResultData.companies.length === 0" class="no-data">未提取到公司信息</span>
        </div>

        <el-divider v-if="parsedResultData.summary" content-position="left">AI 总结</el-divider>
        <div v-if="parsedResultData.summary" class="ai-summary">
          <p>{{ parsedResultData.summary }}</p>
        </div>
      </div>
      <div v-else class="no-data">暂无解析结果</div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePositionStore } from '../stores/position'
import { Document, View, Delete, Warning, DocumentChecked, User, Message, Phone } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '../utils/api'

const store = usePositionStore()
const previewVisible = ref(false)
const parsedVisible = ref(false)
const previewFile = ref(null)
const currentParsedResume = ref(null)
const parsingIds = ref([])
const parsedResultData = ref(null)

const resumes = computed(() => {
  return store.getPositionResumes(store.currentPositionId)
})

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr) => {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const isPDF = (file) => {
  return file.type === 'application/pdf' || file.name.endsWith('.pdf')
}

const previewResume = (resume) => {
  previewFile.value = resume
  previewVisible.value = true
}

const viewParsedResult = (resume) => {
  currentParsedResume.value = resume
  if (resume.parsed_data) {
    try {
      parsedResultData.value = JSON.parse(resume.parsed_data)
    } catch (e) {
      console.error('解析parsed_data失败:', e)
      parsedResultData.value = null
    }
  } else {
    parsedResultData.value = null
  }
  parsedVisible.value = true
}

const parseResume = async (resume) => {
  try {
    parsingIds.value.push(resume.id)
    
    await api.post(`/resumes/${resume.id}/parse`)
    ElMessage.success('解析成功')
    store.fetchResumes(store.currentPositionId)
    
    setTimeout(() => {
      const updatedResume = store.getPositionResumes(store.currentPositionId).find(r => r.id === resume.id)
      if (updatedResume) {
        currentParsedResume.value = updatedResume
        if (updatedResume.parsed_data) {
          try {
            parsedResultData.value = JSON.parse(updatedResume.parsed_data)
          } catch (e) {
            parsedResultData.value = null
          }
        }
      }
    }, 500)
  } catch (error) {
    ElMessage.error(error.message || '解析失败')
  } finally {
    parsingIds.value = parsingIds.value.filter(id => id !== resume.id)
  }
}

const deleteResume = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这份简历吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const success = await store.deleteResume(id)
    if (success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.resume-preview {
  background: #fff;
  border-radius: 4px;
}

.preview-header {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.preview-header h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.count {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.empty-tip {
  padding: 40px 0;
}

.resume-list {
  padding: 10px 0;
}

.resume-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #ebeef5;
}

.resume-item:last-child {
  border-bottom: none;
}

.resume-item:hover {
  background-color: #f5f7fa;
}

.resume-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.file-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 10px;
}

.resume-detail {
  display: flex;
  flex-direction: column;
}

.resume-name {
  font-size: 14px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-tag {
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-size {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.resume-actions {
  display: flex;
  gap: 5px;
}

.preview-content {
  height: 70vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.word-tip {
  text-align: center;
  color: #909399;
}

.word-tip p {
  margin: 10px 0;
}

.file-info {
  font-size: 12px;
  color: #c0c4cc;
}

.parsed-result {
  max-height: 70vh;
  overflow-y: auto;
}

.result-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: #f0f9eb;
  border-radius: 8px;
  border: 1px solid #e1f3d8;
}

.card-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #67c23a;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-label {
  font-size: 12px;
  color: #909399;
}

.card-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.skill-tag {
  margin: 0;
}

.companies-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.company-tag {
  margin: 0;
}

.section-content {
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 20px;
}

.section-content p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
  color: #303133;
}

.ai-summary {
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: #fff;
}

.ai-summary p {
  margin: 0;
  line-height: 1.8;
  white-space: pre-wrap;
}

.no-data {
  color: #909399;
  font-size: 14px;
  font-style: italic;
}
</style>
