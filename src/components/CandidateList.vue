<template>
  <div class="candidate-list-container">
    <div class="list-header">
      <div class="list-title">
        <h3>候选人</h3>
        <span class="count">{{ candidates.length }}份简历</span>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="$emit('view-jd')">
          <el-icon><Document /></el-icon>
          查看 JD
        </el-button>
        <el-button type="primary" size="small" @click="$emit('upload')">
          <el-icon><Plus /></el-icon>
          上传简历
        </el-button>
      </div>
    </div>

    <div v-if="candidates.length === 0" class="empty-tip">
      <el-empty description="暂无简历" :image-size="60" />
    </div>

    <div v-else class="candidate-items">
      <div
        v-for="candidate in candidates"
        :key="candidate.id"
        :class="['candidate-item', { selected: selectedCandidate?.id === candidate.id }]"
        @click="selectCandidate(candidate)"
      >
        <div class="candidate-avatar">{{ getAvatarText(candidate.name) }}</div>
        <div class="candidate-info">
          <div class="candidate-name">
            {{ candidate.name || '未知候选人' }}
          </div>
          <div class="candidate-experience">
            {{ getExperienceText(candidate) }}
          </div>
          <div class="candidate-meta">
            <span :class="['match-score', getMatchLevel(candidate.match_score)]">
              {{ candidate.match_score || 0 }}%
            </span>
            <el-tag :type="getStatusType(candidate.status)" size="small" class="status-tag">
              {{ getStatusText(candidate.status) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus, Document } from '@element-plus/icons-vue'

const props = defineProps({
  candidates: {
    type: Array,
    default: () => []
  },
  selectedCandidate: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select', 'upload', 'view-jd'])

const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

const getExperienceText = (candidate) => {
  const experiences = []
  if (candidate.latest_title) {
    experiences.push(candidate.latest_title)
  }
  if (candidate.latest_company) {
    experiences.push(candidate.latest_company)
  }
  if (candidate.years_experience) {
    experiences.push(`${candidate.years_experience}年`)
  }
  return experiences.join(' · ') || '暂无经历'
}

const getMatchLevel = (score) => {
  if (score === null || score === undefined) return 'none'
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

const getStatusType = (status) => {
  const types = {
    '未解析': 'info',
    '已解析': 'primary',
    '待沟通': 'warning',
    '待面试': 'success',
    '面试中': 'success',
    '已通过': 'success',
    '已拒绝': 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    '未解析': '未解析',
    '已解析': '已解析',
    '待沟通': '待沟通',
    '待面试': '待面试',
    '面试中': '面试中',
    '已通过': '已通过',
    '已拒绝': '已拒绝'
  }
  return texts[status] || status || '未知'
}

const selectCandidate = (candidate) => {
  emit('select', candidate)
}
</script>

<style scoped>
.candidate-list-container {
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.list-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions .el-button {
  font-size: 12px;
}

.header-actions .el-icon {
  margin-right: 4px;
}

.list-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.count {
  font-size: 12px;
  color: #909399;
}

.empty-tip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.candidate-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.candidate-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.candidate-item:hover {
  background: #f5f7fa;
}

.candidate-item.selected {
  background: #ecf5ff;
  border-color: #409eff;
}

.candidate-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.candidate-info {
  flex: 1;
  min-width: 0;
}

.candidate-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.candidate-experience {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.candidate-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-score {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.match-score.high {
  background: #f0f9eb;
  color: #67c23a;
}

.match-score.medium {
  background: #fdf6ec;
  color: #e6a23c;
}

.match-score.low {
  background: #fef0f0;
  color: #f56c6c;
}

.match-score.none {
  background: #f4f4f5;
  color: #909399;
}

.status-tag {
  font-size: 11px;
}
</style>
