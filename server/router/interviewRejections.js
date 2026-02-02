const express = require('express')
const interviewRejectionController = require('../controller/interviewRejectionController')

const router = express.Router()

// 获取指定match的拒绝记录
router.get('/match/:matchId', interviewRejectionController.getByMatchId)

// 获取单个拒绝记录详情
router.get('/:id', interviewRejectionController.getById)

// 创建拒绝记录
router.post('/match/:matchId', interviewRejectionController.create)

// 更新拒绝记录
router.put('/:id', interviewRejectionController.update)

// 获取拒绝统计（按阶段）
router.get('/stats/by-stage', interviewRejectionController.getStatsByStage)

// 获取拒绝统计（按原因）
router.get('/stats/by-reason', interviewRejectionController.getStatsByReason)

// 获取可重新打开的流程列表
router.get('/list/reopenable', interviewRejectionController.getReopenableList)

// 删除拒绝记录
router.delete('/:id', interviewRejectionController.delete)

module.exports = router
