const express = require('express')
const positionController = require('../controller/positionController')
const jdParseController = require('../controller/jdParseController')
const { validate } = require('../middleware/validator')

const router = express.Router()

router.get('/', positionController.getAll)
router.get('/:id', positionController.getById)
router.post('/', validate('createPosition'), positionController.create)
router.put('/:id', validate('updatePosition'), positionController.update)
router.delete('/:id', positionController.delete)
router.post('/:id/archive', positionController.archive)
router.post('/:id/restore', positionController.restore)

// JD 解析相关路由
router.post('/:id/parse-jd', jdParseController.parseJD)
router.get('/:id/parsed-jd', jdParseController.getParsedJD)
router.put('/:id/parsed-field', jdParseController.updateParsedField)

module.exports = router
