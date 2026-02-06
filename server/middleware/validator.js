/**
 * 请求验证中间件
 * 使用 Joi 进行 Schema 验证
 */

const Joi = require('joi')

// 主状态常量
const MAIN_STATUSES = [
  'resume_screening',
  'interviewing',
  'salary_negotiation',
  'closed',
  'rejected'
]

// 验证 Schema 定义

// 状态变更验证
const updateStatusSchema = Joi.object({
  mainStatus: Joi.string()
    .valid(...MAIN_STATUSES)
    .required()
    .messages({
      'any.only': '无效的主状态',
      'any.required': '缺少必要参数: mainStatus'
    }),
  
  subStatus: Joi.string()
    .required()
    .messages({
      'any.required': '缺少必要参数: subStatus'
    }),
  
  actionType: Joi.string()
    .valid('status_change', 'reject', 'reopen')
    .optional()
    .default('status_change'),
  
  // 拒绝相关
  rejectionReasonCode: Joi.string()
    .when('actionType', {
      is: 'reject',
      then: Joi.required()
    }),
  
  rejectionReasonDetail: Joi.string()
    .max(1000)
    .optional(),
  
  candidateFeedback: Joi.string()
    .max(2000)
    .optional(),
  
  isReopenable: Joi.boolean()
    .optional()
    .default(false),
  
  reopenConditions: Joi.string()
    .max(500)
    .optional(),
  
  internalNotes: Joi.string()
    .max(2000)
    .optional(),
  
  // 面试相关
  interviewRound: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .optional(),
  
  nextInterviewAt: Joi.string()
    .isoDate()
    .optional(),
  
  interviewerName: Joi.string()
    .max(100)
    .optional(),
  
  // 通用
  note: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
})

// 创建职位验证
const createPositionSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': '职位名称不能为空',
      'string.max': '职位名称不能超过200字符',
      'any.required': '缺少必要参数: name'
    }),
  
  company: Joi.string()
    .max(200)
    .optional()
    .allow('', null),
  
  description: Joi.string()
    .max(10000)
    .optional()
    .allow('', null),
  
  start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .allow('', null)
})

// 更新职位验证
const updatePositionSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  
  company: Joi.string()
    .max(200)
    .optional()
    .allow('', null),
  
  description: Joi.string()
    .max(10000)
    .optional()
    .allow('', null),
  
  start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .allow('', null),
  
  status: Joi.string()
    .valid('active', 'archived')
    .optional()
}).min(1)

// AI配置验证
const createAIConfigSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required(),
  
  provider: Joi.string()
    .valid('zhipu', 'minimax', 'deepseek', 'openai')
    .required(),
  
  api_key: Joi.string()
    .min(10)
    .max(500)
    .required(),
  
  api_url: Joi.string()
    .uri()
    .optional()
    .allow('', null),
  
  model: Joi.string()
    .max(100)
    .optional()
    .allow('', null),
  
  priority: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .default(0)
})

// 面试安排验证
const scheduleInterviewSchema = Joi.object({
  interviewRound: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required(),
  
  interviewType: Joi.string()
    .valid('phone', 'video', 'onsite', 'technical', 'hr', 'final')
    .required(),
  
  scheduledAt: Joi.string()
    .isoDate()
    .required(),
  
  durationMinutes: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .optional()
    .default(60),
  
  interviewerId: Joi.number()
    .integer()
    .positive()
    .optional(),
  
  interviewerName: Joi.string()
    .max(100)
    .required(),
  
  location: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
})

// 文件上传验证
const uploadResumeSchema = Joi.object({
  source: Joi.string()
    .valid('boss', 'lagou', 'liepin', 'recruiter', 'other')
    .optional()
    .default('other'),
  
  note: Joi.string()
    .max(1000)
    .optional()
    .allow('', null)
})

// 分页参数验证
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
})

// 搜索参数验证
const searchSchema = Joi.object({
  search: Joi.string()
    .max(200)
    .optional()
    .allow('', null),
  
  status: Joi.string()
    .optional()
    .allow('', null)
})

// Schema 导出
const schemas = {
  updateStatus: updateStatusSchema,
  createPosition: createPositionSchema,
  updatePosition: updatePositionSchema,
  createAIConfig: createAIConfigSchema,
  scheduleInterview: scheduleInterviewSchema,
  uploadResume: uploadResumeSchema,
  pagination: paginationSchema,
  search: searchSchema
}

// 验证中间件工厂
const validate = (schemaName) => {
  const schema = schemas[schemaName]
  
  if (!schema) {
    throw new Error(`未定义的验证 Schema: ${schemaName}`)
  }
  
  return (req, res, next) => {
    // 验证 body
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // 返回所有错误
      stripUnknown: true // 移除未知字段
    })
    
    if (error) {
      // 格式化错误消息
      const messages = error.details.map(detail => {
        const path = detail.path.join('.')
        return {
          field: path,
          message: detail.message
        }
      })
      
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        errors: messages
      })
    }
    
    // 将验证后的数据赋值给 req.body
    req.body = value
    next()
  }
}

// 查询参数验证
const validateQuery = (schemaName) => {
  const schema = schemas[schemaName]
  
  if (!schema) {
    throw new Error(`未定义的验证 Schema: ${schemaName}`)
  }
  
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    })
    
    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
      
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: '查询参数验证失败',
        errors: messages
      })
    }
    
    req.query = value
    next()
  }
}

module.exports = {
  validate,
  validateQuery,
  schemas,
  MAIN_STATUSES
}
