<template>
  <div class="flow-header">
    <div class="header-left">
      <el-icon class="logo-icon"><House /></el-icon>
      <h1>流程中</h1>
    </div>
    <div class="header-right">
      <el-input
        :model-value="searchQuery"
        @update:model-value="handleSearchUpdate"
        placeholder="Search candidates"
        size="small"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" size="small" @click="handleBack">
        Back to Dashboard
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { House, Search } from '@element-plus/icons-vue'

const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:searchQuery', 'back'])

const handleSearchUpdate = (value) => {
  emit('update:searchQuery', value)
}

const handleBack = () => {
  emit('back')
}
</script>

<style scoped>
.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 24px;
  color: #409EFF;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 240px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flow-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-input {
    flex: 1;
    margin-right: 12px;
  }
}
</style>
