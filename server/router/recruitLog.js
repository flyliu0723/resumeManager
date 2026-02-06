const express = require('express')
const recruitLogController = require('../controller/recruitLogController')

const router = express.Router()

router.get('/bottleneck-analysis', recruitLogController.getBottleneckAnalysis)
router.get('/candidate-warnings', recruitLogController.getCandidateWarnings)
router.get('/channel-roi', recruitLogController.getChannelROI)
router.get('/workload-stats', recruitLogController.getWorkloadStats)
router.get('/position-progress', recruitLogController.getPositionProgress)
router.get('/market-feedback', recruitLogController.getMarketFeedback)
router.get('/weekly-report', recruitLogController.getWeeklyReport)
router.get('/daily-report', recruitLogController.getDailyReport)

module.exports = router
