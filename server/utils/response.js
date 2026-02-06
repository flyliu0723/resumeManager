/**
 * API 响应标准化工具
 */

const success = (res, data = null, message = null, meta = null) => {
  const response = {
    success: true,
    code: 200,
    data
  }

  if (message !== null && message !== undefined) {
    response.message = message
  }

  if (meta !== null && meta !== undefined) {
    response.meta = meta
  }

  res.json(response)
}

const error = (res, message, code = 400) => {
  res.status(code).json({
    success: false,
    code: code,
    message: message || '操作失败'
  })
}

const created = (res, data = null, message = '创建成功') => {
  res.status(201).json({
    success: true,
    code: 201,
    data,
    message
  })
}

const noContent = (res) => {
  res.status(204).send()
}

const paginated = (res, data, meta) => {
  const paginationMeta = {
    page: meta.page || 1,
    limit: meta.limit || 20,
    total: meta.total || 0,
    totalPages: meta.totalPages || Math.ceil((meta.total || 0) / (meta.limit || 20))
  }

  res.json({
    success: true,
    code: 200,
    data,
    meta: paginationMeta
  })
}

const withMeta = (res, data, extraMeta) => {
  res.json({
    success: true,
    code: 200,
    data,
    ...extraMeta
  })
}

module.exports = {
  success,
  error,
  created,
  noContent,
  paginated,
  withMeta
}
