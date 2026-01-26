import { ElMessage, ElMessageBox } from 'element-plus'

export function useMessage() {
  const success = (message) => ElMessage.success(message)
  const warning = (message) => ElMessage.warning(message)
  const error = (message) => ElMessage.error(message)
  const info = (message) => ElMessage.info(message)
  
  const showMessage = (type, message) => {
    switch(type) {
      case 'success':
        ElMessage.success(message)
        break
      case 'warning':
        ElMessage.warning(message)
        break
      case 'error':
        ElMessage.error(message)
        break
      case 'info':
        ElMessage.info(message)
        break
      default:
        ElMessage(message)
    }
  }

  return {
    success,
    warning,
    error,
    info,
    showMessage
  }
}

export function useConfirm() {
  const confirm = (message, title = '确认', options = {}) => {
    return ElMessageBox.confirm(message, title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      ...options
    })
  }

  return { confirm }
}
