import { ref } from 'vue'
import { api } from '../utils/api'
import { useMessage } from './useMessage'

export function useFormSearch(fetchFn) {
  const loading = ref(false)
  const results = ref([])
  const { error } = useMessage()

  const search = async (keyword) => {
    if (!keyword) {
      results.value = []
      return []
    }

    loading.value = true
    try {
      const data = await fetchFn(keyword)
      results.value = data || []
      return results.value
    } catch (e) {
      error(e.message || '搜索失败')
      return []
    } finally {
      loading.value = false
    }
  }

  const clear = () => {
    results.value = []
  }

  return {
    loading,
    results,
    search,
    clear
  }
}

export function useAsyncFetch(fetchFn) {
  const loading = ref(false)
  const data = ref(null)
  const error = ref(null)
  const { error: showError } = useMessage()

  const fetch = async (...args) => {
    loading.value = true
    error.value = null
    try {
      data.value = await fetchFn(...args)
      return data.value
    } catch (e) {
      error.value = e
      showError(e.message || '请求失败')
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    data,
    error,
    fetch
  }
}
