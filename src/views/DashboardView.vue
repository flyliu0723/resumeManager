<template>
  <div class="dashboard-container">
    <h1 class="dashboard-title">招聘管理中心</h1>
    
    <div class="dashboard-layout">
      <!-- 左侧栏 - 2份 -->
      <div class="left-panel">
        <!-- 数据统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card blue">
            <div class="stat-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">新增简历</div>
              <div class="stat-value">{{ statsData.resumes.value }}</div>
              <div class="stat-change positive">较昨日 +{{ statsData.resumes.change }}</div>
            </div>
          </div>
          
          <div class="stat-card orange">
            <div class="stat-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">安排面试</div>
              <div class="stat-value">{{ statsData.interviews.value }}</div>
              <div class="stat-change positive">较昨日 +{{ statsData.interviews.change }}</div>
            </div>
          </div>
          
          <div class="stat-card green">
            <div class="stat-icon">
              <el-icon><Trophy /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">完成Offer</div>
              <div class="stat-value">{{ statsData.offers.value }}</div>
              <div class="stat-change positive">较昨日 +{{ statsData.offers.change }}</div>
            </div>
          </div>
        </div>
        
        <!-- 实时动态流 -->
        <div class="activity-feed">
          <h3 class="feed-title">操作动态</h3>
          <div class="feed-items">
            <div class="feed-item" v-for="(item, index) in activityItems" :key="index">
              <div class="feed-time">{{ item.time }}</div>
              <div class="feed-content">
                <div class="feed-avatar" :style="{ backgroundColor: item.avatarColor }">{{ '您'|| item.avatar }}</div>
                <div class="feed-text">{{ item.action }}</div>
              </div>
            </div>
          </div>
          <div class="feed-more">
            <el-button link size="small">查看更多动态</el-button>
          </div>
        </div>
      </div>
      
      <!-- 右侧栏 - 3份 -->
      <div class="right-panel">
        <!-- 招聘热度分析图 -->
        <div class="chart-card">
          <h3 class="chart-title">各级岗位热度</h3>
          <div ref="heatChartRef" class="chart-container"></div>
        </div>
        
        <!-- 中间图表区域 -->
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
        
        <!-- 招聘漏斗效率看板 -->
        <div class="funnel-card">
          <h3 class="chart-title">招聘漏斗效率看板</h3>
          <div class="funnel-stages">
            <div class="funnel-stage">
              <h4 class="stage-title">初试阶段</h4>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.initial" :key="index">
                  <div class="candidate-avatar">{{ candidate.name.substring(0, 1) }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.name }}</div>
                    <div class="candidate-position">{{ candidate.position }}</div>
                  </div>
                  <div class="candidate-status pending">待面试</div>
                </div>
              </div>
            </div>
            
            <div class="funnel-stage">
              <h4 class="stage-title">复试阶段</h4>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.second" :key="index">
                  <div class="candidate-avatar">{{ candidate.name.substring(0, 1) }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.name }}</div>
                    <div class="candidate-position">{{ candidate.position }}</div>
                  </div>
                  <div class="candidate-status in-progress">面试中</div>
                </div>
              </div>
            </div>
            
            <div class="funnel-stage">
              <h4 class="stage-title">待入职</h4>
              <div class="stage-candidates">
                <div class="candidate-card" v-for="(candidate, index) in funnelData.final" :key="index">
                  <div class="candidate-avatar">{{ candidate.name.substring(0, 1) }}</div>
                  <div class="candidate-info">
                    <div class="candidate-name">{{ candidate.name }}</div>
                    <div class="candidate-position">{{ candidate.position }}</div>
                  </div>
                  <div class="candidate-status completed">已通过</div>
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
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { Document, UserFilled, Trophy, ArrowRight, Check, Clock, Plus } from '@element-plus/icons-vue'
import { useDashboardData } from '../composables/useDashboardData'
import * as echarts from 'echarts'

// 使用自定义Hook获取数据
const { activityItems, heatData, statsData, sourceData, trendData, funnelData, refreshAllData } = useDashboardData()

// 图表引用
const heatChartRef = ref(null)
const sourceChartRef = ref(null)
const trendChartRef = ref(null)

// 图表实例
let heatChart = null
let sourceChart = null
let trendChart = null

// 初始化热度图表
function initHeatChart() {
  if (heatChartRef.value) {
    heatChart = echarts.init(heatChartRef.value)
    updateHeatChart()
  }
}

// 更新热度图表
function updateHeatChart() {
  if (!heatChart) return
  
  // 定义数据类型和对应的颜色
  const dataTypes = ['简历', '面试', 'Offer']
  const typeColors = ['#409EFF', '#E6A23C', '#67C23A']
  
  // 为每种数据类型创建一个系列
  const series = dataTypes.map((type, index) => ({
    name: type,
    type: 'bar',
    stack: 'total',
    emphasis: {
      focus: 'series'
    },
    itemStyle: {
      color: typeColors[index]
    },
    data: heatData.value.map(item => {
      // 找到对应类型的数据
      const bar = item.bars[index]
      return bar ? bar.width || 0 : 0
    })
  }))

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: dataTypes
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
      axisLabel: {
        formatter: '{value}%'
      }
    },
    yAxis: {
      type: 'category',
      data: heatData.value.map(item => item.name)
    },
    series: series
  }

  heatChart.setOption(option)
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

// 监听数据变化并打印
watch(
  [statsData, activityItems, heatData, sourceData, trendData, funnelData],
  ([newStats, newActivities, newHeat, newSource, newTrend, newFunnel]) => {
  
    
    // 只打印岗位热度数据
    if (newHeat.length > 0) {
      console.log('=== 各级岗位热度数据 ===')
      console.log(newHeat)
      console.log('=========================')
    }
  },
  { deep: true, flush: 'post' }
)

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
  grid-template-columns: 2fr 3fr;
  gap: 24px;
}

/* 左侧栏样式 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 数据统计卡片 */
.stats-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  padding: 20px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 12px 12px 0 0;
}

.stat-card.blue::before {
  background: linear-gradient(90deg, #409EFF, #69B1FF);
}

.stat-card.orange::before {
  background: linear-gradient(90deg, #E6A23C, #F7BA2A);
}

.stat-card.green::before {
  background: linear-gradient(90deg, #67C23A, #85CE61);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-card.blue .stat-icon {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.stat-card.orange .stat-icon {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.stat-card.green .stat-icon {
  background: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
}

.stat-change.positive {
  color: #67C23A;
}

.stat-change.negative {
  color: #F56C6C;
}

/* 活动动态流 */
.activity-feed {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  flex: 1;
}

.feed-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
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
}

.feed-content {
  flex: 1;
  display: flex;
  align-items: center;
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
}

.feed-text {
  font-size: 14px;
  color: #606266;
}

.feed-action {
  color: #909399;
  font-size: 14px;
}

.feed-more {
  text-align: center;
}

/* 右侧栏样式 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 图表卡片通用样式 */
.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
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

/* 漏斗看板 */
.funnel-stages {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.funnel-stage {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
}

.stage-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.stage-candidates {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.candidate-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.candidate-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #409EFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.candidate-info {
  flex: 1;
}

.candidate-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.candidate-position {
  font-size: 12px;
  color: #909399;
}

.candidate-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.candidate-status.pending {
  background: rgba(230, 162, 60, 0.1);
  color: #E6A23C;
}

.candidate-status.in-progress {
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.candidate-status.completed {
  background: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
  
  .charts-row {
    grid-template-columns: 1fr;
  }
  
  .funnel-stages {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-cards {
    flex-direction: column;
  }
  
  .chart-container {
    height: 250px;
  }
}
</style>