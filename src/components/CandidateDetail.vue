<template>
  <div class="candidate-detail-container">
    <div v-if="!candidate" class="empty-state">
      <el-empty description="选择一个候选人" :image-size="80" />
    </div>

    <template v-else>
      <div class="detail-header">
        <div class="header-top">
          <div class="candidate-avatar-lg" :style="{ background: getAvatarColor(candidate.current_status || candidate.status) }">
            {{ getAvatarText(parsedData.name || candidate?.candidate_name) }}
          </div>
          <div class="header-info">
            <h3>{{ parsedData.name || candidate?.candidate_name || '未知候选人' }}</h3>
            <div class="subtitle-row">
              <span class="subtitle">{{ getExperienceText(candidate) }}</span>
              <el-tag :type="getStatusType(candidate.current_status || candidate.status)" size="small">
                {{ getStatusText(candidate.current_status || candidate.status) }}
              </el-tag>
            </div>
          </div>
          <div class="header-actions">
            <el-button @click="viewOriginal" :disabled="positionArchived">
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
            <el-button type="primary" @click="showActionDialog" :disabled="positionArchived">
              <el-icon><Operation /></el-icon>
              状态变更
            </el-button>
            <el-button @click="showJdExtraDialog">
              <el-icon><EditPen /></el-icon>
              JD补充
            </el-button>
            <el-button @click="showFlowDetail">
              <el-icon><List /></el-icon>
              流转详情
            </el-button>
          </div>
        </div>
        <div v-if="positionArchived" class="archived-banner">
          <el-icon><Warning /></el-icon>
          <span>该职位已归档，操作受限</span>
        </div>
      </div>

      <div class="detail-content">
        <div class="action-bar" v-if="(candidate.status === '未解析' || candidate.current_status === '未解析') && !positionArchived">
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

        <div class="match-summary-section" v-if="candidate.match_score !== null || matchReasons.length > 0 || gapAnalysis.length > 0 || uncertainPoints.length > 0">
          <!-- 弱化的匹配度分值 -->
          <div class="match-score-compact" v-if="candidate.match_score !== null">
            <span class="score-text">匹配度: </span>
            <span class="score-number" :class="getMatchClass(candidate.match_score)">{{ candidate.match_score }}分</span>
            <span class="score-level-text">({{ getMatchLevel(candidate.match_score) }})</span>
          </div>
          
          <!-- 突出的分析卡片 -->
          <div class="analysis-cards-compact">
            <div class="analysis-card-compact match-card-compact" v-if="matchReasons.length > 0">
              <div class="card-header-compact">
                <el-icon><CircleCheck /></el-icon>
                <span>匹配点 ({{ matchReasons.length }})</span>
              </div>
              <ul class="card-list-compact">
                <li v-for="(reason, index) in matchReasons" :key="index">{{ reason }}</li>
              </ul>
            </div>

            <div class="analysis-card-compact uncertain-card-compact" v-if="uncertainPoints.length > 0">
              <div class="card-header-compact">
                <el-icon><QuestionFilled /></el-icon>
                <span>待确认 ({{ uncertainPoints.length }})</span>
              </div>
              <ul class="card-list-compact">
                <li v-for="(point, index) in uncertainPoints" :key="index">{{ point }}</li>
              </ul>
            </div>

            <div class="analysis-card-compact risk-card-compact" v-if="gapAnalysis.length > 0">
              <div class="card-header-compact">
                <el-icon><WarningFilled /></el-icon>
                <span>风险点 ({{ gapAnalysis.length }})</span>
              </div>
              <ul class="card-list-compact">
                <li v-for="(gap, index) in gapAnalysis" :key="index">{{ gap }}</li>
              </ul>
            </div>
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

    <CandidateActionDialog
      v-model="actionDialogVisible"
      :candidate="candidate"
      @success="handleActionSuccess"
    />

    <FlowDetailDialog
      v-model="flowDetailVisible"
      :candidate="candidate"
    />

    <JDExtraDialog
      v-model="jdExtraDialogVisible"
      :positionId="positionId"
      :positionName="positionName"
    />

    <FilePreviewDialog
      v-model="previewVisible"
      :file="previewFile"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Document, Refresh, TrendCharts, Calendar, Warning, CircleCheck, WarningFilled, QuestionFilled, ChatDotRound, Operation, List, EditPen } from '@element-plus/icons-vue'
import CandidateActionDialog from './CandidateActionDialog.vue'
import FlowDetailDialog from './FlowDetailDialog.vue'
import JDExtraDialog from './JDExtraDialog.vue'
import FilePreviewDialog from './FilePreviewDialog.vue'

const props = defineProps({
  candidate: Object,
  parsing: Boolean,
  evaluating: Boolean,
  positionArchived: Boolean,
  positionArchiveReason: String,
  positionId: Number,
  positionName: String
})

const emit = defineEmits(['view-jd', 'view-original', 'parse', 'evaluate', 'schedule'])

const activePanels = ref(['skills', 'experience', 'education', 'work', 'projects'])
const previewVisible = ref(false)
const previewFile = ref(null)
const actionDialogVisible = ref(false)
const flowDetailVisible = ref(false)
const jdExtraDialogVisible = ref(false)

const viewOriginal = () => {
  if (props.candidate) {
    console.log('预览文件数据:', props.candidate)
    previewFile.value = props.candidate
    previewVisible.value = true
  }
}

const showActionDialog = () => {
  actionDialogVisible.value = true
}

const showFlowDetail = () => {
  flowDetailVisible.value = true
}

const showJdExtraDialog = () => {
  jdExtraDialogVisible.value = true
}

const handleActionSuccess = (result) => {
  emit('success', result)
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

const matchReasons = computed(() => {
  if (!props.candidate) return []
  return evaluationData.value.match_reasons || []
})

const gapAnalysis = computed(() => {
  if (!props.candidate) return []
  return evaluationData.value.gap_analysis || []
})

const uncertainPoints = computed(() => {
  if (!props.candidate) return []
  return evaluationData.value.uncertain || []
})

const hasParsedData = computed(() => {
  if (!props.candidate) return false
  return props.candidate.parsed_data_obj && Object.keys(props.candidate.parsed_data_obj).length > 0
})

const getAvatarText = (name) => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

const getAvatarColor = (status) => {
  const colors = {
    '待沟通': 'linear-gradient(135deg, #e6a23c 0%, #f5a623 100%)',
    '待面试': 'linear-gradient(135deg, #409eff 0%, #67c4ff 100%)',
    '面试中': 'linear-gradient(135deg, #67c23a 0%, #85ce61 100%)',
    '已通过': 'linear-gradient(135deg, #67c23a 0%, #95d475 100%)',
    '已拒绝': 'linear-gradient(135deg, #f56c6c 0%, #f89898 100%)',
    '未解析': 'linear-gradient(135deg, #909399 0%, #b4b4b8 100%)',
    '已解析': 'linear-gradient(135deg, #409eff 0%, #79bbff 100%)'
  }
  return colors[status] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}

const getExperienceText = (candidate) => {
  const pd = parsedData.value
  const experiences = []
  if (pd.latest_title) experiences.push(pd.latest_title)
  if (pd.latest_company) experiences.push(pd.latest_company)
  if (pd.years_experience) experiences.push(`${pd.years_experience}年`)
  return experiences.join(' · ') || '暂无经历'
}

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
</script>

<style scoped>
.candidate-detail-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-top {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.candidate-avatar-lg {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-info h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.subtitle-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subtitle {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.archived-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: #fdf6ec;
  border-radius: 6px;
  color: #e6a23c;
  font-size: 13px;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.action-bar {
  margin-bottom: 20px;
}

.match-summary-section {
  margin-bottom: 20px;
}

/* 弱化的匹配度显示 */
.match-score-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.score-text {
  font-size: 13px;
  color: #909399;
}

.score-number {
  font-size: 14px;
  font-weight: 600;
}

.score-number.match-high { color: #67c23a; }
.score-number.match-medium { color: #e6a23c; }
.score-number.match-low { color: #f56c6c; }
.score-number.match-none { color: #909399; }

.score-level-text {
  font-size: 12px;
  color: #909399;
}

/* 突出的分析卡片 */
.analysis-cards-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.analysis-card-compact {
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.analysis-card-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.analysis-card-compact .card-header-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.analysis-card-compact .card-list-compact {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.analysis-card-compact .card-list-compact li {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 12px;
  position: relative;
}

.analysis-card-compact .card-list-compact li:before {
  content: "•";
  position: absolute;
  left: 0;
  font-weight: bold;
}

/* 匹配点卡片 - 绿色主题 */
.match-card-compact {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f7e8 100%);
  border: 1px solid #b7eb8f;
}

.match-card-compact .card-header-compact {
  color: #389e0d;
  border-bottom-color: rgba(56, 158, 13, 0.1);
}

.match-card-compact .card-list-compact li:before {
  color: #52c41a;
}

/* 待确认点卡片 - 橙色主题，突出显示 */
.uncertain-card-compact {
  background: linear-gradient(135deg, #fff7e6 0%, #fff2d3 100%);
  border: 1px solid #ffd591;
  position: relative;
}

.uncertain-card-compact::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, #faad14 0%, transparent 70%);
  border-radius: 0 12px 0 12px;
  opacity: 0.2;
}

.uncertain-card-compact .card-header-compact {
  color: #d46b08;
  border-bottom-color: rgba(212, 107, 8, 0.1);
  position: relative;
}

.uncertain-card-compact .card-list-compact li {
  font-weight: 500;
  padding-left: 16px;
}

.uncertain-card-compact .card-list-compact li:before {
  content: "?";
  color: #faad14;
  font-weight: bold;
  font-size: 14px;
}

/* 风险点卡片 - 红色主题 */
.risk-card-compact {
  background: linear-gradient(135deg, #fff2f0 0%, #ffe7e7 100%);
  border: 1px solid #ffb3b3;
}

.risk-card-compact .card-header-compact {
  color: #cf1322;
  border-bottom-color: rgba(207, 19, 34, 0.1);
}

.risk-card-compact .card-list-compact li:before {
  color: #ff4d4f;
}

.summary-section {
  background: linear-gradient(135deg, #f6ffed 0%, #f0f9e8 100%);
  border: 1px solid #d3f261;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: #52c41a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.summary-text {
  margin: 0;
  font-size: 14px;
  color: #303133;
  line-height: 1.7;
}

.questions-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 14px 18px;
}

.question-text {
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}

.question-reason {
  font-size: 12px;
  color: #909399;
}

.info-collapse {
  margin-top: 20px;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  margin: 0;
}

.no-data-text {
  color: #c0c4cc;
  font-size: 13px;
}

.companies-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.company-tag {
  margin: 0;
}

.education-content,
.work-content,
.project-content,
.experience-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.archive-reason-section {
  margin-top: 20px;
  padding: 14px 18px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 8px;
}

.archive-reason-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #f56c6c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .match-score-compact {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .analysis-cards-compact {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .analysis-card-compact {
    padding: 14px 16px;
  }
  
  .analysis-card-compact .card-header-compact {
    font-size: 14px;
    margin-bottom: 10px;
  }
  
  .analysis-card-compact .card-list-compact li {
    font-size: 12px;
    margin-bottom: 6px;
  }
  
  .summary-section {
    padding: 14px 16px;
  }
  
  .summary-text {
    font-size: 13px;
  }
}
</style>
