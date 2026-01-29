import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../utils/api'

export const useInterviewsStore = defineStore('interviews', () => {
  const events = ref([])
  const loading = ref(false)
  const selectedEvent = ref(null)
  const filters = ref({
    eventType: null,
    candidateId: null,
    positionId: null,
    startTime: null,
    endTime: null,
    searchQuery: '',
    statusFilter: 'all'
  })
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0
  })

  async function fetchEvents() {
    try {
      loading.value = true
      const params = {
        limit: pagination.value.pageSize
      }

      if (filters.value.eventType) {
        params.eventType = filters.value.eventType
      }
      if (filters.value.candidateId) {
        params.candidateId = filters.value.candidateId
      }
      if (filters.value.positionId) {
        params.positionId = filters.value.positionId
      }
      if (filters.value.startTime) {
        params.startTime = filters.value.startTime
      }
      if (filters.value.endTime) {
        params.endTime = filters.value.endTime
      }
      if (filters.value.statusFilter && filters.value.statusFilter !== 'all') {
        params.statusFilter = filters.value.statusFilter
      }
      if (filters.value.searchQuery) {
        params.searchQuery = filters.value.searchQuery
      }

      console.log('获取面试事件列表，参数:', params)
      const response = await api.get('/interviews', params)
      events.value = response.list || []
      pagination.value.total = response.total || 0
      console.log('获取到事件数量:', events.value.length)
    } catch (error) {
      console.error('获取面试事件列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchEventDetail(id) {
    try {
      const event = await api.get(`/interviews/${id}`)
      selectedEvent.value = event
      return event
    } catch (error) {
      console.error('获取事件详情失败:', error)
      return null
    }
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1
  }

  function resetFilters() {
    filters.value = {
      eventType: null,
      candidateId: null,
      positionId: null,
      startTime: null,
      endTime: null,
      searchQuery: '',
      statusFilter: 'all'
    }
    pagination.value.page = 1
  }

  function selectEvent(event) {
    selectedEvent.value = event
  }

  function clearSelection() {
    selectedEvent.value = null
  }

  function setPage(page) {
    pagination.value.page = page
  }

  return {
    events,
    loading,
    selectedEvent,
    filters,
    pagination,
    fetchEvents,
    fetchEventDetail,
    setFilters,
    resetFilters,
    selectEvent,
    clearSelection,
    setPage
  }
})
