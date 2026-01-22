import { ref } from 'vue'
import { api } from '../utils/api'
import { useMessage } from './useMessage'

export function useUpload() {
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const { success, error } = useMessage()

  const upload = async (url, file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)

    uploading.value = true
    uploadProgress.value = 0

    try {
      const result = await api.upload(url, formData)
      success('上传成功')
      return result
    } catch (e) {
      error(e.message || '上传失败')
      return null
    } finally {
      uploading.value = false
      uploadProgress.value = 100
    }
  }

  const uploadWithData = async (url, data, fileField = 'file') => {
    const formData = new FormData()
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value)
      }
    })

    uploading.value = true
    uploadProgress.value = 0

    try {
      const result = await api.upload(url, formData)
      success('上传成功')
      return result
    } catch (e) {
      error(e.message || '上传失败')
      return null
    } finally {
      uploading.value = false
      uploadProgress.value = 100
    }
  }

  return {
    uploading,
    uploadProgress,
    upload,
    uploadWithData
  }
}

export function useFileValidator() {
  const validateFile = (file, options = {}) => {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedExtensions = ['.pdf', '.doc', '.docx']
    } = options

    if (!file) {
      return { valid: false, message: '请选择文件' }
    }

    if (file.size > maxSize) {
      return { valid: false, message: `文件大小不能超过 ${maxSize / 1024 / 1024}MB` }
    }

    if (!allowedTypes.includes(file.type)) {
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        return { valid: false, message: '只能上传 PDF、Word 格式的文件' }
      }
    }

    return { valid: true }
  }

  return { validateFile }
}
