<template>
  <div class="recruit-log-container">
    <div class="log-header">
      <h1 class="log-title">招聘复盘与周报</h1>
      <div class="log-actions">
        <el-radio-group v-model="activeTab" size="default">
          <el-radio-button label="self">个人复盘</el-radio-button>
          <el-radio-button label="boss">老板日志</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div v-show="activeTab === 'self'" class="tab-content">
      <div class="dashboard-grid">
        <div class="grid-row">
          <div class="card bottleneck-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><Aim /></el-icon>
                损耗诊断
              </h3>
              <el-tag type="info" size="small">识别瓶颈阶段</el-tag>
            </div>
            <div class="card-body" v-loading="loadingBottleneck">
              <div v-if="bottleneckData.stages.length > 0" class="bottleneck-stages">
                <div 
                  v-for="stage in bottleneckData.stages" 
                  :key="stage.stage"
                  class="stage-item"
                >
                  <div class="stage-header">
                    <span class="stage-name">{{ stage.stageLabel }}</span>
                    <span 
                      class="stage-rate"
                      :class="getDropRateClass(stage.dropRate)"
                    >
                      {{ stage.dropRate }}%
                    </span>
                  </div>
                  <el-progress 
                    :percentage="stage.dropRate" 
                    :color="getDropRateColor(stage.dropRate)"
                    :stroke-width="8"
                    :show-text="false"
                  />
                  <div class="stage-meta">
                    <span>{{ stage.totalCandidates }}人</span>
                    <span class="rejected">{{ stage.rejectedCount }}人淘汰</span>
                  </div>
                  <div class="stage-diagnosis" :class="getDiagnosisClass(stage.diagnosis)">
                    {{ stage.diagnosis }}
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无数据" :image-size="60" />
            </div>
          </div>

          <div class="card warning-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><WarningFilled /></el-icon>
                候选人预警中心
              </h3>
              <el-badge :value="warningsData.stats.total" :hidden="warningsData.stats.total === 0">
                <el-tag :type="getWarningLevelType(warningsData.stats)" size="small">
                  {{ warningsData.stats.critical > 0 ? '紧急' : '正常' }}
                </el-tag>
              </el-badge>
            </div>
            <div class="card-body" v-loading="loadingWarnings">
              <div v-if="warningsData.warnings.length > 0" class="warning-list">
                <div 
                  v-for="warning in warningsData.warnings.slice(0, 5)" 
                  :key="warning.matchId"
                  class="warning-item"
                  :class="`level-${warning.urgentLevel}`"
                >
                  <div class="warning-info">
                    <div class="warning-name">{{ warning.candidateName }}</div>
                    <div class="warning-position">{{ warning.positionName }}</div>
                  </div>
                  <div class="warning-meta">
                    <el-tag :type="getUrgentLevelType(warning.urgentLevel)" size="small">
                      {{ warning.daysSinceUpdate }}天无进展
                    </el-tag>
                    <span class="warning-score">{{ warning.matchScore }}分</span>
                  </div>
                  <div class="warning-suggestion">
                    {{ warning.actionSuggestion }}
                  </div>
                </div>
                <div v-if="warningsData.warnings.length > 5" class="warning-more">
                  <el-button link type="primary" size="small">
                    还有 {{ warningsData.warnings.length - 5 }} 个预警
                  </el-button>
                </div>
              </div>
              <el-empty v-else description="暂无预警" :image-size="60" />
            </div>
          </div>
        </div>

        <div class="grid-row">
          <div class="card roi-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><TrendCharts /></el-icon>
                渠道ROI分析
              </h3>
            </div>
            <div class="card-body" v-loading="loadingROI">
              <div v-if="channelROIData.channels.length > 0" class="roi-chart">
                <div class="roi-bars">
                  <div 
                    v-for="channel in channelROIData.channels.slice(0, 5)" 
                    :key="channel.sourceCode"
                    class="roi-item"
                  >
                    <div class="roi-channel">
                      <span class="channel-name">{{ channel.sourceName }}</span>
                      <span class="channel-efficiency" :class="getEfficiencyClass(channel.efficiency)">
                        效率 {{ (channel.efficiency || 0).toFixed(1) }}
                      </span>
                    </div>
                    <div class="roi-metrics">
                      <div class="metric-row">
                        <span class="metric-label">简历</span>
                        <el-progress 
                          :percentage="parseFloat(channel.interviewRate)" 
                          :stroke-width="10"
                          :show-text="false"
                          color="#409EFF"
                        />
                        <span class="metric-value">{{ channel.interviewRate }}%→面试</span>
                      </div>
                      <div class="metric-row">
                        <span class="metric-label">成单</span>
                        <el-progress 
                          :percentage="parseFloat(channel.closeRate)" 
                          :stroke-width="10"
                          :show-text="false"
                          color="#67C23A"
                        />
                        <span class="metric-value">{{ channel.closeRate }}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无渠道数据" :image-size="60" />
            </div>
          </div>

          <div class="card workload-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><DataAnalysis /></el-icon>
                工作量统计
              </h3>
              <el-radio-group v-model="workloadPeriod" size="small" @change="refreshWorkload">
                <el-radio-button label="week">本周</el-radio-button>
                <el-radio-button label="month">本月</el-radio-button>
              </el-radio-group>
            </div>
            <div class="card-body" v-loading="loadingWorkload">
              <div class="workload-stats">
                <div class="stat-item">
                  <div class="stat-value">{{ workloadData.stats.resumesReviewed }}</div>
                  <div class="stat-label">筛选简历</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ workloadData.stats.deepCommunications }}</div>
                  <div class="stat-label">深度沟通</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ workloadData.stats.interviewsScheduled }}</div>
                  <div class="stat-label">安排面试</div>
                </div>
                <div class="stat-item highlight">
                  <div class="stat-value">{{ workloadData.stats.totalProcessed }}</div>
                  <div class="stat-label">总计处理</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'boss'" class="tab-content">
      <div class="dashboard-grid">
        <div class="grid-row">
          <div class="card progress-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><Odometer /></el-icon>
                核心职位进度
              </h3>
            </div>
            <div class="card-body" v-loading="loadingProgress">
              <div v-if="positionProgressData.topPositions.length > 0" class="progress-list">
                <div 
                  v-for="position in positionProgressData.topPositions" 
                  :key="position.positionId"
                  class="progress-item"
                >
                  <div class="progress-header">
                    <span class="position-name">{{ position.positionName }}</span>
                    <span class="position-progress">{{ position.progress }}%</span>
                  </div>
                  <el-progress 
                    :percentage="position.progress" 
                    :stroke-width="12"
                    :color="getProgressColor(position.progress)"
                  />
                  <div class="progress-stages">
                    <el-tooltip :content="`简历筛选: ${position.stages.resumeScreening}人`">
                      <span class="stage-badge screening">筛 {{ position.stages.resumeScreening }}</span>
                    </el-tooltip>
                    <el-tooltip :content="`面试中: ${position.stages.interviewing}人`">
                      <span class="stage-badge interviewing">面 {{ position.stages.interviewing }}</span>
                    </el-tooltip>
                    <el-tooltip :content="`谈薪中: ${position.stages.salaryNegotiation}人`">
                      <span class="stage-badge salary">谈 {{ position.stages.salaryNegotiation }}</span>
                    </el-tooltip>
                    <el-tooltip :content="`已成单: ${position.stages.closed}人`">
                      <span class="stage-badge closed">成 {{ position.stages.closed }}</span>
                    </el-tooltip>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无职位数据" :image-size="60" />
            </div>
          </div>

          <div class="card feedback-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><Warning /></el-icon>
                市场反馈报告
              </h3>
              <el-tag type="warning" size="small">甩锅神器</el-tag>
            </div>
            <div class="card-body" v-loading="loadingFeedback">
              <div v-if="marketFeedbackData.summary.totalRejections > 0" class="feedback-content">
                <div class="feedback-summary">
                  <div class="summary-item danger">
                    <span class="sum-num">{{ marketFeedbackData.summary.byCategory.salary }}</span>
                    <span class="sum-label">薪资问题</span>
                  </div>
                  <div class="summary-item warning">
                    <span class="sum-num">{{ marketFeedbackData.summary.byCategory.interview }}</span>
                    <span class="sum-label">面试淘汰</span>
                  </div>
                  <div class="summary-item info">
                    <span class="sum-num">{{ marketFeedbackData.summary.byCategory.screening }}</span>
                    <span class="sum-label">简历不合适</span>
                  </div>
                </div>
                <div class="top-reasons">
                  <div class="reasons-title">TOP 拒绝原因</div>
                  <div 
                    v-for="(item, index) in marketFeedbackData.summary.topReasons.slice(0, 3)" 
                    :key="index"
                    class="reason-item"
                  >
                    <span class="reason-rank">{{ index + 1 }}</span>
                    <span class="reason-text">{{ formatReason(item.reason) }}</span>
                    <span class="reason-count">{{ item.count }}次</span>
                  </div>
                </div>
                <div v-if="marketFeedbackData.suggestions.length > 0" class="suggestions">
                  <div 
                    v-for="(suggestion, index) in marketFeedbackData.suggestions" 
                    :key="index"
                    class="suggestion-item"
                    :class="suggestion.priority"
                  >
                    <el-icon><InfoFilled /></el-icon>
                    {{ suggestion.message }}
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无反馈数据" :image-size="60" />
            </div>
          </div>
        </div>

        <div class="grid-row full-width">
          <div class="card report-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><Document /></el-icon>
                本{{ workloadData.periodLabel }}周报
              </h3>
              <el-button type="primary" size="small" @click="refreshReport">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
            <div class="card-body" v-loading="loadingReport">
              <div class="report-content">
                <div class="report-stats">
                  <div class="report-stat">
                    <div class="stat-icon blue">
                      <el-icon><DocumentCopy /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-num">{{ weeklyReportData.stats.resumesReviewed }}</div>
                      <div class="stat-desc">筛选简历</div>
                    </div>
                  </div>
                  <div class="report-stat">
                    <div class="stat-icon green">
                      <el-icon><ChatDotRound /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-num">{{ weeklyReportData.stats.interviewsScheduled }}</div>
                      <div class="stat-desc">安排面试</div>
                    </div>
                  </div>
                  <div class="report-stat">
                    <div class="stat-icon orange">
                      <el-icon><Medal /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-num">{{ weeklyReportData.stats.offersSent }}</div>
                      <div class="stat-desc">发送Offer</div>
                    </div>
                  </div>
                  <div class="report-stat">
                    <div class="stat-icon purple">
                      <el-icon><Opportunity /></el-icon>
                    </div>
                    <div class="stat-info">
                      <div class="stat-num">{{ weeklyReportData.inProgressCandidates }}</div>
                      <div class="stat-desc">进行中</div>
                    </div>
                  </div>
                </div>
                <div class="report-sections">
                  <div class="report-section">
                    <h4 class="section-title">瓶颈分析</h4>
                    <div class="bottleneck-bars">
                      <div class="bn-item">
                        <span class="bn-label">简历筛选淘汰</span>
                        <el-progress 
                          :percentage="getBottleneckPercent('resumeScreening')" 
                          :stroke-width="10"
                          :show-text="false"
                          color="#909399"
                        />
                        <span class="bn-count">{{ weeklyReportData.bottleneck.resumeScreening }}人</span>
                      </div>
                      <div class="bn-item">
                        <span class="bn-label">面试淘汰</span>
                        <el-progress 
                          :percentage="getBottleneckPercent('interviewing')" 
                          :stroke-width="10"
                          :show-text="false"
                          color="#409EFF"
                        />
                        <span class="bn-count">{{ weeklyReportData.bottleneck.interviewing }}人</span>
                      </div>
                      <div class="bn-item">
                        <span class="bn-label">谈薪失败</span>
                        <el-progress 
                          :percentage="getBottleneckPercent('salaryNegotiation')" 
                          :stroke-width="10"
                          :show-text="false"
                          color="#E6A23C"
                        />
                        <span class="bn-count">{{ weeklyReportData.bottleneck.salaryNegotiation }}人</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="daily-report-section">
                  <div class="daily-report-header">
                    <h4 class="section-title">
                      <el-icon><Document /></el-icon>
                      今日日报
                    </h4>
                    <el-button 
                      type="primary" 
                      size="small" 
                      :loading="copying"
                      @click="copyDailyReport"
                    >
                      <el-icon><CopyDocument /></el-icon>
                      {{ copying ? '复制中...' : '一键复制' }}
                    </el-button>
                  </div>
                  <div class="daily-report-content">
                    <div class="daily-stats">
                      <div class="daily-stat">
                        <span class="stat-num">{{ dailyReportData.value?.summary?.resumes ?? 0 }}</span>
                        <span class="stat-label">简历</span>
                      </div>
                      <div class="daily-stat">
                        <span class="stat-num">{{ (dailyReportData.value?.summary?.interviews ?? 0) + (dailyReportData.value?.summary?.offers ?? 0) }}</span>
                        <span class="stat-label">面试/Offer</span>
                      </div>
                      <div class="daily-stat">
                        <span class="stat-num">{{ dailyReportData.value?.summary?.ongoing ?? 0 }}</span>
                        <span class="stat-label">进行中</span>
                      </div>
                    </div>
                    <div class="copy-preview">
                      <el-input
                        :model-value="dailyReportData.value?.copyText || ''"
                        type="textarea"
                        :rows="2"
                        readonly
                        placeholder="点击上方按钮复制日报内容"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Aim, WarningFilled, TrendCharts, DataAnalysis,
  Odometer, Warning, InfoFilled, Refresh,
  DocumentCopy, ChatDotRound, Medal, Opportunity, Document, CopyDocument
} from '@element-plus/icons-vue'
import { useRecruitLog } from '../composables/useRecruitLog'

const {
  bottleneckData,
  warningsData,
  channelROIData,
  workloadData,
  positionProgressData,
  marketFeedbackData,
  weeklyReportData,
  dailyReportData,
  loadingBottleneck,
  loadingWarnings,
  loadingROI,
  loadingWorkload,
  loadingProgress,
  loadingFeedback,
  loadingReport,
  fetchWorkloadStats,
  fetchWeeklyReport,
  fetchDailyReport
} = useRecruitLog()

const activeTab = ref('self')
const workloadPeriod = ref('week')
const copying = ref(false)

const refreshWorkload = () => {
  fetchWorkloadStats(workloadPeriod.value)
}

const copyDailyReport = async () => {
  if (!dailyReportData.value?.copyText) {
    await fetchDailyReport()
  }
  
  copying.value = true
  try {
    await navigator.clipboard.writeText(dailyReportData.value?.copyText || '')
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  } finally {
    copying.value = false
  }
}

const refreshReport = () => {
  fetchWeeklyReport(workloadPeriod.value)
}

const getDropRateClass = (rate) => {
  if (rate > 50) return 'danger'
  if (rate > 30) return 'warning'
  return 'success'
}

const getDropRateColor = (rate) => {
  if (rate > 50) return '#F56C6C'
  if (rate > 30) return '#E6A23C'
  return '#67C23A'
}

const getDiagnosisClass = (diagnosis) => {
  if (diagnosis.includes('过高') || diagnosis.includes('偏高')) return 'warning'
  if (diagnosis.includes('正常')) return 'success'
  return ''
}

const getWarningLevelType = (stats) => {
  if (stats.critical > 0) return 'danger'
  if (stats.high > 0) return 'warning'
  return 'success'
}

const getUrgentLevelType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: 'info', normal: '' }
  return map[level] || ''
}

const getEfficiencyClass = (efficiency) => {
  if (efficiency > 50) return 'high'
  if (efficiency > 20) return 'medium'
  return 'low'
}

const getProgressColor = (progress) => {
  if (progress >= 80) return '#67C23A'
  if (progress >= 50) return '#409EFF'
  if (progress >= 20) return '#E6A23C'
  return '#909399'
}

const formatReason = (reason) => {
  const reasonMap = {
    salary_expectation_high: '薪资期望过高',
    salary_not_agree: '薪资未达成一致',
    technical_not_pass: '技术面试未通过',
    interview_rejected: '面试未通过',
    candidate_reject_offer: '候选人拒绝Offer',
    experience_not_enough: '经验不足',
    skill_not_match: '技能不匹配',
    culture_not_match: '文化价值观不匹配',
    got_other_offer: '拿到其他Offer',
    benefit_not_satisfied: '福利不满意'
  }
  return reasonMap[reason] || reason || '未说明原因'
}

const getBottleneckPercent = (type) => {
  const stats = weeklyReportData.value?.stats || {}
  const bottleneck = weeklyReportData.value?.bottleneck || {}
  const totalRejections = stats.rejections || 0
  const count = bottleneck[type] || 0
  
  if (totalRejections === 0) return 0
  return Math.min((count / totalRejections) * 100, 100)
}

watch(activeTab, (newVal) => {
  if (newVal === 'boss') {
    if (!weeklyReportData.value?.generatedAt) {
      fetchWeeklyReport(workloadPeriod.value)
    }
    if (!dailyReportData.value?.copyText) {
      fetchDailyReport()
    }
  }
})
</script>

<style scoped>
.recruit-log-container {
  padding: 24px;
  background-color: #F5F7FA;
  height: 100vh;
  overflow: auto;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.log-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.grid-row.full-width {
  grid-template-columns: 1fr;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-body {
  min-height: 200px;
}

.bottleneck-stages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stage-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stage-name {
  font-weight: 500;
  color: #303133;
}

.stage-rate {
  font-weight: 600;
  font-size: 16px;
}

.stage-rate.danger { color: #F56C6C; }
.stage-rate.warning { color: #E6A23C; }
.stage-rate.success { color: #67C23A; }

.stage-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.stage-meta .rejected {
  color: #F56C6C;
}

.stage-diagnosis {
  font-size: 12px;
  color: #606266;
  margin-top: 8px;
  padding: 8px;
  background: #f0f9eb;
  border-radius: 4px;
}

.stage-diagnosis.warning {
  background: #fdf6ec;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warning-item {
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #909399;
  background: #f9f9f9;
}

.warning-item.level-critical {
  border-left-color: #F56C6C;
  background: #fef0f0;
}

.warning-item.level-high {
  border-left-color: #E6A23C;
  background: #fdf6ec;
}

.warning-item.level-medium {
  border-left-color: #409EFF;
  background: #ecf5ff;
}

.warning-info {
  margin-bottom: 8px;
}

.warning-name {
  font-weight: 500;
  color: #303133;
}

.warning-position {
  font-size: 12px;
  color: #909399;
}

.warning-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.warning-score {
  font-size: 12px;
  color: #909399;
}

.warning-suggestion {
  font-size: 12px;
  color: #E6A23C;
  font-style: italic;
}

.warning-more {
  text-align: center;
  padding: 8px;
}

.roi-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.roi-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.roi-channel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.channel-name {
  font-weight: 500;
}

.channel-efficiency {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.channel-efficiency.high { background: #f0f9eb; color: #67C23A; }
.channel-efficiency.medium { background: #fdf6ec; color: #E6A23C; }
.channel-efficiency.low { background: #fef0f0; color: #F56C6C; }

.metric-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  width: 40px;
}

.metric-value {
  font-size: 12px;
  color: #606266;
  width: 100px;
  text-align: right;
}

.workload-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.stat-item.highlight {
  background: #ecf5ff;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-item.highlight .stat-value {
  color: #409EFF;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.position-name {
  font-weight: 500;
}

.position-progress {
  font-weight: 600;
  color: #409EFF;
}

.progress-stages {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.stage-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.stage-badge.screening { background: #f4f4f5; color: #909399; }
.stage-badge.interviewing { background: #ecf5ff; color: #409EFF; }
.stage-badge.salary { background: #fdf6ec; color: #E6A23C; }
.stage-badge.closed { background: #f0f9eb; color: #67C23A; }

.feedback-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
}

.summary-item.danger { background: #fef0f0; }
.summary-item.warning { background: #fdf6ec; }
.summary-item.info { background: #ecf5ff; }

.sum-num {
  font-size: 24px;
  font-weight: 600;
  display: block;
}

.summary-item.danger .sum-num { color: #F56C6C; }
.summary-item.warning .sum-num { color: #E6A23C; }
.summary-item.info .sum-num { color: #409EFF; }

.sum-label {
  font-size: 12px;
  color: #909399;
}

.top-reasons {
  margin-bottom: 16px;
}

.reasons-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 4px;
}

.reason-rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #409EFF;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reason-text {
  flex: 1;
  font-size: 13px;
}

.reason-count {
  font-size: 12px;
  color: #909399;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #fdf6ec;
  border-radius: 6px;
  font-size: 13px;
  color: #E6A23C;
}

.suggestion-item.high {
  background: #fef0f0;
  color: #F56C6C;
}

.report-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.report-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  flex: 1;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.blue { background: #ecf5ff; color: #409EFF; }
.stat-icon.green { background: #f0f9eb; color: #67C23A; }
.stat-icon.orange { background: #fdf6ec; color: #E6A23C; }
.stat-icon.purple { background: #f4f4f5; color: #909399; }

.stat-num {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-desc {
  font-size: 12px;
  color: #909399;
}

.report-sections {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 12px 0;
}

.bottleneck-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bn-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bn-label {
  width: 100px;
  font-size: 13px;
  color: #606266;
}

.bn-count {
  width: 60px;
  text-align: right;
  font-size: 12px;
  color: #909399;
}

.daily-report-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed #e4e7ed;
}

.daily-report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.daily-report-header .section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.daily-report-content {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
}

.daily-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.daily-stat {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.daily-stat .stat-num {
  font-size: 24px;
  font-weight: 600;
  color: #409EFF;
  display: block;
}

.daily-stat .stat-label {
  font-size: 12px;
  color: #909399;
}

.copy-preview {
  margin-top: 12px;
}

.copy-preview :deep(.el-textarea__inner) {
  background: white;
  font-size: 13px;
  color: #606266;
}

@media (max-width: 1200px) {
  .grid-row {
    grid-template-columns: 1fr;
  }
  
  .workload-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
