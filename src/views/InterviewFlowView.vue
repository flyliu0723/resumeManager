<template>
  <div class="interview-flow-container">
    <FlowHeader 
      :search-query="searchQuery" 
      @update:search-query="searchQuery = $event"
      @back="backToDashboard"
    />

    <FlowFilters 
      v-model:position-filter="positionFilter"
      v-model:status-filter="statusFilter"
      :positions="positions"
      @filter-change="fetchAllData"
    />

    <FlowTable 
      :candidates="filteredCandidates" 
      :loading="loading"
    />

    <FlowDetails 
      v-model:active-details="activeDetails"
      v-model:stats-filter="statsFilter"
      :overview="overview"
      :risk-factors="riskFactors"
      :timeline-events="timelineEvents"
      @stats-filter-change="fetchTimeline"
    />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useInterviewFlow } from '../hooks/useInterviewFlow'
import FlowHeader from '../components/interviewFlow/FlowHeader.vue'
import FlowFilters from '../components/interviewFlow/FlowFilters.vue'
import FlowTable from '../components/interviewFlow/FlowTable.vue'
import FlowDetails from '../components/interviewFlow/FlowDetails.vue'

const {
  loading,
  candidates,
  positions,
  overview,
  riskFactors,
  timelineEvents,
  searchQuery,
  positionFilter,
  statusFilter,
  activeDetails,
  statsFilter,
  filteredCandidates,
  fetchAllData,
  fetchTimeline,
  backToDashboard
} = useInterviewFlow()

watch([positionFilter, statusFilter], () => {
  fetchAllData()
})

watch(statsFilter, () => {
  fetchTimeline()
})

onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.interview-flow-container {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .interview-flow-container {
    padding: 16px;
  }
}
</style>
