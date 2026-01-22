import { ref, reactive } from 'vue'
import { useMessage } from './useMessage'

export function useForm(initialData = {}) {
  const form = reactive({ ...initialData })
  const loading = ref(false)
  const errors = ref({})
  const { success, error: showError } = useMessage()

  const resetForm = (customData = {}) => {
    Object.keys(form).forEach(key => {
      form[key] = null
    })
    Object.assign(form, { ...initialData, ...customData })
    errors.value = {}
  }

  const setErrors = (newErrors) => {
    errors.value = newErrors
  }

  const clearErrors = () => {
    errors.value = {}
  }

  const validate = (rules) => {
    clearErrors()
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = form[field]
      if (rule.required && !value) {
        errors.value[field] = rule.message || `${field}不能为空`
        continue
      }
      if (rule.minLength && value && value.length < rule.minLength) {
        errors.value[field] = rule.message || `${field}长度不能小于${rule.minLength}`
        continue
      }
      if (rule.pattern && value && !rule.pattern.test(value)) {
        errors.value[field] = rule.message || `${field}格式不正确`
      }
    }

    return Object.keys(errors.value).length === 0
  }

  return {
    form,
    loading,
    errors,
    resetForm,
    setErrors,
    clearErrors,
    validate
  }
}

export function useSubmit(submitFn) {
  const loading = ref(false)
  const { success, error } = useMessage()

  const submit = async (data, successMessage = '操作成功') => {
    loading.value = true
    try {
      await submitFn(data)
      success(successMessage)
      return true
    } catch (e) {
      error(e.message || '操作失败')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    submit
  }
}
