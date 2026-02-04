const express = require('express')
const recommendController = require('../controller/recommendController')

const router = express.Router({ mergeParams: true })

// POST /api/positions/:id/recommend
// 触发推荐计算（异步）
router.post('/:id/recommend', recommendController.triggerRecommend)

// GET /api/positions/:id/recommendations?page=1&limit=10
// 获取推荐列表
router.get('/:id/recommendations', recommendController.getRecommendations)

// GET /api/positions/:id/recommendations/status
// 获取计算状态（用于轮询）
router.get('/:id/recommendations/status', recommendController.getRecommendStatus)

// POST /api/positions/:id/recommendations/:resumeId/accept
// 接受推荐（推进入职流程）
router.post('/:id/recommendations/:resumeId/accept', recommendController.acceptRecommendation)

module.exports = router
