/**
 * 全局错误处理中间件
 * 统一处理所有未捕获的错误
 */

// 状态码映射
const statusCodeMap = {
  ValidationError: 400,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  NotFoundError: 404,
  ConflictError: 409,
  TooManyRequestsError: 429
}

// 错误日志级别
const getLogLevel = (statusCode) => {
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'warn'
  return 'info'
}

// 格式化错误响应
const formatErrorResponse = (err, includeStack) => {
  const response = {
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || '服务器内部错误'
  }

  if (err.errors) {
    response.errors = err.errors
  }

  if (includeStack && process.env.NODE_ENV !== 'production') {
    response.stack = err.stack
  }

  return response
}

const errorHandler = (err, req, res, next) => {
  // 默认状态码和错误代码
  let statusCode = err.statusCode || err.status || 500
  let errorCode = err.code || 'INTERNAL_ERROR'

  // 从错误名称推断状态码
  if (!err.statusCode && !err.status && statusCode === 500) {
    const ErrorClass = err.constructor.name
    if (statusCodeMap[ErrorClass]) {
      statusCode = statusCodeMap[ErrorClass]
      errorCode = ErrorClass.replace('Error', '_ERROR').toUpperCase()
    }
  }

  // Joi 验证错误
  if (err.isJoi) {
    statusCode = 400
    errorCode = 'VALIDATION_ERROR'
  }

  // 记录错误日志
  const logLevel = getLogLevel(statusCode)
  const logMessage = {
    timestamp: new Date().toISOString(),
    level: logLevel,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    body: process.env.NODE_ENV !== 'production' ? req.body : undefined,
    query: process.env.NODE_ENV !== 'production' ? req.query : undefined
  }

  // 根据环境选择日志输出方式
  if (process.env.NODE_ENV === 'production') {
    if (statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logMessage))
    } else if (statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(logMessage))
    }
  } else {
    console[logLevel === 'error' ? 'error' : logLevel === 'warn' ? 'warn' : 'log'](
      `[${logLevel.toUpperCase()}]`,
      `${req.method} ${req.originalUrl}`,
      statusCode,
      err.message
    )
    if (err.stack && statusCode >= 500) {
      console.error(err.stack)
    }
  }

  // 发送错误响应
  const errorResponse = formatErrorResponse(err, process.env.NODE_ENV !== 'production')
  res.status(statusCode).json(errorResponse)
}

// 404 处理中间件
const notFoundHandler = (req, res, next) => {
  const error = new Error(`请求的资源不存在: ${req.method} ${req.originalUrl}`)
  error.statusCode = 404
  error.code = 'NOT_FOUND'
  next(error)
}

module.exports = {
  errorHandler,
  notFoundHandler
}
