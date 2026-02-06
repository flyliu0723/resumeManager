const express = require('express')
const interviewsController = require('../controller/interviewsController')
const { validate } = require('../middleware/validator')

const router = express.Router()

// GET /api/interviews - 获取事件列表
router.get('/', interviewsController.getList)

// GET /api/interviews/stats/daily - 获取每日统计
router.get('/stats/daily', interviewsController.getDailyStats)

// GET /api/interviews/stats/types - 获取事件类型统计
router.get('/stats/types', interviewsController.getEventTypeStats)

// GET /api/interviews/:id - 获取单个事件详情
router.get('/:id', interviewsController.getById)

// POST /api/interviews - 手动创建事件
router.post('/', validate('scheduleInterview'), interviewsController.create)

module.exports = router
