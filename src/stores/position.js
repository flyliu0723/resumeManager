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

  async function fetchResumeDetail(matchId) {
    try {
      // 注意：这里查询的是 position_resumes 表，不是 resumes 表
      return await api.get(`/positions/position-resumes/${matchId}`)
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

  async function deleteResume(matchId) {
    try {
      // 注意：这里删除的是 position_resumes 表的记录（匹配关系），不是 resumes 表
      await api.delete(`/positions/position-resumes/${matchId}`)
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
      console.log('\n========== [前端提交] ==========')
      console.log('[前端] 时间:', new Date().toLocaleString('zh-CN'))
      console.log('[前端] 匹配ID:', matchId)
      console.log('[前端] 提交数据:', JSON.stringify(status, null, 2))

      await api.put(`/position-resumes/${matchId}/status`, { status })

      console.log('[前端] 请求完成')

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

  async function reopenCandidate(matchId, options = {}) {
    try {
      const result = await api.post(`/position-resumes/${matchId}/reopen`, options)
      
      if (result.success && currentPositionId.value) {
        // Refresh the resumes list to get updated status
        await fetchResumes(currentPositionId.value)
        // Refresh flow logs
        await fetchFlowLogs(matchId)
      }
      
      return result
    } catch (error) {
      console.error('重新打开候选人流程失败:', error)
      throw error
    }
  }

  // 解析职位JD
  async function parsePositionJD(positionId, includeNotes = true) {
    try {
      const data = await api.post(`/positions/${positionId}/parse-jd`, { includeNotes })
      // api.js 已经处理了 success 判断并返回 data
      if (data) {
        // 更新当前职位的解析数据
        const position = positions.value.find(p => p.id === Number(positionId))
        if (position) {
          position.parsed_skills = JSON.stringify(data.skills)
          position.parsed_education = data.education
          position.parsed_experience = data.experience
          position.parsed_companies = JSON.stringify(data.companies)
          position.parsed_at = data.parsedAt
        }
        return data
      }
      return null
    } catch (error) {
      console.error('解析JD失败:', error)
      throw error
    }
  }

  // 更新解析字段
  async function updateParsedField(positionId, field, value) {
    try {
      await api.put(`/positions/${positionId}/parsed-field`, { field, value })
      // 更新本地数据
      const position = positions.value.find(p => p.id === Number(positionId))
      if (position) {
        position[field] = Array.isArray(value) ? JSON.stringify(value) : value
      }
      return true
    } catch (error) {
      console.error('更新解析字段失败:', error)
      return false
    }
  }

  // 获取解析结果
  async function fetchParsedJD(positionId) {
    try {
      const data = await api.get(`/positions/${positionId}/parsed-jd`)
      if (data) {
        // 更新本地数据
        const position = positions.value.find(p => p.id === Number(positionId))
        if (position) {
          position.parsed_skills = JSON.stringify(data.skills)
          position.parsed_education = data.education
          position.parsed_experience = data.experience
          position.parsed_companies = JSON.stringify(data.companies)
          position.parsed_at = data.parsedAt
        }
        return data
      }
      return null
    } catch (error) {
      console.error('获取解析结果失败:', error)
      return null
    }
  }

  // 推荐相关状态
  const recommendations = ref({})
  const recommendStatus = ref({})

  // 触发推荐
  async function triggerRecommend(positionId) {
    try {
      const result = await api.post(`/positions/${positionId}/recommend`)
      if (result) {
        recommendStatus.value[positionId] = {
          status: 'processing',
          message: result.message || '正在计算推荐...'
        }
        return result
      }
      return null
    } catch (error) {
      console.error('触发推荐失败:', error)
      throw error
    }
  }

  // 获取推荐列表
  async function getRecommendations(positionId, page = 1, limit = 10) {
    try {
      const data = await api.get(`/positions/${positionId}/recommendations?page=${page}&limit=${limit}`)
      if (data) {
        if (!recommendations.value[positionId]) {
          recommendations.value[positionId] = []
        }
        if (page === 1) {
          recommendations.value[positionId] = data.items || []
        } else {
          recommendations.value[positionId].push(...(data.items || []))
        }
        return {
          items: data.items || [],
          total: data.total || 0,
          hasMore: data.has_more || false
        }
      }
      return { items: [], total: 0, hasMore: false }
    } catch (error) {
      console.error('获取推荐列表失败:', error)
      return { items: [], total: 0, hasMore: false }
    }
  }

  // 获取推荐计算状态
  async function getRecommendStatus(positionId) {
    try {
      const data = await api.get(`/positions/${positionId}/recommendations/status`)
      if (data) {
        recommendStatus.value[positionId] = {
          status: data.status,
          message: data.message || ''
        }
        return data
      }
      return null
    } catch (error) {
      console.error('获取推荐状态失败:', error)
      return null
    }
  }

  // 接受推荐（推进入职流程）
  async function acceptRecommendation(positionId, resumeId) {
    try {
      const result = await api.post(`/positions/${positionId}/recommendations/${resumeId}/accept`)
      if (result && result.success) {
        // 从推荐列表中移除
        const list = recommendations.value[positionId] || []
        const index = list.findIndex(item => item.resume_id === resumeId)
        if (index > -1) {
          list.splice(index, 1)
        }
        // 刷新职位简历列表
        await fetchResumes(positionId)
      }
      return result
    } catch (error) {
      console.error('接受推荐失败:', error)
      throw error
    }
  }

  // 获取当前职位的推荐列表
  function getPositionRecommendations(positionId) {
    return recommendations.value[positionId] || []
  }

  // 获取当前职位的推荐状态
  function getPositionRecommendStatus(positionId) {
    return recommendStatus.value[positionId] || { status: 'idle', message: '' }
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
    getPositionResumes,
    reopenCandidate,
    parsePositionJD,
    updateParsedField,
    fetchParsedJD,
    recommendations,
    recommendStatus,
    triggerRecommend,
    getRecommendations,
    getRecommendStatus,
    acceptRecommendation,
    getPositionRecommendations,
    getPositionRecommendStatus
  }
})
