const { aiConfigStmt } = require('../database')
const { success, error } = require('../utils/response')

const aiConfigController = {
  getAll: (req, res) => {
    try {
      const configs = aiConfigStmt.getAll()
      success(res, configs)
    } catch (err) {
      error(res, err.message)
    }
  },

  getById: (req, res) => {
    try {
      const config = aiConfigStmt.getById(req.params.id)
      if (config) {
        success(res, config)
      } else {
        error(res, '配置不存在', 404)
      }
    } catch (err) {
      error(res, err.message)
    }
  },

  getActive: (req, res) => {
    try {
      const config = aiConfigStmt.getActive()
      success(res, config)
    } catch (err) {
      error(res, err.message)
    }
  },

  create: (req, res) => {
    try {
      const { name, provider, api_key, api_url, model, priority } = req.body
      
      if (!name || !provider) {
        return error(res, '名称和提供商不能为空', 400)
      }

      const result = aiConfigStmt.insert(name, provider, api_key, api_url, model, priority || 0)
      const newConfig = aiConfigStmt.getById(result.lastInsertRowid)
      
      success(res, newConfig)
    } catch (err) {
      error(res, err.message)
    }
  },

  update: (req, res) => {
    try {
      const { name, provider, api_key, api_url, model, is_active, priority } = req.body
      
      if (!name || !provider) {
        return error(res, '名称和提供商不能为空', 400)
      }

      aiConfigStmt.update(req.params.id, name, provider, api_key, api_url, model, is_active, priority)
      const updatedConfig = aiConfigStmt.getById(req.params.id)
      
      success(res, updatedConfig)
    } catch (err) {
      error(res, err.message)
    }
  },

  setActive: (req, res) => {
    try {
      aiConfigStmt.setActive(req.params.id)
      const config = aiConfigStmt.getById(req.params.id)
      success(res, config)
    } catch (err) {
      error(res, err.message)
    }
  },

  test: (req, res) => {
    try {
      const result = aiConfigStmt.test(req.params.id)
      success(res, result)
    } catch (err) {
      error(res, err.message)
    }
  },

  delete: (req, res) => {
    try {
      const config = aiConfigStmt.getById(req.params.id)
      if (!config) {
        return error(res, '配置不存在', 404)
      }
      
      aiConfigStmt.delete(req.params.id)
      success(res, null, '删除成功')
    } catch (err) {
      error(res, err.message)
    }
  },

  getProviders: (req, res) => {
    success(res, [
      { value: 'zhipu', label: '智谱GLM', fields: ['api_key', 'model'], apiUrl: 'https://open.bigmodel.cn/api/paas/v4' },
      { value: 'minimax', label: 'MiniMax', fields: ['api_key', 'model'], apiUrl: 'https://api.minimax.chat/v1' },
      { value: 'deepseek', label: 'DeepSeek', fields: ['api_key', 'model'], apiUrl: 'https://api.deepseek.com' },
      { value: 'openai', label: 'OpenAI', fields: ['api_key', 'api_url', 'model'] }
    ])
  },

  getModels: (req, res) => {
    const { provider } = req.query
    let models = []

    if (provider === 'zhipu') {
      models = [
        { value: 'glm-4', label: 'GLM-4 (推荐, 较强推理)' },
        { value: 'glm-4v', label: 'GLM-4V (支持图像)' },
        { value: 'glm-3-turbo', label: 'GLM-3 Turbo (快速, 便宜)' }
      ]
    } else if (provider === 'minimax') {
      models = [
        { value: 'abab6.5s-chat', label: 'abab6.5s-chat (快速)' },
        { value: 'abab6.5-chat', label: 'abab6.5-chat (较强)' },
        { value: 'abab5.5s-chat', label: 'abab5.5s-chat (便宜)' }
      ]
    } else if (provider === 'deepseek') {
      models = [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (推荐, 性价比高)' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (推理强)' }
      ]
    } else if (provider === 'openai') {
      models = [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (推荐, 快速)' },
        { value: 'gpt-4', label: 'GPT-4 (更智能, 较慢)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
      ]
    }

    success(res, models)
  }
}

module.exports = aiConfigController
