<template>
  <div class="flow-details">
    <el-collapse :model-value="activeDetails" @update:model-value="handleActiveDetailsChange" class="details-collapse">
      <el-collapse-item name="overview" title="Candidate Overview">
        <div class="overview-content">
          <p>Total candidates: {{ overview.total }}</p>
          <p>Active candidates: {{ overview.active }}</p>
          <p>Average days in process: {{ overview.averageDaysInProcess }}d</p>
        </div>
      </el-collapse-item>
      
      <el-collapse-item name="risks" title="Key Risk Factors">
        <div class="risks-content">
          <div v-for="(risk, index) in riskFactors" :key="index" class="risk-item">
            <el-icon class="risk-icon"><Warning /></el-icon>
            <span>{{ risk }}</span>
          </div>
        </div>
      </el-collapse-item>
      
      <el-collapse-item name="stats" title="All Stats">
        <div class="stats-content">
          <el-select 
            :model-value="statsFilter" 
            @update:model-value="handleStatsFilterChange"
            placeholder="Stable" 
            size="small" 
            class="stats-filter"
          >
            <el-option label="Stable" value="stable" />
            <el-option label="At Risk" value="at-risk" />
            <el-option label="Waiting" value="waiting" />
            <el-option label="Stalling" value="stalling" />
          </el-select>
          
          <div class="timeline-container">
            <div v-for="(event, index) in timelineEvents" :key="index" class="timeline-item">
              <div class="timeline-date">{{ event.date }}</div>
              <div class="timeline-content">
                <span class="event-type">{{ event.type }}</span>
                <span class="event-description">{{ event.description }}</span>
                <span v-if="event.candidateName" class="event-candidate"> - {{ event.candidateName }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { Warning } from '@element-plus/icons-vue'

const props = defineProps({
  activeDetails: {
    type: Array,
    default: () => ['overview']
  },
  overview: {
    type: Object,
    default: () => ({
      total: 0,
      active: 0,
      averageDaysInProcess: 0
    })
  },
  riskFactors: {
    type: Array,
    default: () => []
  },
  timelineEvents: {
    type: Array,
    default: () => []
  },
  statsFilter: {
    type: String,
    default: 'stable'
  }
})

const emit = defineEmits(['update:activeDetails', 'update:statsFilter', 'statsFilterChange'])

const handleActiveDetailsChange = (value) => {
  emit('update:activeDetails', value)
}

const handleStatsFilterChange = (value) => {
  emit('update:statsFilter', value)
  emit('statsFilterChange')
}
</script>

<style scoped>
.flow-details {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.details-collapse {
  border: none;
  padding: 10px 15px;
}

.details-collapse .el-collapse-item__header {
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  color: #303133;
}

.details-collapse .el-collapse-item__content {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 20px;
}

.overview-content {
  padding: 16px 0;
}

.overview-content p {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
}

.risks-content {
  padding: 16px 0;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.risk-icon {
  color: #f56c6c;
  margin-top: 2px;
}

.stats-content {
  padding: 16px 0;
}

.stats-filter {
  margin-bottom: 20px;
  width: 140px;
}

.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  display: flex;
  gap: 20px;
  font-size: 13px;
}

.timeline-date {
  width: 120px;
  color: #909399;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
}

.event-type {
  font-weight: 600;
  color: #303133;
  margin-right: 8px;
}

.event-description {
  color: #606266;
}

.event-candidate {
  color: #909399;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .timeline-item {
    flex-direction: column;
    gap: 4px;
  }
  
  .timeline-date {
    width: auto;
  }
}
</style>
