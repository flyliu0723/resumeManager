const express = require('express')
const statsController = require('../controller/statsController')

const router = express.Router()

// 动态流接口
router.get('/', statsController.getActivities)  // 实时动态流数据

module.exports = router
