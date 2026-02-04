<template>
  <div class="recommend-resume-list">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button size="small" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 未解析JD提示 -->
    <div v-if="!positionParsed" class="unparsed-tip">
      <el-alert
        title="请先提取JD信息"
        type="warning"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 推荐列表 -->
    <div v-else class="recommend-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>

      <!-- 空状态 -->
      <div v-else-if="recommendations.length === 0" class="empty-state">
        <el-empty description="暂无推荐候选人" :image-size="80">
          <template #description>
            <p>暂无推荐候选人</p>
            <p class="empty-subtitle">点击"开始推荐"获取智能推荐</p>
          </template>
        </el-empty>
      </div>

      <!-- 推荐列表 -->
      <div v-else class="recommend-list">
        <div
          v-for="item in recommendations"
          :key="item.id"
          class="recommend-item"
        >
          <div class="item-header">
            <div class="match-score" :class="getScoreClass(item.match_score)">
              <span class="score-value">{{ item.match_score }}</span>
              <span class="score-label">匹配度</span>
            </div>
            <div class="candidate-basic">
              <h4 class="candidate-name">{{ item.candidate_name }}</h4>
              <p class="candidate-title">{{ item.latest_title || '未知职位' }}</p>
            </div>
          </div>

          <div class="skills-section">
            <div class="skills-row">
              <span class="skills-label">匹配技能：</span>
              <div class="skills-tags">
                <el-tag
                  v-for="skill in item.matched_skills"
                  :key="skill"
                  type="success"
                  size="small"
                >
                  {{ skill }}
                </el-tag>
                <span v-if="!item.matched_skills?.length" class="no-skills">无</span>
              </div>
            </div>
            <div v-if="item.missing_skills?.length" class="skills-row">
              <span class="skills-label">缺失技能：</span>
              <div class="skills-tags">
                <el-tag
                  v-for="skill in item.missing_skills"
                  :key="skill"
                  type="danger"
                  size="small"
                >
                  {{ skill }}
                </el-tag>
              </div>
            </div>
          </div>

          <div class="item-actions">
            <el-button type="primary" size="small" @click="handleAccept(item)">
              <el-icon><Check /></el-icon>
              推进入职
            </el-button>
            <el-button size="small" @click="handleViewDetail(item)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMore" class="load-more">
          <el-button
            :loading="loadingMore"
            size="small"
            @click="handleLoadMore"
          >
            加载更多
          </el-button>
        </div>

        <!-- 没有更多 -->
        <div v-else-if="recommendations.length > 0" class="no-more">
          没有更多推荐了
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Refresh, Check, View } from '@element-plus/icons-vue'

const props = defineProps({
  positionId: {
    type: Number,
    required: true
  },
  positionParsed: {
    type: Boolean,
    default: false
  },
  recommendations: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingMore: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh', 'load-more', 'accept', 'view-detail'])

const getScoreClass = (score) => {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 60) return 'fair'
  return 'poor'
}

const handleRefresh = () => {
  emit('refresh')
}

const handleLoadMore = () => {
  emit('load-more')
}

const handleAccept = (item) => {
  emit('accept', item)
}

const handleViewDetail = (item) => {
  emit('view-detail', item)
}
</script>

<style scoped>
.recommend-resume-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.unparsed-tip {
  padding: 20px 16px;
}

.recommend-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-state {
  padding: 20px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-subtitle {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recommend-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.recommend-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.match-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
}

.match-score.excellent {
  background: #f0f9eb;
  color: #67c23a;
}

.match-score.good {
  background: #ecf5ff;
  color: #409eff;
}

.match-score.fair {
  background: #fdf6ec;
  color: #e6a23c;
}

.match-score.poor {
  background: #fef0f0;
  color: #f56c6c;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 12px;
  margin-top: 4px;
}

.candidate-basic {
  flex: 1;
  min-width: 0;
}

.candidate-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.candidate-title {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.skills-section {
  margin-bottom: 12px;
}

.skills-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.skills-row:last-child {
  margin-bottom: 0;
}

.skills-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  flex-shrink: 0;
  padding-top: 2px;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.skills-tags .el-tag {
  margin-right: 0;
}

.no-skills {
  font-size: 13px;
  color: #909399;
}

.item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.item-actions .el-button {
  font-size: 12px;
}

.item-actions .el-icon {
  margin-right: 4px;
}

.load-more {
  text-align: center;
  padding: 16px;
}

.no-more {
  text-align: center;
  padding: 16px;
  color: #909399;
  font-size: 13px;
}
</style>
