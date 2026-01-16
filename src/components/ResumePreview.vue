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
            </span>
            <span class="resume-size">{{ formatSize(resume.size) }}</span>
          </div>
        </div>
        <div class="resume-actions">
          <el-button type="primary" link @click="previewResume(resume)">
            <el-icon><view /></el-icon>
            预览
          </el-button>
          <el-button type="success" link @click="viewContent(resume)">
            <el-icon><document-copy /></el-icon>
            内容
          </el-button>
          <el-button type="warning" link :loading="parsingIds.includes(resume.id)" @click="parseResume(resume)">
            <el-icon><document /></el-icon>
            解析
          </el-button>
          <el-button type="success" link @click="downloadResume(resume)">
            <el-icon><download /></el-icon>
            下载
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
      v-model="contentVisible"
      :title="`简历内容 - ${currentContent?.candidateName || '未知'}`"
      width="70%"
      top="5vh"
    >
      <div class="content-dialog">
        <div class="content-header">
          <el-tag type="success">候选人: {{ currentContent?.candidateName || '未知' }}</el-tag>
        </div>
        <div class="content-body">
          <p>{{ currentContent?.content || '无内容' }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePositionStore } from '../stores/position'
import { Document, View, Delete, Download, Warning, DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = usePositionStore()
const previewVisible = ref(false)
const contentVisible = ref(false)
const previewFile = ref(null)
const currentContent = ref(null)
const parsingIds = ref([])

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

const isPDF = (file) => {
  return file.type === 'application/pdf' || file.name.endsWith('.pdf')
}

const previewResume = (resume) => {
  previewFile.value = resume
  previewVisible.value = true
}

const viewContent = async (resume) => {
  try {
    const res = await fetch(`http://localhost:3000/api/resumes/${resume.id}/content`)
    const data = await res.json()
    if (data.success) {
      currentContent.value = data.data
      contentVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取简历内容失败')
  }
}

const parseResume = async (resume) => {
  try {
    parsingIds.value.push(resume.id)
    const res = await fetch(`http://localhost:3000/api/resumes/${resume.id}/parse`, {
      method: 'POST'
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('解析成功')
      store.fetchResumes(store.currentPositionId)
    } else {
      ElMessage.error(data.message || '解析失败')
    }
  } catch (error) {
    ElMessage.error('解析失败')
  } finally {
    parsingIds.value = parsingIds.value.filter(id => id !== resume.id)
  }
}

const downloadResume = (resume) => {
  window.open(`http://localhost:3000/api/resumes/${resume.id}/download`, '_blank')
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

.content-dialog {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.content-header {
  margin-bottom: 15px;
}

.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
  max-height: 60vh;
}

.content-body p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 14px;
  color: #303133;
}
</style>
