<template>
  <div class="app-container">
    <el-menu
      mode="horizontal"
      :default-active="$route.path"
      router
      class="app-menu"
    >
      <el-menu-item index="/">
        <el-icon><HomeFilled /></el-icon>
        简历管理
      </el-menu-item>
      <el-menu-item index="/config">
        <el-icon><Setting /></el-icon>
        AI 配置
      </el-menu-item>
    </el-menu>
    <router-view />
  </div>
</template>

<script setup>
import { HomeFilled, Setting } from '@element-plus/icons-vue'
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.app-menu {
  padding: 0 20px;
}

.app-menu .el-menu-item {
  font-size: 14px;
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
