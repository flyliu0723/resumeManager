const express = require('express')
const statsController = require('../controller/statsController')

const router = express.Router()

// 统计接口
router.get('/daily', statsController.getDailyStats)       // 今日统计数据
router.get('/heat', statsController.getHeatStats)         // 职位热度统计
router.get('/source', statsController.getSourceStats)     // 简历来源分布
router.get('/trend', statsController.getTrendStats)       // 近30天趋势数据
router.get('/funnel', statsController.getFunnelStats)     // 招聘漏斗数据

module.exports = router
