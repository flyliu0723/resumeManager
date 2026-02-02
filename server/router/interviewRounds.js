const express = require('express')
const interviewRoundController = require('../controller/interviewRoundController')

const router = express.Router()

// 获取指定match的所有面试轮次
router.get('/match/:matchId', interviewRoundController.getByMatchId)

// 获取当前进行的面试轮次
router.get('/match/:matchId/current', interviewRoundController.getCurrentRound)

// 获取已完成的面试轮次
router.get('/match/:matchId/completed', interviewRoundController.getCompletedRounds)

// 获取单个轮次详情
router.get('/:id', interviewRoundController.getById)

// 创建面试轮次（安排面试）
router.post('/match/:matchId', interviewRoundController.create)

// 更新面试轮次状态和结果
router.put('/:id/status', interviewRoundController.updateStatus)

// 添加面试反馈（评价维度）
router.post('/:id/feedback', interviewRoundController.addFeedback)

// 更新面试反馈
router.put('/feedback/:feedbackId', interviewRoundController.updateFeedback)

// 删除面试轮次
router.delete('/:id', interviewRoundController.delete)

module.exports = router
