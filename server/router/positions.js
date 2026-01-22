const express = require('express')
const positionController = require('../controller/positionController')

const router = express.Router()

router.get('/', positionController.getAll)
router.get('/:id', positionController.getById)
router.post('/', positionController.create)
router.put('/:id', positionController.update)
router.delete('/:id', positionController.delete)
router.post('/:id/archive', positionController.archive)
router.post('/:id/restore', positionController.restore)

module.exports = router
