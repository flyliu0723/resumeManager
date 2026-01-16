<template>
  <div class="resume-uploader">
    <el-upload
      class="resume-upload"
      drag
      :auto-upload="false"
      :on-change="handleFileChange"
      :accept="'.pdf,.doc,.docx'"
      multiple
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处，或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持 PDF、Word 格式，单个文件不超过10MB
        </div>
      </template>
    </el-upload>
  </div>
</template>

<script setup>
import { usePositionStore } from '../stores/position'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const store = usePositionStore()

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
  })

  ElMessage.success(`${file.name} 上传成功`)
}
</script>

<style scoped>
.resume-uploader {
  margin-top: 20px;
}

.resume-upload {
  width: 100%;
}

.resume-upload .el-upload {
  width: 100%;
}

.resume-upload .el-upload-dragger {
  width: 100%;
}
</style>
