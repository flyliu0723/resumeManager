<template>
  <div class="home-container">
    <div class="sidebar">
      <PositionNav />
    </div>
    <div class="main-content">
      <div v-if="currentPosition" class="position-detail">
        <div class="position-header">
          <h2>{{ currentPosition.name }}</h2>
          <el-tag type="info">职位详情</el-tag>
        </div>
        <div class="position-description">
          <h4>职位描述 (JD)</h4>
          <div class="jd-content" :class="{ 'jd-ellipsis': showEllipsis }">
            <p ref="jdText">{{ currentPosition.description || '暂无描述' }}</p>
          </div>
          <div v-if="showEllipsis" class="jd-more" @click="showFullJD">
            <el-link type="primary">查看更多</el-link>
          </div>
        </div>
        
        <el-divider content-position="left">简历管理</el-divider>
        
        <ResumeUploader />
        <ResumePreview />
      </div>
      <div v-else class="no-position">
        <el-empty description="请选择或新增一个职位" />
      </div>

      <el-dialog v-model="jdDialogVisible" title="职位描述详情" width="600px">
        <div class="jd-full-content">
          <p>{{ currentPosition?.description || '暂无描述' }}</p>
        </div>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import PositionNav from '../components/PositionNav.vue'
import ResumeUploader from '../components/ResumeUploader.vue'
import ResumePreview from '../components/ResumePreview.vue'
import { usePositionStore } from '../stores/position'

const store = usePositionStore()
const currentPosition = computed(() => store.getCurrentPosition())
const jdText = ref(null)
const showEllipsis = ref(false)
const jdDialogVisible = ref(false)

const checkLineCount = () => {
  nextTick(() => {
    if (jdText.value) {
      const lineHeight = 22
      const maxHeight = lineHeight * 5
      const actualHeight = jdText.value.scrollHeight
      showEllipsis.value = actualHeight > maxHeight
    }
  })
}

const showFullJD = () => {
  jdDialogVisible.value = true
}

watch(() => currentPosition.value?.description, () => {
  checkLineCount()
})

onMounted(() => {
  store.fetchPositions()
  setTimeout(checkLineCount, 100)
})
</script>

<style scoped>
.home-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 250px;
  background: #fff;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.position-detail {
  background: #fff;
  border-radius: 4px;
  padding: 20px;
}

.position-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.position-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.position-description {
  margin: 20px 0;
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
}

.position-description h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #606266;
}

.jd-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}

.jd-content p {
  margin: 0;
  white-space: pre-wrap;
}

.jd-ellipsis {
  max-height: 110px;
  overflow: hidden;
}

.jd-more {
  margin-top: 10px;
  text-align: center;
}

.no-position {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.jd-full-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px;
  background: #fafafa;
  border-radius: 4px;
}

.jd-full-content p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 14px;
  color: #303133;
}
</style>
