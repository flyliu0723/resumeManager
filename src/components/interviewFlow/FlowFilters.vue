<template>
  <div class="flow-filters">
    <el-select 
      :model-value="positionFilter" 
      @update:model-value="handlePositionFilterChange"
      placeholder="All Positions" 
      size="small" 
      class="filter-select"
    >
      <el-option label="All Positions" value="all" />
      <el-option v-for="position in positions" :key="position.id" :label="position.name" :value="position.id" />
    </el-select>
    <el-select 
      :model-value="statusFilter" 
      @update:model-value="handleStatusFilterChange"
      placeholder="Ongoing Only" 
      size="small" 
      class="filter-select"
    >
      <el-option label="Ongoing Only" value="ongoing" />
      <el-option label="All Statuses" value="all" />
      <el-option label="Completed" value="completed" />
      <el-option label="Rejected" value="rejected" />
    </el-select>
  </div>
</template>

<script setup>
const props = defineProps({
  positionFilter: {
    type: String,
    default: 'all'
  },
  statusFilter: {
    type: String,
    default: 'ongoing'
  },
  positions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:positionFilter', 'update:statusFilter', 'filterChange'])

const handlePositionFilterChange = (value) => {
  emit('update:positionFilter', value)
  emit('filterChange')
}

const handleStatusFilterChange = (value) => {
  emit('update:statusFilter', value)
  emit('filterChange')
}
</script>

<style scoped>
.flow-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-select {
  width: 160px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flow-filters {
    flex-direction: column;
  }
  
  .filter-select {
    width: 100%;
  }
}
</style>
