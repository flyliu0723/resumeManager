const express = require('express')
const positionResumeController = require('../controller/positionResumeControllerNew')

const router = express.Router()

// 获取列表（支持新状态系统筛选）
router.get('/:positionId/resumes', positionResumeController.getByPosition)

// 文件上传（保持原有功能）
router.post('/:positionId/resumes', positionResumeController.create)

// 获取单个详情（支持新状态系统）
router.get('/position-resumes/:id', positionResumeController.getById)

// 状态流转 - 通用状态变更接口（支持正常流转、拒绝、重新打开）
router.put('/position-resumes/:id/status', positionResumeController.updateStatus)

// 重新打开已拒绝的流程
router.post('/position-resumes/:id/reopen', positionResumeController.reopen)

// 获取可用的下一个状态选项
router.get('/position-resumes/:id/next-options', positionResumeController.getNextStatusOptions)

// 获取拒绝原因列表
router.get('/rejection-reasons', positionResumeController.getRejectionReasons)

// 删除（会级联删除关联的面试轮次和拒绝记录）
router.delete('/position-resumes/:id', positionResumeController.delete)

module.exports = router
