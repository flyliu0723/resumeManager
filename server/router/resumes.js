const express = require('express')
const resumeController = require('../controller/resumeController')

const router = express.Router()

// 注意：具体路由必须在 /:id 之前定义，否则会被 /:id 拦截
router.get('/:id/preview', resumeController.preview)
router.get('/:id/download', resumeController.download)
router.get('/:id/content', resumeController.getContent)
router.get('/:id/extract-text', resumeController.extractText)
router.delete('/:id', resumeController.delete)
router.post('/:id/parse', resumeController.parse)
router.get('/:id', resumeController.getById)

module.exports = router
