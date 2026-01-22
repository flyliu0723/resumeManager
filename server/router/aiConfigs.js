const express = require('express')
const aiConfigController = require('../controller/aiConfigController')

const router = express.Router()

router.get('/', aiConfigController.getAll)
router.get('/active/current', aiConfigController.getActive)
router.get('/providers', aiConfigController.getProviders)
router.get('/models', aiConfigController.getModels)
router.get('/:id', aiConfigController.getById)
router.post('/', aiConfigController.create)
router.put('/:id', aiConfigController.update)
router.post('/:id/set-active', aiConfigController.setActive)
router.post('/:id/test', aiConfigController.test)
router.delete('/:id', aiConfigController.delete)

module.exports = router
