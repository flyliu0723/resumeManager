import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_BASE = 'http://localhost:3000/api'

export const usePositionStore = defineStore('position', () => {
  const positions = ref([])
  const currentPositionId = ref(null)
  const resumes = ref({})

  async function fetchPositions() {
    try {
      const res = await fetch(`${API_BASE}/positions`)
      const data = await res.json()
      if (data.success) {
        positions.value = data.data
        if (positions.value.length > 0 && !currentPositionId.value) {
          currentPositionId.value = positions.value[0].id
          fetchResumes(currentPositionId.value)
        }
      }
    } catch (error) {
      console.error('获取职位列表失败:', error)
    }
  }

  async function addPosition(position) {
    try {
      const res = await fetch(`${API_BASE}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position)
      })
      const data = await res.json()
      
      if (data.success && data.data) {
        positions.value.unshift(data.data)
        currentPositionId.value = data.data.id
        resumes.value[data.data.id] = []
        return data.data.id
      }
      return null
    } catch (error) {
      console.error('添加职位失败:', error)
      return null
    }
  }

  async function updatePosition(id, position) {
    try {
      const res = await fetch(`${API_BASE}/positions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position)
      })
      const data = await res.json()
      if (data.success) {
        const index = positions.value.findIndex(p => p.id === id)
        if (index > -1) {
          positions.value[index] = data.data
        }
        return true
      }
      return false
    } catch (error) {
      console.error('更新职位失败:', error)
      return false
    }
  }

  function setCurrentPosition(id) {
    currentPositionId.value = id
    fetchResumes(id)
  }

  async function fetchResumes(positionId) {
    try {
      const res = await fetch(`${API_BASE}/positions/${positionId}/resumes`)
      const data = await res.json()
      if (data.success) {
        resumes.value[positionId] = data.data
      }
    } catch (error) {
      console.error('获取简历列表失败:', error)
    }
  }

  async function addResume(positionId, resume) {
    try {
      const timestamp = Date.now()
      const ext = resume.name.split('.').pop()
      const safeFileName = `${timestamp}_resume.${ext}`

      const formData = new FormData()
      formData.append('name', safeFileName)
      formData.append('filename', safeFileName)
      formData.append('size', String(resume.size))
      formData.append('type', resume.type)
      formData.append('file', resume.raw)

      const res = await fetch(`${API_BASE}/positions/${positionId}/resumes`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.success) {
        if (!resumes.value[positionId]) {
          resumes.value[positionId] = []
        }
        resumes.value[positionId].push(data.data)
        return true
      }
      return false
    } catch (error) {
      console.error('上传简历失败:', error)
      return false
    }
  }

  async function deleteResume(resumeId) {
    try {
      const res = await fetch(`${API_BASE}/resumes/${resumeId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      
      if (data.success) {
        for (const posId in resumes.value) {
          const index = resumes.value[posId].findIndex(r => r.id === resumeId)
          if (index > -1) {
            resumes.value[posId].splice(index, 1)
            break
          }
        }
        // 刷新当前职位的简历列表，确保数据一致
        if (currentPositionId.value) {
          await fetchResumes(currentPositionId.value)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('删除简历失败:', error)
      return false
    }
  }

  function getCurrentPosition() {
    return positions.value.find(p => p.id === currentPositionId.value)
  }

  function getPositionResumes(positionId) {
    return resumes.value[positionId] || []
  }

  return {
    positions,
    currentPositionId,
    resumes,
    fetchPositions,
    addPosition,
    updatePosition,
    setCurrentPosition,
    addResume,
    deleteResume,
    getCurrentPosition,
    getPositionResumes
  }
})
