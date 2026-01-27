<template>
  <div class="app-container">
    <div class="sidebar-container" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container">
          <el-icon class="logo-icon"><Platform /></el-icon>
          <span class="logo-text">简历系统</span>
        </div>
      </div>
      <el-menu
        mode="vertical"
        :default-active="$route.path"
        router
        class="app-menu"
        background-color="#fff"
        text-color="#303133"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>{{ isSidebarCollapsed ? '' : '简历管理' }}</template>
        </el-menu-item>
        <el-menu-item index="/interview-flow">
          <el-icon><List /></el-icon>
          <template #title>{{ isSidebarCollapsed ? '' : '流程管理' }}</template>
        </el-menu-item>
        <el-menu-item index="/flow-dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>{{ isSidebarCollapsed ? '' : '流程看板' }}</template>
        </el-menu-item>
        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <template #title>{{ isSidebarCollapsed ? '' : 'AI 配置' }}</template>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-toggle" @click="toggleSidebar">
        <el-icon :class="{ rotated: isSidebarCollapsed }"><ArrowLeft /></el-icon>
      </div>
    </div>
    <div class="main-container" :class="{ collapsed: isSidebarCollapsed }">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { HomeFilled, Setting, List, ArrowLeft, Platform, DataAnalysis } from '@element-plus/icons-vue'

const isSidebarCollapsed = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
  overflow: hidden;
}

.sidebar-container {
  width: 200px;
  background: #fff;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
  transition: width 0.3s ease;
  position: relative;
  z-index: 10;
}

.sidebar-container.collapsed {
  width: 64px;
}

.sidebar-container.collapsed .el-menu-item__title {
  display: none;
}

.sidebar-container.collapsed .el-menu {
  overflow: hidden;
}

.app-menu {
  height: 100%;
  border-right: none;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #e4e7ed;
  overflow: hidden;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
  color: #409EFF;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.sidebar-container.collapsed .logo-text {
  display: none;
}

.sidebar-container.collapsed .logo-container {
  justify-content: center;
}

.sidebar-container.collapsed .sidebar-header {
  padding: 20px 0;
}

.sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 11;
  transition: all 0.3s ease;
}

.sidebar-toggle:hover {
  background: #f0f9ff;
}

.sidebar-toggle .el-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.sidebar-toggle .el-icon.rotated {
  transform: rotate(180deg);
}

.main-container {
  flex: 1;
  margin-left: 0;
  transition: margin-left 0.3s ease;
  overflow: hidden;
  height: 100vh;
}

.main-container.collapsed {
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar-container {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 100;
  }
  
  .sidebar-container.collapsed {
    left: -200px;
    width: 200px;
  }
  
  .main-container {
    margin-left: 0;
  }
  
  .main-container.collapsed {
    margin-left: 0;
  }
  
  .sidebar-toggle {
    right: 10px;
    top: 10px;
    transform: none;
  }
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
</style>
