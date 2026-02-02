const express = require('express')
const dashboardController = require('../controller/dashboardController')

const router = express.Router()

// 获取新状态系统的统计数据
router.get('/stats', dashboardController.getStats)

// 获取漏斗数据
router.get('/funnel-data', dashboardController.getFunnelData)

// 获取漏斗指标
router.get('/funnel-metrics', dashboardController.getFunnelMetrics)

// 获取岗位热度数据
router.get('/heat-data', dashboardController.getHeatData)

// 获取来源分布数据
router.get('/source-data', dashboardController.getSourceData)

// 获取趋势数据
router.get('/trend-data', dashboardController.getTrendData)

// 获取操作动态
router.get('/activities', dashboardController.getActivities)

// 根据主状态获取候选人列表（用于流程看板）
router.get('/candidates-by-main-status', dashboardController.getCandidatesByMainStatus)

module.exports = router
