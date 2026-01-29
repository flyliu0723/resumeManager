import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../utils/api'

export const usePositionStore = defineStore('position', () => {
  const positions = ref([])
  const activePositions = ref([])
  const archivedPositions = ref([])
  const currentPositionId = ref(null)
  const resumes = ref({})
  const matches = ref({})
  const positionNotes = ref({})

  async function fetchPositions() {
    try {
      const data = await api.get('/positions')
      activePositions.value = data.active || []
      archivedPositions.value = data.archived || []
      positions.value = [...activePositions.value, ...archivedPositions.value]
      
      if (activePositions.value.length > 0 && !currentPositionId.value) {
        currentPositionId.value = activePositions.value[0].id
        fetchResumes(currentPositionId.value)
      }
    } catch (error) {
      console.error('获取职位列表失败:', error)
    }
  }

  async function archivePosition(id, reason) {
    try {
      const updatedPosition = await api.post(`/positions/${id}/archive`, { reason })
      
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
    } catch (error) {
      console.error('归档职位失败:', error)
      return false
    }
  }

  async function restorePosition(id) {
    try {
      const updatedPosition = await api.post(`/positions/${id}/restore`)
      
      const index = archivedPositions.value.findIndex(p => p.id === Number(id))
      if (index > -1) {
      const [restored] = archivedPositions.value.splice(index, 1)
        restored.status = 'active'
        restored.archive_reason = null
        restored.archived_at = null
        activePositions.value.unshift(restored)
      }
      return true
    } catch (error) {
      console.error('恢复职位失败:', error)
      return false
    }
  }

  async function fetchPositionNotes(positionId) {
    try {
      const notes = await api.get(`/positions/${positionId}/notes`)
      positionNotes.value[positionId] = notes || []
    } catch (error) {
      console.error('获取职位补充失败:', error)
    }
  }

  async function addPositionNote(positionId, content) {
    try {
      const note = await api.post(`/positions/${positionId}/notes`, { content })
      if (!positionNotes.value[positionId]) {
        positionNotes.value[positionId] = []
      }
      positionNotes.value[positionId].push(note)
      return note
    } catch (error) {
      console.error('添加职位补充失败:', error)
      return null
    }
  }

  async function updatePositionNote(positionId, noteId, content) {
    try {
      const success = await api.put(`/positions/${positionId}/notes/${noteId}`, { content })
      const notes = positionNotes.value[positionId] || []
      const index = notes.findIndex(n => n.id === noteId)
      if (index > -1) {
        notes[index] = success
      }
      return true
    } catch (error) {
      console.error('更新职位补充失败:', error)
      return false
    }
  }

  async function deletePositionNote(positionId, noteId) {
    try {
      await api.delete(`/positions/${positionId}/notes/${noteId}`)
      const notes = positionNotes.value[positionId] || []
      const index = notes.findIndex(n => n.id === noteId)
      if (index > -1) {
        notes.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error('删除职位补充失败:', error)
      return false
    }
  }

  async function addPosition(position) {
    try {
      const newPosition = await api.post('/positions', position)
      activePositions.value.unshift(newPosition)
      positions.value = [...activePositions.value, ...archivedPositions.value]
      
      if (!currentPositionId.value || currentPositionId.value !== newPosition.id) {
        currentPositionId.value = newPosition.id
      }
      if (!matches.value[newPosition.id]) {
        matches.value[newPosition.id] = []
  }
return newPosition.id
    } catch (error) {
      console.error('添加职位失败:', error)
      return null
    }
  }

  async function updatePosition(id, position) {
    try {
      const updatedPosition = await api.put(`/positions/${id}`, position)
      const index = activePositions.value.findIndex(p => p.id === Number(id))
      if (index > -1) {
        activePositions.value[index] = updatedPosition
      }
      positions.value = [...activePositions.value, ...archivedPositions.value]
      return true
    } catch (error) {
      console.error('更新职位失败:', error)
      return false
    }
  }

  async function deletePosition(id) {
    try {
      await api.delete(`/positions/${id}`)
      
      const index = activePositions.value.findIndex(p => p.id === Number(id))
      if (index > -1) {
        activePositions.value.splice(index, 1)
      }
      
      if (currentPositionId.value === Number(id)) {
        currentPositionId.value = activePositions.value.length > 0 ? activePositions.value[0].id : null
      }
      delete matches.value[id]
      return true
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
      const data = await api.get(`/positions/${positionId}/resumes`)
      matches.value[positionId] = data || []
    } catch (error) {
      console.error('获取简历列表失败:', error)
    }
  }

  async function fetchResumeDetail(resumeId) {
    try {
      return await api.get(`/resumes/${resumeId}`)
    } catch (error) {
      console.error('获取简历详情失败:', error)
      return null
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
      formData.append('source', resume.source || 'other')
      formData.append('note', resume.note || '')

      const newMatch = await api.upload(`/positions/${positionId}/resumes`, formData)
      
      if (!matches.value[positionId]) {
        matches.value[positionId] = []
      }
      matches.value[positionId].unshift(newMatch)
      return true
    } catch (error) {
      console.error('上传简历失败:', error)
      return false
    }
  }

  async function deleteResume(resumeId) {
    try {
      await api.delete(`/resumes/${resumeId}`)
      if (currentPositionId.value) {
        await fetchResumes(currentPositionId.value)
      }
      return true
    } catch (error) {
      console.error('删除简历失败:', error)
      return false
    }
  }

  async function updateMatchStatus(matchId, status) {
    try {
      await api.put(`/position-resumes/${matchId}/status`, { status })
      if (currentPositionId.value) {
        await fetchResumes(currentPositionId.value)
      }
      return true
    } catch (error) {
      console.error('更新匹配状态失败:', error)
      return false
    }
  }

  const flowLogs = ref({})

  async function fetchFlowLogs(matchId) {
    try {
      const logs = await api.get(`/flow-logs/match/${matchId}/flow-logs`)
      flowLogs.value[matchId] = logs || []
      return logs
    } catch (error) {
      console.error('获取流程日志失败:', error)
      return []
    }
  }

  async function createFlowLog(matchId, fromStatus, toStatus, note, jdSupplement) {
    try {
      const result = await api.post('/flow-logs/match/flow-log', {
        matchId,
        fromStatus,
        toStatus,
        note,
        jdSupplement
      })
      
      if (result.match) {
        if (currentPositionId.value) {
          await fetchResumes(currentPositionId.value)
        }
      }
      
      if (result.logs) {
        flowLogs.value[matchId] = result.logs
      } else {
        await fetchFlowLogs(matchId)
      }
      
      return result
    } catch (error) {
      console.error('创建流程日志失败:', error)
      return null
    }
  }

  async function updateJdSupplement(matchId, jdSupplement) {
    try {
      await api.put(`/flow-logs/match/${matchId}/jd-supplement`, { jdSupplement })
      if (currentPositionId.value) {
        await fetchResumes(currentPositionId.value)
      }
      return true
    } catch (error) {
      console.error('更新JD补充失败:', error)
      return false
    }
  }

  function getFlowLogs(matchId) {
    return flowLogs.value[matchId] || []
  }

  function getCurrentPosition() {
    return positions.value.find(p => p.id === currentPositionId.value)
  }

  function getPositionResumes(positionId) {
    return matches.value[positionId] || []
  }

  return {
    positions,
    activePositions,
    archivedPositions,
    currentPositionId,
    resumes,
    matches,
    positionNotes,
    flowLogs,
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
    updateMatchStatus,
    fetchFlowLogs,
    createFlowLog,
    updateJdSupplement,
    getFlowLogs,
    getCurrentPosition,
    getPositionResumes
  }
})
