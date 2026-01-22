const express = require('express')
const positionResumeController = require('../controller/positionResumeController')

const router = express.Router()

router.get('/:positionId/resumes', positionResumeController.getByPosition)
router.post('/:positionId/resumes', positionResumeController.create)
router.post('/:positionId/resumes/:resumeId/evaluate', positionResumeController.evaluate)
router.put('/position-resumes/:id/status', positionResumeController.updateStatus)

module.exports = router
