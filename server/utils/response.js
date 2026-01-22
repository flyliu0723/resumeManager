function success(res, data = null, message = null) {
  res.json({
    code: 200,
    success: true,
    data,
    message
  })
}

function error(res, message, code = 500) {
  res.json({
    code,
    success: false,
    message
  })
}

module.exports = {
  success,
  error
}
