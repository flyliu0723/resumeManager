<template>
  <div class="interviews-view">
    <div class="page-header">
      <h2>面试事件</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <span class="filter-label">筛选:</span>
        <el-select v-model="filters.statusFilter" placeholder="状态筛选" style="width: 150px">
          <el-option label="全部" value="all" />
          <el-option label="进行中" value="ongoing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>

        <el-select
          v-model="filters.eventType"
          placeholder="事件类型"
          clearable
          style="width: 150px"
        >
          <el-option label="简历上传" value="resume_upload" />
          <el-option label="面试安排" value="interview_scheduled" />
          <el-option label="面试开始" value="interview_started" />
          <el-option label="谈薪中" value="salary_discussed" />
          <el-option label="已成单" value="offer_accepted" />
          <el-option label="已拒绝" value="candidate_rejected" />
          <el-option label="已通过" value="interview_passed" />
        </el-select>

        <el-input
          v-model="filters.searchQuery"
          placeholder="搜索候选人/职位"
          clearable
          style="width: 200px"
          @clear="handleSearchClear"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>

        <el-button @click="handleResetFilters">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
      </div>
    </div>

    <div class="content-container">
      <div class="table-section" :class="{ 'with-panel': selectedEvent }">
        <InterviewsTable
          :events="events"
          :loading="loading"
          @row-click="handleRowClick"
        />
      </div>

      <div class="detail-panel-section" v-if="selectedEvent">
        <CandidateDetailPanel
          :event="selectedEvent"
          @close="handleCloseDetail"
        />
      </div>
    </div>

    <div class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useInterviewsStore } from '../stores/interviews'
import { usePositionStore } from '../stores/position'
import InterviewsTable from '../components/InterviewsTable.vue'
import CandidateDetailPanel from '../components/CandidateDetailPanel.vue'
import { Refresh, Search, RefreshLeft } from '@element-plus/icons-vue'

const interviewsStore = useInterviewsStore()
const positionStore = usePositionStore()

const events = computed(() => interviewsStore.events)
const loading = computed(() => interviewsStore.loading)
const selectedEvent = computed(() => interviewsStore.selectedEvent)
const filters = computed(() => interviewsStore.filters)
const pagination = computed(() => interviewsStore.pagination)
const positions = computed(() => positionStore.positions)

onMounted(() => {
  console.log('InterviewsView 挂载')
  fetchEvents()
})

watch(() => filters.value, () => {
  console.log('筛选条件变化:', filters.value)
  interviewsStore.setPage(1)
  fetchEvents()
}, { deep: true })

async function fetchEvents() {
  await interviewsStore.fetchEvents()
}

function handleRefresh() {
  console.log('刷新数据')
  fetchEvents()
}

function handleSearch() {
  console.log('搜索:', filters.value.searchQuery)
  interviewsStore.setPage(1)
  fetchEvents()
}

function handleSearchClear() {
  filters.value.searchQuery = ''
  fetchEvents()
}

function handleResetFilters() {
  console.log('重置筛选')
  interviewsStore.resetFilters()
  fetchEvents()
}

function handleRowClick(row) {
  console.log('点击行:', row)
  interviewsStore.selectEvent(row)
}

function handleCloseDetail() {
  console.log('关闭详情')
  interviewsStore.clearSelection()
}

function handleSizeChange(size) {
  console.log('每页数量变化:', size)
  interviewsStore.setPage(1)
  fetchEvents()
}

function handlePageChange(page) {
  console.log('页码变化:', page)
  interviewsStore.setPage(page)
  fetchEvents()
}
</script>

<style scoped>
.interviews-view {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-bar {
  background: #fff;
  padding: 16px 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.content-container {
  display: flex;
  gap: 20px;
  min-height: calc(100vh - 260px);
}

.table-section {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.table-section.with-panel {
  flex: 0 0 60%;
}

.detail-panel-section {
  flex: 0 0 40%;
  min-width: 300px;
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  background: #fff;
  border-radius: 4px;
  margin-top: 20px;
}

@media (max-width: 1200px) {
  .content-container {
    flex-direction: column;
  }
  
  .table-section.with-panel {
    flex: 1;
    min-width: 0;
  }
  
  .detail-panel-section {
    flex: none;
    width: 100%;
    margin-top: 20px;
  }
}

@media (max-width: 768px) {
  .interviews-view {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group > * {
    width: 100%;
  }
  
  .content-container {
    min-height: auto;
  }
}
</style>
