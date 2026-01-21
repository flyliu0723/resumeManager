<template>
  <div class="candidate-detail-container">
    <div v-if="!candidate" class="empty-state">
      <el-empty description="选择一个候选人" :image-size="80" />
    </div>

    <template v-else>
      <div class="detail-header">
          <div class="header-top">
            <div class="candidate-avatar-lg">{{ getAvatarText(parsedData.name || candidate?.candidate_name) }}</div>
            <div class="header-info">
              <h3>{{ parsedData.name || candidate?.candidate_name || '未知候选人' }}</h3>
            <div class="subtitle-row">
              <span class="subtitle">{{ getExperienceText(candidate) }}</span>
              <el-tag :type="getStatusType(candidate.status)" size="small">{{ getStatusText(candidate.status) }}</el-tag>
            </div>
          </div>
          <el-button class="view-jd-btn" @click="viewOriginal" :disabled="positionArchived">
            <el-icon><Document /></el-icon>
            查看简历
          </el-button>
          <el-button type="primary" @click="$emit('parse')" :loading="parsing" :disabled="positionArchived">
            <el-icon><Refresh /></el-icon>
            重新解析
          </el-button>
          <el-button type="warning" @click="$emit('evaluate')" :loading="evaluating" :disabled="positionArchived || !hasParsedData">
            <el-icon><TrendCharts /></el-icon>
            重新匹配
          </el-button>
          <el-button type="success" @click="$emit('schedule')" :disabled="positionArchived">
            <el-icon><Calendar /></el-icon>
            面试安排
          </el-button>
        </div>
        <div v-if="positionArchived" class="archived-banner">
          <el-icon><Warning /></el-icon>
          <span>该职位已归档，操作受限</span>
        </div>
      </div>

      <div class="detail-content">
        <div class="action-bar" v-if="candidate.status === '未解析' && !positionArchived">
          <el-alert
            title="该简历尚未解析"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="$emit('parse')" :loading="parsing">
                  <el-icon><Refresh /></el-icon>
                  解析简历
                </el-button>
              </div>
            </template>
          </el-alert>
        </div>

        <div class="match-score-section" v-if="candidate.match_score !== null">
          <div class="match-score-card" :class="getMatchClass(candidate.match_score)">
            <div class="score-label">匹配度</div>
            <div class="score-value">{{ candidate.match_score }}</div>
            <div class="score-level">{{ getMatchLevel(candidate.match_score) }}</div>
          </div>
        </div>

        <div class="summary-section" v-if="evaluationData.ai_summary">
          <div class="section-label">AI 判断</div>
          <p class="summary-text">{{ evaluationData.ai_summary }}</p>
        </div>

        <div class="questions-section" v-if="questionsList.length > 0">
          <div class="section-title">
            <el-icon><ChatDotRound /></el-icon>
            待确认问题 ({{ questionsList.length }})
          </div>
          <div class="questions-list">
            <div v-for="(q, index) in questionsList" :key="index" class="question-item">
              <div class="question-text">{{ q.question }}</div>
              <div class="question-reason" v-if="q.reason">{{ q.reason }}</div>
            </div>
          </div>
        </div>

        <el-collapse v-model="activePanels" class="info-collapse">
          <el-collapse-item name="skills" title="技能">
            <div class="skills-container">
              <el-tag
                v-for="skill in (parsedData.skills || [])"
                :key="skill"
                type="primary"
                size="small"
                class="skill-tag"
              >
                {{ skill }}
              </el-tag>
              <span v-if="!parsedData.skills || parsedData.skills.length === 0" class="no-data-text">
                未提取到技能
              </span>
            </div>
          </el-collapse-item>

          <el-collapse-item name="experience" title="经历">
            <div v-if="parsedData.experience" class="experience-content">
              <p style="white-space: pre-wrap;">{{ parsedData.experience }}</p>
            </div>
            <div v-else class="no-data-text">未提取到经历</div>
          </el-collapse-item>

          <el-collapse-item name="companies" title="公司">
            <div v-if="parsedData.companies && parsedData.companies.length > 0" class="companies-container">
              <el-tag
                v-for="company in parsedData.companies"
                :key="company"
                type="success"
                size="small"
                class="company-tag"
              >
                {{ company }}
              </el-tag>
            </div>
            <div v-else class="no-data-text">未提取到公司信息</div>
          </el-collapse-item>

          <el-collapse-item name="education" title="教育">
            <div class="education-content">
              <p v-if="parsedData.education" style="white-space: pre-wrap;">{{ parsedData.education }}</p>
              <p v-else class="no-data-text">未提取到教育背景</p>
            </div>
          </el-collapse-item>

          <el-collapse-item name="work" title="工作经历">
            <div class="work-content">
              <p v-if="parsedData.work_experience" style="white-space: pre-wrap;">{{ parsedData.work_experience }}</p>
              <p v-else class="no-data-text">未提取到工作经历摘要</p>
            </div>
          </el-collapse-item>

          <el-collapse-item name="projects" title="项目经历">
            <div class="project-content">
              <p v-if="parsedData.project_experience" style="white-space: pre-wrap;">{{ parsedData.project_experience }}</p>
              <p v-else class="no-data-text">未提取到项目经历摘要</p>
            </div>
          </el-collapse-item>

        </el-collapse>

        <div v-if="positionArchiveReason" class="archive-reason-section">
          <div class="section-label">归档原因</div>
          <div class="archive-reason-content">
            <el-icon><Warning /></el-icon>
            <span>{{ positionArchiveReason }}</span>
          </div>
        </div>
      </div>
    </template>

    <el-dialog
      v-model="previewVisible"
      :title="previewFile?.name || '简历预览'"
      width="80%"
      top="5vh"
    >
      <div class="preview-content">
        <iframe 
          v-if="previewFile && isPDF(previewFile)"
          :src="`http://localhost:3000/api/resumes/${previewFile.id}/preview`"
          class="preview-frame"
        />
        <div v-else class="word-tip">
          <el-icon size="48"><Warning /></el-icon>
          <p>Word 文档无法在线预览，请下载后查看</p>
          <p class="file-info">文件名: {{ previewFile?.name }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChatDotRound, Document, Refresh, TrendCharts, Calendar, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  candidate: {
    type: Object,
    default: null
  },
  parsing: {
    type: Boolean,
    default: false
  },
  evaluating: {
    type: Boolean,
    default: false
  },
  positionArchived: {
    type: Boolean,
    default: false
  },
  positionArchiveReason: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['view-jd', 'view-original', 'parse', 'evaluate', 'schedule'])

const activePanels = ref(['skills', 'experience', 'education', 'work', 'projects'])
const previewVisible = ref(false)
const previewFile = ref(null)

const viewOriginal = () => {
  if (props.candidate) {
    previewFile.value = props.candidate
    previewVisible.value = true
  }
}

const isPDF = (file) => {
  return file.type === 'application/pdf' || file.name?.endsWith('.pdf')
}

const parsedData = computed(() => {
  if (!props.candidate) return {}
  return props.candidate.parsed_data_obj || {}
})

const evaluationData = computed(() => {
  if (!props.candidate) return {}
  return props.candidate.evaluation_obj || {}
})

const questionsList = computed(() => {
  if (!props.candidate) return []
  return props.candidate.questions_list || []
})

const hasParsedData = computed(() => {
  if (!props.candidate) return false
  return props.candidate.parsed_data_obj && Object.keys(props.candidate.parsed_data_obj).length > 0
})

const getMatchLevel = (score) => {
  if (!score && score !== 0) return '暂无'
  if (score >= 80) return '高'
  if (score >= 60) return '中'
  return '低'
}

const getMatchClass = (score) => {
  if (!score && score !== 0) return 'match-none'
  if (score >= 80) return 'match-high'
  if (score >= 60) return 'match-medium'
  return 'match-low'
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

const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

const getExperienceText = (candidate) => {
  const pd = parsedData.value
  const experiences = []
  if (pd.latest_title) {
    experiences.push(pd.latest_title)
  } else if (candidate?.latest_title) {
    experiences.push(candidate.latest_title)
  }
  if (pd.latest_company) {
    experiences.push(pd.latest_company)
  } else if (candidate?.latest_company) {
    experiences.push(candidate.latest_company)
  }
  if (pd.years_experience) {
    experiences.push(`${pd.years_experience}年`)
  } else if (candidate?.years_experience) {
    experiences.push(`${candidate.years_experience}年`)
  }
  return experiences.join(' · ') || '暂无经历'
}
</script>

<style scoped>
.candidate-detail-container {
  background: #fff;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.candidate-avatar-lg {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
}

.header-info h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.subtitle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.view-jd-btn {
  font-size: 12px;
}
.el-button+.el-button {
  margin-left: -10px;
}
.view-jd-btn .el-icon {
  margin-right: 4px;
}

.archived-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
  color: #e6a23c;
  font-size: 13px;
}

.archived-banner .el-icon {
  font-size: 16px;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.action-bar {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.match-score-section {
  margin-bottom: 20px;
}

.match-score-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #e4e7ed;
}

.match-score-card.match-high {
  background: #f0f9eb;
  border-color: #e1f3d8;
}

.match-score-card.match-medium {
  background: #fdf6ec;
  border-color: #faecd8;
}

.match-score-card.match-low {
  background: #fef0f0;
  border-color: #fde2e2;
}

.score-label {
  font-size: 12px;
  color: #909399;
}

.score-value {
  font-size: 32px;
  font-weight: 700;
}

.match-high .score-value {
  color: #67c23a;
}

.match-medium .score-value {
  color: #e6a23c;
}

.match-low .score-value {
  color: #f56c6c;
}

.score-level {
  font-size: 14px;
  font-weight: 500;
}

.match-high .score-level {
  color: #67c23a;
}

.match-medium .score-level {
  color: #e6a23c;
}

.match-low .score-level {
  color: #f56c6c;
}

.summary-section {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #67c23a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.summary-text {
  margin: 0;
  font-size: 13px;
  color: #303133;
  line-height: 1.6;
}

.questions-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.no-questions {
  padding: 16px 0;
}

.no-data-text {
  color: #909399;
  font-size: 13px;
}

.questions-list {
  margin-bottom: 12px;
}

.question-item {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 8px;
}

.question-text {
  font-size: 13px;
  color: #303133;
  margin-bottom: 6px;
  font-weight: 500;
}

.question-reason {
  font-size: 12px;
  color: #909399;
  padding-left: 10px;
  border-left: 2px solid #e4e7ed;
}

.info-collapse {
  margin-bottom: 16px;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  margin: 0;
}

.education-content,
.experience-content,
.work-content,
.project-content {
  padding: 10px;
  background: #fafafa;
  border-radius: 4px;
}

.education-content p,
.experience-content p,
.work-content p,
.project-content p {
  margin: 0;
  font-size: 13px;
  color: #303133;
  line-height: 1.7;
}

.original-content {
  padding: 10px 0;
}

.footer-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  margin-top: 16px;
}

.footer-actions .el-button {
  flex: 1;
}

.footer-actions .el-icon {
  margin-right: 4px;
}

.preview-content {
  height: 70vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
}

.word-tip {
  text-align: center;
  color: #909399;
}

.word-tip p {
  margin: 10px 0;
}

.file-info {
  font-size: 12px;
  color: #c0c4cc;
}

.archive-reason-section {
  margin-top: 20px;
  padding: 16px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
}

.archive-reason-section .section-label {
  font-size: 11px;
  font-weight: 600;
  color: #e6a23c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.archive-reason-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.archive-reason-content .el-icon {
  color: #e6a23c;
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}
</style>
