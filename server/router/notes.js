const express = require('express')
const noteController = require('../controller/noteController')

const router = express.Router()

router.get('/:positionId/notes', noteController.getByPosition)
router.post('/:positionId/notes', noteController.create)
router.put('/:positionId/notes/:noteId', noteController.update)
router.delete('/:positionId/notes/:noteId', noteController.delete)

module.exports = router
