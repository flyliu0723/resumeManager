const express = require('express')
const companyController = require('../controller/companyController')

const router = express.Router()

router.get('/', companyController.getAll)
router.get('/search', companyController.search)

module.exports = router
