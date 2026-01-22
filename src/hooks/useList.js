import { ref } from 'vue'
import { useMessage } from './useMessage'

export function useListOperations(refreshFn) {
  const loading = ref(false)
  const { success, error } = useMessage()

  const refresh = async () => {
    if (refreshFn) {
      await refreshFn()
    }
  }

  const remove = async (id, removeApi) => {
    loading.value = true
    try {
      await removeApi(id)
      success('删除成功')
      await refresh()
      return true
    } catch (e) {
      error(e.message || '删除失败')
      return false
    } finally {
      loading.value = false
    }
  }

  const update = async (id, data, updateApi) => {
    loading.value = true
    try {
      await updateApi(id, data)
      success('更新成功')
      await refresh()
      return true
    } catch (e) {
      error(e.message || '更新失败')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    refresh,
    remove,
    update
  }
}

export function useSelection() {
  const selectedItems = ref([])
  const isSelected = (item) => selectedItems.value.some(s => s.id === item.id)

  const select = (item) => {
    if (!isSelected(item)) {
      selectedItems.value.push(item)
    }
  }

  const deselect = (item) => {
    const index = selectedItems.value.findIndex(s => s.id === item.id)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    }
  }

  const toggle = (item) => {
    if (isSelected(item)) {
      deselect(item)
    } else {
      select(item)
    }
  }

  const selectAll = (items) => {
    selectedItems.value = [...items]
  }

  const clearAll = () => {
    selectedItems.value = []
  }

  const getSelectedIds = () => {
    return selectedItems.value.map(item => item.id)
  }

  return {
    selectedItems,
    isSelected,
    select,
    deselect,
    toggle,
    selectAll,
    clearAll,
    getSelectedIds
  }
}
