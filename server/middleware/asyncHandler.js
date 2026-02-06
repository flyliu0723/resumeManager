/**
 * 异步处理中间件包装器
 * 自动捕获异步函数中的错误并传递给下一个错误处理中间件
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
