const express = require('express')
const positionsRouter = require('./positions')
const resumesRouter = require('./resumes')
const positionResumesRouter = require('./positionResumes')
const notesRouter = require('./notes')
const aiConfigsRouter = require('./aiConfigs')
const companiesRouter = require('./companies')
const flowLogsRouter = require('./flowLogs')
const interviewFlowRouter = require('./interviewFlow')

const router = express.Router()

router.use('/positions', positionsRouter)
router.use('/positions', positionResumesRouter)
router.use('/positions', notesRouter)
router.use('/resumes', resumesRouter)
router.use('/ai-configs', aiConfigsRouter)
router.use('/companies', companiesRouter)
router.use('/flow-logs', flowLogsRouter)
router.use('/interview-flow', interviewFlowRouter)

module.exports = router
