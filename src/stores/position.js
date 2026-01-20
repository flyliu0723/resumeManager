import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_BASE = 'http://localhost:3000/api'

export const usePositionStore = defineStore('position', () => {
  const positions = ref([])
  const activePositions = ref([])
  const archivedPositions = ref([])
  const currentPositionId = ref(null)
  const resumes = ref({})

  async function fetchPositions() {
    try {
      const res = await fetch(`${API_BASE}/positions`)
      const data = await res.json()
      if (data.success) {
        activePositions.value = data.data.active || []
        archivedPositions.value = data.data.archived || []
        positions.value = [...activePositions.value, ...archivedPositions.value]
        
        if (activePositions.value.length > 0 && !currentPositionId.value) {
          currentPositionId.value = activePositions.value[0].id
          fetchResumes(currentPositionId.value)
        }
      }
    } catch (error) {
      console.error('获取职位列表失败:', error)
    }
  }

  async function archivePosition(id, reason) {
    try {
      const res = await fetch(`${API_BASE}/positions/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      const data = await res.json()
      
      if (data.success) {
        const index = activePositions.value.findIndex(p => p.id === Number(id))
        if (index > -1) {
          const [archived] = activePositions.value.splice(index, 1)
          archived.archive_reason = reason
          archived.status = 'archived'
          archivedPositions.value.unshift(archived)
        }
        
        if (currentPositionId.value === Number(id)) {
          currentPositionId.value = activePositions.value.length > 0 ? activePositions.value[0].id : null
        }
        return true
      }
      return false
    } catch (error) {
      console.error('归档职位失败:', error)
      return false
    }
  }

  async function restorePosition(id) {
    try {
      const res = await fetch(`${API_BASE}/positions/${id}/restore`, {
        method: 'POST'
      })
      const data = await res.json()
      
      if (data.success) {
        const index = archivedPositions.value.findIndex(p => p.id === Number(id))
        if (index > -1) {
          const [restored] = archivedPositions.value.splice(index, 1)
          restored.status = 'active'
          restored.archive_reason = null
          restored.archived_at = null
          activePositions.value.unshift(restored)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('恢复职位失败:', error)
      return false
    }
  }

  const positionNotes = ref({})

  async function fetchPositionNotes(positionId) {
    try {
      const res = await fetch(`${API_BASE}/positions/${positionId}/notes`)
      const data = await res.json()
      if (data.success) {
        positionNotes.value[positionId] = data.data || []
      }
    } catch (error) {
      console.error('获取职位补充失败:', error)
    }
  }

  async function addPositionNote(positionId, content) {
    try {
      const res = await fetch(`${API_BASE}/positions/${positionId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      const data = await res.json()
      if (data.success) {
        if (!positionNotes.value[positionId]) {
          positionNotes.value[positionId] = []
        }
        positionNotes.value[positionId].push(data.data)
        return data.data
      }
      return null
    } catch (error) {
      console.error('添加职位补充失败:', error)
      return null
    }
  }

  async function updatePositionNote(positionId, noteId, content) {
    try {
      const res = await fetch(`${API_BASE}/positions/${positionId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      const data = await res.json()
      if (data.success) {
        const notes = positionNotes.value[positionId] || []
        const index = notes.findIndex(n => n.id === noteId)
        if (index > -1) {
          notes[index] = data.data
        }
        return true
      }
      return false
    } catch (error) {
      console.error('更新职位补充失败:', error)
      return false
    }
  }

  async function deletePositionNote(positionId, noteId) {
    try {
      const res = await fetch(`${API_BASE}/positions/${positionId}/notes/${noteId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      
      if (data.success) {
        const notes = positionNotes.value[positionId] || []
        const index = notes.findIndex(n => n.id === noteId)
        if (index > -1) {
          notes.splice(index, 1)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('删除职位补充失败:', error)
      return false
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
      
      console.log('添加职位响应:', data)
      
      if (data.success && data.data) {
        activePositions.value.unshift(data.data)
        positions.value = [...activePositions.value, ...archivedPositions.value]
        if (!currentPositionId.value || currentPositionId.value !== data.data.id) {
          currentPositionId.value = data.data.id
        }
        if (!resumes.value[data.data.id]) {
          resumes.value[data.data.id] = []
        }
        return data.data.id
      }
      console.warn('添加失败，响应数据:', data)
      return data.data?.id || null
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
        const index = activePositions.value.findIndex(p => p.id === Number(id))
        if (index > -1) {
          activePositions.value[index] = data.data
        }
        positions.value = [...activePositions.value, ...archivedPositions.value]
        return true
      }
      if (data.message === '已归档的职位不能编辑') {
        ElMessage.warning('已归档的职位不能编辑')
        return false
      }
      return false
    } catch (error) {
      console.error('更新职位失败:', error)
      return false
    }
  }

  async function deletePosition(id) {
    try {
      const res = await fetch(`${API_BASE}/positions/${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      
      if (data.success) {
        const index = activePositions.value.findIndex(p => p.id === Number(id))
        if (index > -1) {
          activePositions.value.splice(index, 1)
        }
        
        if (currentPositionId.value === Number(id)) {
          currentPositionId.value = activePositions.value.length > 0 ? activePositions.value[0].id : null
        }
        delete resumes.value[id]
        return true
      }
      return false
    } catch (error) {
      console.error('删除职位失败:', error)
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

  async function fetchResumeDetail(resumeId) {
    try {
      const res = await fetch(`${API_BASE}/resumes/${resumeId}`)
      const data = await res.json()
      if (data.success) {
        return data.data
      }
    } catch (error) {
      console.error('获取简历详情失败:', error)
    }
    return null
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
    activePositions,
    archivedPositions,
    currentPositionId,
    resumes,
    positionNotes,
    fetchPositions,
    archivePosition,
    restorePosition,
    fetchPositionNotes,
    addPositionNote,
    updatePositionNote,
    deletePositionNote,
    addPosition,
    updatePosition,
    deletePosition,
    setCurrentPosition,
    fetchResumes,
    fetchResumeDetail,
    addResume,
    deleteResume,
    getCurrentPosition,
    getPositionResumes
  }
})
