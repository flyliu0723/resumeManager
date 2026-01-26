<template>
  <div class="flow-table-container">
    <el-table :data="candidates" stripe style="width: 100%" class="flow-table" v-loading="loading">
      <el-table-column prop="candidate_name" label="Candidate" min-width="150">
        <template #default="scope">
          <div class="candidate-info">
            <div class="candidate-avatar" :style="{ backgroundColor: scope.row.avatarColor }">{{ scope.row.avatarText }}</div>
            <span class="candidate-name">{{ scope.row.candidate_name || scope.row.resume_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="current_status" label="Stage" min-width="180">
        <template #default="scope">
          <span class="stage-text">{{ scope.row.current_status || scope.row.status }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="daysInStage" label="Days in Stage" min-width="120" align="center">
        <template #default="scope">
          <span class="days-text">{{ scope.row.daysInStage }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status1" label="Status" min-width="120" align="center">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status1)" size="small" class="status-tag">
            {{ scope.row.status1 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status2" label="Status" min-width="120" align="center">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status1)" size="small" class="status-tag">
            {{ scope.row.status2 }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="attention" label="Attention" min-width="180">
        <template #default="scope">
          <span class="attention-text">{{ scope.row.attention }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
defineProps({
  candidates: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const getStatusType = (status) => {
  const types = {
    'At Risk': 'warning',
    'Waiting': 'info',
    'Stable': 'success',
    'Stalling': 'danger'
  }
  return types[status] || 'default'
}
</script>

<style scoped>
.flow-table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
  overflow: hidden;
}

.flow-table {
  border: none;
}

.flow-table th {
  background-color: #fafafa;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
}

.flow-table td {
  border-bottom: 1px solid #ebeef5;
  padding: 12px 16px;
}

.candidate-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.candidate-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.candidate-name {
  font-size: 14px;
  color: #303133;
}

.stage-text {
  font-size: 14px;
  color: #606266;
}

.days-text {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.status-tag {
  font-size: 12px;
  padding: 2px 8px;
}

.attention-text {
  font-size: 13px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flow-table-container {
    overflow-x: auto;
  }
}
</style>
