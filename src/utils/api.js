const API_BASE = 'http://localhost:3000/api'

class ApiError extends Error {
  constructor(message, code = 500) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  // 如果body是FormData，不要设置Content-Type，让浏览器自动设置
  if (config.body && config.body instanceof FormData) {
    delete config.headers['Content-Type']
  } else if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  const controller = new AbortController()
  config.signal = controller.signal

  // 设置5分钟超时
  const timeoutId = setTimeout(() => controller.abort(), 300000)

  try {
    const response = await fetch(fullUrl, config)
    clearTimeout(timeoutId)
    const result = await response.json()

    if (!result.success) {
      throw new ApiError(result.message || '请求失败', result.code || 500)
    }

    return result.data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new ApiError('请求超时', 408)
    }
    throw err
  }
}

export const api = {
  get: (url, params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url
    return request(fullUrl, { method: 'GET' })
  },

  post: (url, data = {}) => request(url, { method: 'POST', body: data }),

  put: (url, data = {}) => request(url, { method: 'PUT', body: data }),

  delete: (url) => request(url, { method: 'DELETE' }),

  upload: (url, formData) => {
    return request(url, {
      method: 'POST',
      body: formData,
      headers: {}
    })
  }
}

export { ApiError }
