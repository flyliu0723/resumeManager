import { ElMessage, ElMessageBox } from 'element-plus'

export function useMessage() {
  const success = (message) => ElMessage.success(message)
  const warning = (message) => ElMessage.warning(message)
  const error = (message) => ElMessage.error(message)
  const info = (message) => ElMessage.info(message)

  return {
    success,
    warning,
    error,
    info
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
