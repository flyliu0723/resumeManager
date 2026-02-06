<template>
  <div class="dashboard-container">
    <h1 class="dashboard-title">招聘管理中心</h1>
    
    <div class="dashboard-layout">
      <!-- 左侧栏 - 操作动态 -->
      <div class="left-panel">
        <!-- 实时动态流 -->
        <div class="activity-feed">
          <div class="feed-header">
            <h3 class="feed-title">操作动态</h3>
            <el-tag size="small" type="info">近7天</el-tag>
          </div>
          <div class="feed-items" v-loading="loadingActivities">
            <div class="feed-item" v-for="(item, index) in activityItems" :key="index">
              <div class="feed-time">{{ formatTime(item.time) }}</div>
              <div class="feed-content">
                <div class="feed-avatar" :style="{ backgroundColor: item.avatarColor }">{{ item.avatar }}</div>
                <div class="feed-text">
                  <span :class="['stage-badge', item.stageType]" :style="{ backgroundColor: item.stageColor + '20', color: item.stageColor, borderColor: item.stageColor }">
                    {{ item.stageLabel }}
                  </span>
                  {{ item.action }}
                </div>
              </div>
            </div>
          </div>
          <div class="feed-more" v-if="activityItems.length > 0">
            <el-button link size="small" @click="refreshAllData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
          <el-empty v-else description="暂无动态" :image-size="80" />
        </div>
      </div>
      
      <!-- 右侧栏 - 3份 -->
      <div class="right-panel">
        <!-- 招聘漏斗效率看板 -->
        <div class="funnel-card">
          <div class="funnel-header">
            <h3 class="chart-title">招聘漏斗效率看板</h3>
            <div class="funnel-metrics" v-if="funnelMetrics.conversionRate > 0">
              <el-tag size="small" type="success">转化率 {{ funnelMetrics.conversionRate }}%</el-tag>
              <el-tag size="small" type="warning">平均 {{ funnelMetrics.avgDays }} 天</el-tag>
              <el-tag size="small" type="danger">流失率 {{ funnelMetrics.dropOffRate }}%</el-tag>
            </div>
          </div>
          <div class="funnel-stages" v-loading="loadingFunnel">
            <div class="funnel-stage">
              <div class="stage-header">
                <h4 class="stage-title">
                  <el-icon><Document /></el-icon>
                  简历筛选
                  <el-tooltip :content="`共 ${funnelData.resumeScreening.length} 位候选人`" placement="top">
                    <el-tag size="small" type="info" class="count-tag">{{ funnelData.resumeScreening.length }}</el-tag>
                  </el-tooltip>
                </h4>
              </div>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.resumeScreening.slice(0, 5)" :key="index">
                  <div class="candidate-avatar" :style="{ backgroundColor: candidate.avatarColor }">{{ candidate.initials }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.candidateName }}</div>
                    <div class="candidate-position">{{ candidate.positionTitle }}</div>
                  </div>
                  <div class="candidate-days" v-if="candidate.daysInStage > 0">{{ candidate.daysInStage }}天</div>
                </div>
                <div class="candidate-more" v-if="funnelData.resumeScreening.length > 5" @click="viewAllCandidates('resume_screening')">
                  <el-button link type="primary" size="small">
                    还有 {{ funnelData.resumeScreening.length - 5 }} 人，查看全部
                  </el-button>
                </div>
                <el-empty v-if="funnelData.resumeScreening.length === 0" description="暂无数据" :image-size="60" />
              </div>
            </div>
            
            <div class="funnel-stage">
              <div class="stage-header">
                <h4 class="stage-title">
                  <el-icon><UserFilled /></el-icon>
                  面试中
                  <el-tooltip :content="`共 ${funnelData.interviewing.length} 位候选人`" placement="top">
                    <el-tag size="small" type="primary" class="count-tag">{{ funnelData.interviewing.length }}</el-tag>
                  </el-tooltip>
                </h4>
              </div>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.interviewing.slice(0, 5)" :key="index">
                  <div class="candidate-avatar" :style="{ backgroundColor: candidate.avatarColor }">{{ candidate.initials }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.candidateName }}</div>
                    <div class="candidate-position">{{ candidate.positionTitle }}</div>
                  </div>
                  <div class="candidate-status" :class="candidate.subStatus">
                    {{ getSubStatusLabel(candidate.subStatus) }}
                  </div>
                </div>
                <div class="candidate-more" v-if="funnelData.interviewing.length > 5" @click="viewAllCandidates('interviewing')">
                  <el-button link type="primary" size="small">
                    还有 {{ funnelData.interviewing.length - 5 }} 人，查看全部
                  </el-button>
                </div>
                <el-empty v-if="funnelData.interviewing.length === 0" description="暂无数据" :image-size="60" />
              </div>
            </div>
            
            <div class="funnel-stage">
              <div class="stage-header">
                <h4 class="stage-title">
                  <el-icon><Money /></el-icon>
                  谈薪中
                  <el-tooltip :content="`共 ${funnelData.salaryNegotiation.length} 位候选人`" placement="top">
                    <el-tag size="small" type="warning" class="count-tag">{{ funnelData.salaryNegotiation.length }}</el-tag>
                  </el-tooltip>
                </h4>
              </div>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.salaryNegotiation.slice(0, 5)" :key="index">
                  <div class="candidate-avatar" :style="{ backgroundColor: candidate.avatarColor }">{{ candidate.initials }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.candidateName }}</div>
                    <div class="candidate-position">{{ candidate.positionTitle }}</div>
                  </div>
                  <div class="candidate-status" :class="candidate.subStatus">
                    {{ getSubStatusLabel(candidate.subStatus) }}
                  </div>
                </div>
                <div class="candidate-more" v-if="funnelData.salaryNegotiation.length > 5" @click="viewAllCandidates('salary_negotiation')">
                  <el-button link type="primary" size="small">
                    还有 {{ funnelData.salaryNegotiation.length - 5 }} 人，查看全部
                  </el-button>
                </div>
                <el-empty v-if="funnelData.salaryNegotiation.length === 0" description="暂无数据" :image-size="60" />
              </div>
            </div>
            
            <div class="funnel-stage">
              <div class="stage-header">
                <h4 class="stage-title">
                  <el-icon><CircleCheck /></el-icon>
                  已成单
                  <el-tooltip :content="`共 ${funnelData.closed.length} 位候选人`" placement="top">
                    <el-tag size="small" type="success" class="count-tag">{{ funnelData.closed.length }}</el-tag>
                  </el-tooltip>
                </h4>
              </div>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.closed.slice(0, 5)" :key="index">
                  <div class="candidate-avatar" :style="{ backgroundColor: candidate.avatarColor }">{{ candidate.initials }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.candidateName }}</div>
                    <div class="candidate-position">{{ candidate.positionTitle }}</div>
                  </div>
                  <div class="candidate-status" :class="candidate.subStatus">
                    {{ getSubStatusLabel(candidate.subStatus) }}
                  </div>
                </div>
                <div class="candidate-more" v-if="funnelData.closed.length > 5" @click="viewAllCandidates('closed')">
                  <el-button link type="primary" size="small">
                    还有 {{ funnelData.closed.length - 5 }} 人，查看全部
                  </el-button>
                </div>
                <el-empty v-if="funnelData.closed.length === 0" description="暂无数据" :image-size="60" />
              </div>
            </div>
            
            <div class="funnel-stage">
              <div class="stage-header">
                <h4 class="stage-title">
                  <el-icon><CircleClose /></el-icon>
                  已结束
                  <el-tooltip :content="`共 ${funnelData.rejected.length} 位候选人`" placement="top">
                    <el-tag size="small" type="danger" class="count-tag">{{ funnelData.rejected.length }}</el-tag>
                  </el-tooltip>
                </h4>
              </div>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.rejected.slice(0, 5)" :key="index">
                  <div class="candidate-avatar" :style="{ backgroundColor: candidate.avatarColor }">{{ candidate.initials }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.candidateName }}</div>
                    <div class="candidate-position">{{ candidate.positionTitle }}</div>
                  </div>
                  <div class="candidate-status rejected">已结束</div>
                </div>
                <div class="candidate-more" v-if="funnelData.rejected.length > 5" @click="viewAllCandidates('rejected')">
                  <el-button link type="primary" size="small">
                    还有 {{ funnelData.rejected.length - 5 }} 人，查看全部
                  </el-button>
                </div>
                <el-empty v-if="funnelData.rejected.length === 0" description="暂无数据" :image-size="60" />
              </div>
            </div>
          </div>
        </div>
        
        <!-- 招聘热度分析图 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">各级岗位热度</h3>
            <el-radio-group v-model="heatChartType" size="small">
              <el-radio-button label="count">人数</el-radio-button>
              <el-radio-button label="conversion">转化率</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="heatChartRef" class="chart-container"></div>
        </div>
        
        <!-- 图表行 -->
        <div class="charts-row">
          <!-- 简历来源分布 -->
          <div class="chart-card donut-chart">
            <h3 class="chart-title">简历来源分布</h3>
            <div ref="sourceChartRef" class="chart-container"></div>
          </div>
          
          <!-- 近30天面试趋势 -->
          <div class="chart-card line-chart">
            <h3 class="chart-title">近30天面试趋势</h3>
            <div ref="trendChartRef" class="chart-container"></div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { Document, UserFilled, Money, CircleCheck, CircleClose, Refresh } from '@element-plus/icons-vue'
import { useDashboardData } from '../composables/useDashboardData.js'
import * as echarts from 'echarts'

// 使用自定义Hook获取数据 - 新状态系统
const { 
  activityItems, 
  heatData, 
  sourceData, 
  trendData, 
  funnelData, 
  funnelMetrics,
  loadingActivities,
  loadingFunnel,
  refreshAllData 
} = useDashboardData()

// 图表类型切换
const heatChartType = ref('count')

// 图表引用
const heatChartRef = ref(null)
const sourceChartRef = ref(null)
const trendChartRef = ref(null)

// 图表实例
let heatChart = null
let sourceChart = null
let trendChart = null

// 时间格式化
function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

// 获取子状态标签
function getSubStatusLabel(subStatus) {
  const labels = {
    'pending_review': '待审核',
    'review_passed': '已通过',
    'review_rejected': '已拒绝',
    'round_pending': '待安排',
    'round_scheduled': '已安排',
    'round_passed': '通过',
    'round_rejected': '未通过',
    'negotiating': '谈薪中',
    'approval_pending': '待审批',
    'approved': '已批准',
    'onboarded': '已入职',
    'pending_onboard': '待入职',
    'rejected': '已结束',
    'abandoned': '已放弃'
  }
  return labels[subStatus] || subStatus
}

// 初始化热度图表
function initHeatChart() {
  if (heatChartRef.value) {
    heatChart = echarts.init(heatChartRef.value)
    updateHeatChart()
  }
}

// 更新热度图表 - 柱状图或折线图展示各阶段数据
function updateHeatChart() {
  if (!heatChart) return

  const data = heatData.value || []
  const isCount = heatChartType.value === 'count'

  // 阶段类型
  const stageTypes = ['简历筛选', '面试中', '谈薪中', '已成单']
  const stageColors = ['#909399', '#409EFF', '#E6A23C', '#67C23A']

  // 提取职位名称作为x轴
  const positions = data.map(item => item.name || item.level)

  if (isCount) {
    // 人数模式：堆叠柱状图
    const series = stageTypes.map((stageType, index) => ({
      name: stageType,
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      data: data.map(item => {
        const stage = item.bars?.find(bar => bar.type === stageType)
        return stage?.count || 0
      }),
      itemStyle: {
        color: stageColors[index]
      }
    }))

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: stageTypes,
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: positions,
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: '数量'
      },
      series: series
    }

    heatChart.setOption(option, true)
  } else {
    // 转化率模式：折线图（以简历筛选为基数100%）
    const interviewData = data.map(item => {
      const stage = item.bars?.find(bar => bar.type === '面试中')
      return stage?.rate || 0
    })

    const closedData = data.map(item => {
      const stage = item.bars?.find(bar => bar.type === '已成单')
      return stage?.rate || 0
    })

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const positionName = params[0].name
          const posData = data.find(item => item.name === positionName) || {}
          const total = posData.totalResumes || 0
          const interview = posData.interviewCount || 0
          const closed = posData.closedCount || 0

          let result = `<div style="font-weight:600;margin-bottom:8px">${positionName}</div>`
          result += `<div style="margin-bottom:4px">📋 简历总数: <strong>${total}</strong> (分母)</div>`
          result += `<div style="color:#409EFF;margin-bottom:4px">🎯 面试: ${interview}人 → ${params[0].value}%</div>`
          result += `<div style="color:#67C23A">✅ 成单: ${closed}人 → ${params[1].value}%</div>`
          return result
        }
      },
      legend: {
        data: ['面试转化率', '成单转化率'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: positions,
        boundaryGap: false,
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: '转化率(%)',
        max: 100
      },
      series: [
        {
          name: '面试转化率',
          type: 'line',
          data: interviewData,
          smooth: true,
          itemStyle: { color: '#409EFF' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
                { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
              ]
            }
          }
        },
        {
          name: '成单转化率',
          type: 'line',
          data: closedData,
          smooth: true,
          itemStyle: { color: '#67C23A' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
                { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
              ]
            }
          }
        }
      ]
    }

    heatChart.setOption(option, true)
  }
}

// 初始化来源图表
function initSourceChart() {
  if (sourceChartRef.value) {
    sourceChart = echarts.init(sourceChartRef.value)
    updateSourceChart()
  }
}

// 更新来源图表
function updateSourceChart() {
  if (!sourceChart) return
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '简历来源',
        type: 'pie',
        radius: '70%',
        data: sourceData.value.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color
          }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  sourceChart.setOption(option)
}

// 初始化趋势图表
function initTrendChart() {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    updateTrendChart()
  }
}

// 更新趋势图表
function updateTrendChart() {
  if (!trendChart) return
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.value.map(item => item.date.substring(5))
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '面试数',
        type: 'line',
        stack: 'Total',
        data: trendData.value.map(item => item.count),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(64, 158, 255, 0.3)'
            }, {
              offset: 1, color: 'rgba(64, 158, 255, 0.1)'
            }]
          }
        },
        lineStyle: {
          color: '#409EFF'
        },
        itemStyle: {
          color: '#409EFF'
        }
      }
    ]
  }

  trendChart.setOption(option)
}

// 响应式调整
function handleResize() {
  heatChart?.resize()
  sourceChart?.resize()
  trendChart?.resize()
}

// 监听数据变化
watch(heatData, () => {
  nextTick(() => {
    updateHeatChart()
  })
}, { deep: true })

watch(heatChartType, () => {
  nextTick(() => {
    updateHeatChart()
  })
})

watch(sourceData, () => {
  nextTick(() => {
    updateSourceChart()
  })
}, { deep: true })

watch(trendData, () => {
  nextTick(() => {
    updateTrendChart()
  })
}, { deep: true })

// 初始化
onMounted(() => {
  nextTick(() => {
    initHeatChart()
    initSourceChart()
    initTrendChart()
  })
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  heatChart?.dispose()
  sourceChart?.dispose()
  trendChart?.dispose()
})
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  background-color: #F5F7FA;
  height: 100vh;
  overflow-y: auto;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr 4fr;
  gap: 24px;
}

/* 左侧栏样式 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 活动动态流 */
.activity-feed {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  flex: 1;
  min-height: 400px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.feed-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.feed-items {
  margin-bottom: 16px;
}

.feed-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.feed-item:last-child {
  border-bottom: none;
}

.feed-time {
  font-size: 12px;
  color: #909399;
  min-width: 50px;
  flex-shrink: 0;
}

.feed-content {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.feed-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409EFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.feed-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.stage-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
  white-space: nowrap;
}

.feed-more {
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

/* 右侧栏样式 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 漏斗看板 */
.funnel-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.funnel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.funnel-metrics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.funnel-stages {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.funnel-stage {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #ebeef5;
  transition: border-color 0.2s;
}

.funnel-stage:hover {
  border-color: #409EFF;
}

.stage-header {
  margin-bottom: 12px;
}

.stage-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-title .el-icon {
  font-size: 16px;
  color: #909399;
}

/* 数量标签样式 */
.count-tag {
  font-weight: 600;
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 10px;
}

.stage-title .count-tag {
  margin-left: auto;
}

/* 查看更多按钮样式 */
.candidate-more {
  text-align: center;
  padding: 8px 0;
  margin-top: 8px;
  border-top: 1px dashed #e4e7ed;
  cursor: pointer;
}

.stage-candidates {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.candidate-card {
  background: white;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.candidate-card:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.candidate-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #409EFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.candidate-info {
  flex: 1;
  min-width: 0;
}

.candidate-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.candidate-position {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.candidate-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  flex-shrink: 0;
}

.candidate-status.pending_review {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.candidate-status.round_pending {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.candidate-status.round_scheduled {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.candidate-status.approval_pending {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.candidate-status.pending_onboard {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.candidate-status.onboarded {
  background: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.candidate-status.rejected,
.candidate-status.abandoned {
  background: rgba(245, 108, 108, 0.1);
  color: #F56C6C;
}

.candidate-days {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.candidate-more {
  text-align: center;
  font-size: 12px;
  color: #909399;
  padding: 8px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.candidate-more:hover {
  background: #f5f7fa;
}

/* 图表卡片通用样式 */
.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

/* 图表容器 */
.chart-container {
  width: 100%;
  height: 300px;
}

/* 图表行 */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .funnel-stages {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
  
  .funnel-stages {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .funnel-stages {
    grid-template-columns: 1fr;
  }
  
  .funnel-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style>