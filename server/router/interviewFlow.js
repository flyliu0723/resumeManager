const express = require('express')
const interviewFlowController = require('../controller/interviewFlowController')

const router = express.Router()

router.get('/candidates', interviewFlowController.getCandidates)
router.get('/overview', interviewFlowController.getOverview)
router.get('/risk-factors', interviewFlowController.getRiskFactors)
router.get('/timeline', interviewFlowController.getTimeline)
router.get('/dashboard-stats', interviewFlowController.getDashboardStats)
router.get('/candidates-by-status', interviewFlowController.getCandidatesByStatus)

module.exports = router
