const express = require('express')
const resumeController = require('../controller/resumeController')

const router = express.Router()

router.get('/:id', resumeController.getById)
router.get('/:id/content', resumeController.getContent)
router.delete('/:id', resumeController.delete)
router.post('/:id/parse', resumeController.parse)

module.exports = router
