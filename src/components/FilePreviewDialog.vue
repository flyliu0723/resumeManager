<template>
  <el-dialog
    v-model="visible"
    :title="`预览 - ${fileName}`"
    width="80%"
    :fullscreen="isMobile"
    destroy-on-close
  >
    <div class="file-preview-container">
      <!-- PDF预览 -->
      <div v-if="fileFormat === 'PDF'" class="pdf-preview">
        <div class="preview-toolbar">
          <el-button @click="downloadFile">
            <el-icon><Download /></el-icon>
            下载PDF
          </el-button>
          <el-button @click="useIframePreview = !useIframePreview">
            <el-icon><Refresh /></el-icon>
            {{ useIframePreview ? '使用高级预览' : '使用浏览器预览' }}
          </el-button>
        </div>
        
        <!-- iframe预览（备用方案） -->
        <div v-if="useIframePreview || error" class="iframe-preview">
          <iframe 
            :src="fileUrl" 
            style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 8px;"
            frameborder="0"
          ></iframe>
        </div>
        
        <!-- PDF.js预览（主要方案） -->
        <div v-else class="pdf-js-preview">
          <div class="pdf-toolbar" v-if="!loading && !error">
            <el-button-group>
              <el-button @click="previousPage" :disabled="currentPage <= 1">
                <el-icon><ArrowLeft /></el-icon>
                上一页
              </el-button>
              <el-button @click="nextPage" :disabled="currentPage >= totalPages">
                下一页
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </el-button-group>
            <span class="page-info">
              第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
            </span>
            <el-button @click="zoomIn" :disabled="scale >= 2">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
            <el-button @click="zoomOut" :disabled="scale <= 0.5">
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button @click="resetZoom">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <div class="pdf-viewer" ref="pdfViewer">
            <div v-if="loading" class="loading-container">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在加载PDF...</span>
            </div>
            <canvas 
              v-else-if="!error"
              ref="pdfCanvas" 
              :style="{ transform: `scale(${scale})` }"
              class="pdf-canvas"
            ></canvas>
            <div v-if="error" class="error-message">
              <p>PDF.js加载失败，请使用浏览器预览</p>
              <el-button type="primary" @click="useIframePreview = true" size="small">
                切换到浏览器预览
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Word文档预览 -->
      <div v-else-if="fileFormat === 'DOCX' || fileFormat === 'DOC'" class="word-preview">
        <div class="preview-toolbar">
          <el-button @click="downloadFile">
            <el-icon><Download /></el-icon>
            下载原文档
          </el-button>
          <el-button @click="copyText" :disabled="!textContent">
            <el-icon><CopyDocument /></el-icon>
            复制文本
          </el-button>
        </div>
        <div class="word-content">
          <div v-if="loading" class="loading-container">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在加载文档内容...</span>
          </div>
          <div v-else-if="textContent" class="text-content">
            <pre>{{ textContent }}</pre>
          </div>
          <div v-else class="no-content">
            <el-empty description="无法预览此文档" :image-size="100">
              <el-button type="primary" @click="downloadFile">下载文档</el-button>
            </el-empty>
          </div>
        </div>
      </div>

      <!-- 不支持的格式 -->
      <div v-else class="unsupported-preview">
        <el-empty description="不支持预览此文件格式" :image-size="120">
          <template #description>
            <p>文件格式: {{ fileFormat }}</p>
            <p>请下载文件后使用相应软件打开</p>
          </template>
          <el-button type="primary" @click="downloadFile">
            <el-icon><Download /></el-icon>
            下载文件
          </el-button>
        </el-empty>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="downloadFile">
        <el-icon><Download /></el-icon>
        下载文件
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useMessage } from '../hooks/useMessage'
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Refresh, Download, CopyDocument, Loading } from '@element-plus/icons-vue'

// 动态导入pdfjs-dist以避免SSR问题
let pdfjsLib = null
const loadPDFLib = async () => {
  if (!pdfjsLib) {
    try {
      // 尝试不同的加载方式
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib
      } else {
        pdfjsLib = await import('pdfjs-dist')
        // 使用jsdelivr CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
      }
      console.log('PDF.js loaded, version:', pdfjsLib.version)
      return pdfjsLib
    } catch (error) {
      console.error('Failed to load PDF.js:', error)
      throw error
    }
  }
  return pdfjsLib
}

const props = defineProps({
  modelValue: Boolean,
  file: Object
})

const emit = defineEmits(['update:modelValue'])

const { showMessage } = useMessage()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const fileName = computed(() => props.file?.name || '未知文件')
const fileFormat = computed(() => props.file?.file_format || 'OTHER')
const filePath = computed(() => props.file?.file_path || '')
const fileUrl = computed(() => props.file?.id ? `/api/resumes/${props.file.id}/preview` : '')

// PDF预览相关
const pdfViewer = ref(null)
const pdfCanvas = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const pdfDocument = ref(null)

const error = ref('')
const useIframePreview = ref(false)

// Word预览相关
const textContent = ref('')
const loading = ref(false)

const isMobile = computed(() => window.innerWidth <= 768)

watch(visible, async (val) => {
  if (val && props.file) {
    console.log('FilePreviewDialog visible:', {
      fileFormat: fileFormat.value,
      fileId: props.file.id,
      fileName: fileName.value
    })
    
    await nextTick()
    
    if (fileFormat.value === 'PDF' && !useIframePreview.value) {
      await loadPDFPreview()
    } else if (fileFormat.value === 'DOCX' || fileFormat.value === 'DOC') {
      await loadWordContent()
    }
  }
})

// PDF预览功能
async function loadPDFPreview() {
  try {
    console.log('开始加载PDF预览...', {
      fileId: props.file?.id,
      fileName: fileName.value,
      fileFormat: fileFormat.value,
      filePath: filePath.value
    })
    
    if (!props.file?.id) {
      throw new Error('文件ID不存在')
    }

    loading.value = true
    error.value = ''
    
    // 动态加载PDF.js
    const pdfLib = await loadPDFLib()
    console.log('PDF.js library loaded')
    
    // 使用预览API获取文件URL
    const fileUrl = `/api/resumes/${props.file.id}/preview`
    console.log('File URL:', fileUrl)
    
    // 加载PDF文档
    const loadingTask = pdfLib.getDocument(fileUrl)
    console.log('Loading PDF document...')
    
    pdfDocument.value = await loadingTask.promise
    console.log('PDF document loaded, pages:', pdfDocument.value.numPages)
    
    totalPages.value = pdfDocument.value.numPages
    currentPage.value = 1
    
    // 渲染第一页
    await renderPDFPage(currentPage.value)
    console.log('PDF preview loaded successfully')
  } catch (err) {
    console.error('加载PDF失败:', err)
    error.value = err.message || '加载PDF失败'
    showMessage('error', '加载PDF失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

async function renderPDFPage(pageNum) {
  try {
    console.log(`渲染PDF页面: ${pageNum}`)
    
    if (!pdfDocument.value || !pdfCanvas.value) {
      throw new Error('PDF文档或Canvas未初始化')
    }

    const page = await pdfDocument.value.getPage(pageNum)
    console.log(`页面 ${pageNum} 加载完成`)
    
    const viewport = page.getViewport({ scale: scale.value })
    console.log(`视口尺寸: ${viewport.width} x ${viewport.height}`)
    
    const canvas = pdfCanvas.value
    const context = canvas.getContext('2d')
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    console.log(`Canvas尺寸设置为: ${canvas.width} x ${canvas.height}`)
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    console.log('开始渲染页面...')
    await page.render(renderContext).promise
    console.log(`页面 ${pageNum} 渲染完成`)
  } catch (err) {
    console.error('渲染PDF页面失败:', err)
    error.value = `渲染页面失败: ${err.message}`
    showMessage('error', '渲染页面失败')
  }
}

async function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    await renderPDFPage(currentPage.value)
  }
}

async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    await renderPDFPage(currentPage.value)
  }
}

async function zoomIn() {
  if (scale.value < 2) {
    scale.value += 0.25
    await renderPDFPage(currentPage.value)
  }
}

async function zoomOut() {
  if (scale.value > 0.5) {
    scale.value -= 0.25
    await renderPDFPage(currentPage.value)
  }
}

async function resetZoom() {
  scale.value = 1.0
  await renderPDFPage(currentPage.value)
}

// Word文档预览功能
async function loadWordContent() {
  try {
    console.log('开始加载Word内容...', {
      fileId: props.file?.id,
      fileName: fileName.value,
      fileFormat: fileFormat.value,
      hasContent: !!props.file?.content
    })
    
    if (props.file?.content) {
      console.log('使用预提取的内容，长度:', props.file.content.length)
      textContent.value = props.file.content
    } else {
      console.log('从API获取内容...')
      await fetchWordContent()
    }
  } catch (error) {
    console.error('加载Word内容失败:', error)
    showMessage('error', '加载文档内容失败')
  }
}

async function fetchWordContent() {
  try {
    loading.value = true
    const response = await fetch(`/api/resumes/${props.file.id}/content`)
    console.log('API响应状态:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('API响应数据:', data)
      
      if (data.success) {
        textContent.value = data.data.content || ''
        console.log('内容获取成功，长度:', textContent.value.length)
      } else {
        throw new Error(data.message || '获取内容失败')
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('获取Word内容失败:', error)
    showMessage('error', '获取内容失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 通用功能
function getFileUrl() {
  if (!filePath.value) return ''
  // 如果是相对路径，转换为绝对URL
  if (filePath.value.startsWith('/')) {
    return window.location.origin + filePath.value
  }
  return filePath.value
}

function downloadFile() {
  if (!props.file?.id) {
    showMessage('error', '文件ID不存在')
    return
  }
  
  const link = document.createElement('a')
  link.href = `/api/resumes/${props.file.id}/download`
  link.download = fileName.value
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function copyText() {
  try {
    if (!textContent.value) {
      showMessage('warning', '没有可复制的文本内容')
      return
    }
    
    await navigator.clipboard.writeText(textContent.value)
    showMessage('success', '文本已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    showMessage('error', '复制失败')
  }
}
</script>

<style scoped>
.file-preview-container {
  height: 70vh;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;
}

.page-info {
  font-size: 14px;
  color: #606266;
  margin-left: auto;
}

/* PDF预览样式 */
.pdf-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 0;
}

.pdf-js-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.iframe-preview {
  flex: 1;
  padding: 16px;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
  color: #909399;
  text-align: center;
}

.pdf-viewer {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f0f0f0;
  padding: 20px;
}

.pdf-viewer canvas {
  max-width: 100%;
  height: auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.pdf-canvas {
  max-width: 100%;
  height: auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 32px;
}

.error-container ul {
  text-align: left;
  margin: 10px 0;
  padding-left: 20px;
}

.error-container li {
  margin: 5px 0;
  font-size: 14px;
}

/* Word预览样式 */
.word-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.word-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #f8f9fa;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 32px;
}

.text-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

.text-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Microsoft YaHei', 'SimSun', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  margin: 0;
}

.no-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 不支持格式样式 */
.unsupported-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-preview-container {
    height: 80vh;
  }
  
  .preview-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .page-info {
    margin-left: 0;
    width: 100%;
    text-align: center;
  }
  
  .text-content {
    padding: 16px;
  }
  
  .text-content pre {
    font-size: 13px;
  }
}
</style>