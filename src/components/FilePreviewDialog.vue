<template>
  <el-dialog
    v-model="visible"
    :title="`预览 - ${fileName}`"
    width="85%"
    destroy-on-close
    class="file-preview-dialog"
  >
    <div class="file-preview-container">
      <!-- 工具栏 -->
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <el-tag :type="getFileTypeTag" size="large">{{ fileFormat }}</el-tag>
          <span class="file-name" :title="fileName">{{ fileName }}</span>
        </div>
        <div class="toolbar-right">
          <el-button-group>
            <el-button type="primary" @click="downloadFile">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <p>正在加载文件...</p>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="error" class="error-state">
        <el-result
          icon="error"
          title="文件加载失败"
          :sub-title="error"
        >
          <template #extra>
            <el-button type="primary" @click="downloadFile">
              <el-icon><Download /></el-icon>
              下载文件查看
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- PDF 预览 -->
      <div v-else-if="fileFormat === 'PDF'" class="preview-area">
        <vue-office-pdf
          v-if="docContent"
          :src="docContent"
          class="file-body"
          @rendered="handleRendered"
          @error="handleError"
        />
      </div>

      <!-- Word 预览 -->
      <div v-else-if="fileFormat === 'DOCX' || fileFormat === 'DOC'" class="preview-area">
        <vue-office-docx
          v-if="docContent"
          :src="docContent"
          class="file-body"
          :options="docOptions"
          @rendered="handleRendered"
          @error="handleError"
        />
      </div>

      <!-- Excel 预览 -->
      <div v-else-if="fileFormat === 'XLSX' || fileFormat === 'XLS'" class="preview-area">
        <vue-office-excel
          v-if="docContent"
          :src="docContent"
          class="file-body"
          @rendered="handleRendered"
          @error="handleError"
        />
      </div>

      <!-- 文本预览 -->
      <div v-else-if="fileFormat === 'TXT' || fileFormat === 'TEXT'" class="preview-area">
        <div v-if="textLoading" class="loading-state">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>正在加载文本内容...</p>
        </div>
        <div v-else-if="textContent" class="text-preview">
          <pre>{{ textContent }}</pre>
        </div>
        <div v-else class="error-state">
          <el-empty description="无法加载文本内容" />
        </div>
      </div>

      <!-- 图片预览 -->
      <div v-else-if="isImage" class="preview-area image-preview-area">
        <el-image
          :src="fileUrl"
          :preview-src-list="[fileUrl]"
          fit="contain"
          class="preview-image"
        />
      </div>

      <!-- 不支持的格式 -->
      <div v-else class="preview-area unsupported-area">
        <el-result
          icon="warning"
          title="暂不支持在线预览"
          :sub-title="`文件格式: ${fileFormat}`"
        >
          <template #extra>
            <el-button type="primary" @click="downloadFile">
              <el-icon><Download /></el-icon>
              下载文件查看
            </el-button>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="downloadFile">
        <el-icon><Download /></el-icon>
        下载
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMessage } from '../hooks/useMessage'
import { Download, Loading } from '@element-plus/icons-vue'

// 引入 vue-office 组件
import VueOfficePdf from '@vue-office/pdf'
import VueOfficeDocx from '@vue-office/docx'
import VueOfficeExcel from '@vue-office/excel'

// 引入 vue-office 样式 (PDF 组件不需要单独引入样式)
import '@vue-office/docx/lib/index.css'
import '@vue-office/excel/lib/index.css'

const props = defineProps({
  modelValue: Boolean,
  file: Object
})

const emit = defineEmits(['update:modelValue'])

const { showMessage } = useMessage()

const loading = ref(false)
const textLoading = ref(false)
const textContent = ref('')
const docContent = ref('')
const error = ref(null)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 文件基本信息
const fileName = computed(() => props.file?.file_name || props.file?.name || '未知文件')
const fileFormat = computed(() => (props.file?.file_format || props.file?.fileFormat || 'OTHER').toUpperCase())
// 注意：使用 resume_id 而不是 id，因为 file 对象来自 position_resumes 表
const fileId = computed(() => props.file?.resume_id || props.file?.id)

// 文件URL - 用于图片预览
const fileUrl = computed(() => {
  if (!fileId.value) return ''
  return `/api/resumes/${fileId.value}/preview`
})

// 是否图片格式
const isImage = computed(() => {
  const imageFormats = ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'WEBP', 'SVG']
  return imageFormats.includes(fileFormat.value)
})

// 文件类型标签
const getFileTypeTag = computed(() => {
  const typeMap = {
    'PDF': 'danger',
    'DOCX': 'primary',
    'DOC': 'primary',
    'XLSX': 'success',
    'XLS': 'success',
    'TXT': 'info',
    'JPG': 'warning',
    'JPEG': 'warning',
    'PNG': 'warning'
  }
  return typeMap[fileFormat.value] || 'info'
})

// Word 预览选项
const docOptions = {
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
  ignoreFonts: false,
  breakPages: true,
  ignoreLastRenderedPageBreak: false,
  experimental: false,
  trimXmlDeclaration: true,
  useBase64URL: true,
  useMathMLPolyfill: false,
  showChanges: false,
  debug: false
}

// 下载文件
async function downloadFile() {
  if (!fileId.value) {
    showMessage('error', '文件ID不存在')
    return
  }

  const downloadUrl = `/api/resumes/${fileId.value}/download`
  console.log('========== 下载文件 ==========')
  console.log('文件ID:', fileId.value)
  console.log('文件名:', fileName.value)
  console.log('文件格式:', fileFormat.value)
  console.log('下载URL:', downloadUrl)
  console.log('完整URL:', window.location.origin + downloadUrl)
  console.log('==============================')

  try {
    // 先尝试获取文件信息
    console.log('正在请求文件...')
    const response = await fetch(downloadUrl)
    console.log('响应状态:', response.status, response.statusText)
    console.log('响应头:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length'),
      'content-disposition': response.headers.get('content-disposition')
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    console.log('文件大小:', blob.size, 'bytes')
    console.log('文件类型:', blob.type)

    if (blob.size === 0) {
      throw new Error('下载的文件大小为0，可能是文件不存在或路径错误')
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showMessage('success', '文件下载成功')
  } catch (err) {
    console.error('下载文件失败:', err)
    showMessage('error', '下载失败: ' + err.message)

    // 降级方案：直接使用 a 标签下载
    console.log('尝试降级下载方案...')
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName.value
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 加载文件数据 - 使用 Blob URL
async function loadFileData() {
  if (!fileId.value) return

  // 图片和文本不需要 Blob URL
  if (isImage.value || fileFormat.value === 'TXT' || fileFormat.value === 'TEXT') {
    return
  }

  try {
    loading.value = true
    error.value = null
    docContent.value = ''

    const previewUrl = `/api/resumes/${fileId.value}/preview`
    console.log('========== 预览加载文件 ==========')
    console.log('文件ID:', fileId.value)
    console.log('文件名:', fileName.value)
    console.log('文件格式:', fileFormat.value)
    console.log('预览URL:', previewUrl)
    console.log('完整URL:', window.location.origin + previewUrl)
    console.log('==============================')

    const response = await fetch(previewUrl)
    console.log('响应状态:', response.status, response.statusText)
    console.log('响应头:', {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length')
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // 获取 ArrayBuffer
    const arrayBuffer = await response.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {
      throw new Error('文件内容为空')
    }

    console.log('文件数据加载成功:', {
      size: arrayBuffer.byteLength + ' bytes',
      format: fileFormat.value
    })

    // 创建 Blob 和 Blob URL
    let mimeType = 'application/octet-stream'
    if (fileFormat.value === 'PDF') {
      mimeType = 'application/pdf'
    } else if (fileFormat.value === 'DOCX') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (fileFormat.value === 'DOC') {
      mimeType = 'application/msword'
    } else if (fileFormat.value === 'XLSX') {
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (fileFormat.value === 'XLS') {
      mimeType = 'application/vnd.ms-excel'
    }

    const blob = new Blob([arrayBuffer], { type: mimeType })
    const blobUrl = URL.createObjectURL(blob)

    docContent.value = blobUrl
    console.log('Blob 创建成功:', {
      mimeType: mimeType,
      blobSize: blob.size + ' bytes',
      blobUrl: blobUrl
    })
    console.log('==============================')
  } catch (err) {
    console.error('加载文件数据失败:', err)
    console.log('==============================')
    error.value = err.message || '加载文件失败'
    showMessage('error', '加载文件失败: ' + error.value)
  } finally {
    loading.value = false
  }
}

// 加载文本内容
async function loadTextContent() {
  if (!fileId.value) return

  try {
    textLoading.value = true
    const response = await fetch(`/api/resumes/${fileId.value}/extract-text`)

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        textContent.value = data.data.content || ''
      }
    }
  } catch (err) {
    console.error('加载文本失败:', err)
  } finally {
    textLoading.value = false
  }
}

// 处理渲染完成
function handleRendered() {
  console.log('文件预览渲染完成')
}

// 处理错误
function handleError(err) {
  console.error('文件预览错误:', err)
  error.value = err?.message || '文件预览失败'
  showMessage('error', '文件预览失败: ' + error.value)
}

// 清理 Blob URL
function cleanupBlobUrl() {
  if (docContent.value && docContent.value.startsWith('blob:')) {
    URL.revokeObjectURL(docContent.value)
    console.log('Blob URL 已清理')
  }
}

// 监听对话框显示
watch(visible, (val) => {
  if (val && props.file) {
    console.log('========== FilePreviewDialog 打开 ==========')
    console.log('完整的 file 对象:', props.file)
    console.log('提取的信息:')
    console.log('  - fileName:', fileName.value)
    console.log('  - fileFormat:', fileFormat.value)
    console.log('  - position_resume id (职位候选人ID):', props.file?.id)
    console.log('  - resume_id (简历ID，用于API请求):', props.file?.resume_id)
    console.log('  - 实际使用的 fileId:', fileId.value)
    console.log('  - fileUrl:', fileUrl.value)
    console.log('============================================')

    // 重置状态
    error.value = null
    docContent.value = ''
    textContent.value = ''

    // 加载文件数据
    loadFileData()

    // 如果是文本文件，加载内容
    if (fileFormat.value === 'TXT' || fileFormat.value === 'TEXT') {
      loadTextContent()
    }
  } else if (!val) {
    // 对话框关闭时清理 Blob URL
    cleanupBlobUrl()
  }
})
</script>

<style scoped>
.file-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.file-preview-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  background: #f5f7fa;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-name {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.preview-area {
  flex: 1;
  overflow: auto;
  position: relative;
  padding: 20px;
}

/* vue-office 预览样式 */
.file-body {
  width: 100%;
  height: 100%;
  background: #fff;
}

/* PDF 预览特定样式 */
:deep(.vue-office-pdf) {
  height: 100%;
}

:deep(.vue-office-pdf .pdf-preview) {
  background: #525659;
}

/* Word 预览特定样式 */
:deep(.vue-office-docx) {
  height: 100%;
  overflow: auto;
}

/* Excel 预览特定样式 */
:deep(.vue-office-excel) {
  height: 100%;
}

:deep(.vue-office-excel .excel-preview) {
  background: #fff;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #909399;
}

.loading-state .el-icon {
  font-size: 40px;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.text-preview {
  height: 100%;
  overflow: auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.text-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
}

.image-preview-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #1a1a1a;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
}

.unsupported-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-preview-container {
    height: 80vh;
  }

  .preview-toolbar {
    flex-direction: column;
    gap: 10px;
    padding: 10px 16px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .file-name {
    max-width: 200px;
  }

  .preview-area {
    padding: 10px;
  }
}
</style>
