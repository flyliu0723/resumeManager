const express = require('express')
const flowLogController = require('../controller/flowLogController')

const router = express.Router()

router.get('/match/:matchId/flow-logs', flowLogController.getByMatchId)
router.post('/match/flow-log', flowLogController.create)
router.put('/match/:matchId/jd-supplement', flowLogController.updateJdSupplement)

module.exports = router
