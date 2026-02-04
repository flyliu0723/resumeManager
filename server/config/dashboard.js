/**
 * 看板配置
 * 统一控制各模块的统计口径
 */

const DASHBOARD_CONFIG = {
  // 已成单统计范围
  // 说明：候选人接受Offer后进入"已成单"主状态
  // - pending_onboard: 待入职（已接受Offer，等待入职）
  // - onboarded: 已入职（已实际入职）
  closedStage: {
    includePendingOnboard: true,  // 包含待入职（默认true，HR视角）
    includeOnboarded: true         // 包含已入职（默认true）
  },
  
  // 转化率计算配置
  conversionRate: {
    // 分子：可选值 'onboarded' | 'pending_onboard' | 'both' | 'closed_all'
    // - onboarded: 只算已入职（最严格）
    // - pending_onboard: 只算待入职（不太合理）
    // - both: 待入职+已入职（推荐，默认）
    // - closed_all: 所有closed状态（同closedStage配置）
    numerator: 'both',
    
    // 分母：可选值 'total' | 'screening_passed' | 'interview_started'
    // - total: 所有候选人（默认）
    // - screening_passed: 仅通过简历筛选的
    // - interview_started: 仅进入面试的
    denominator: 'total'
  },
  
  // 流失率计算配置
  dropOffRate: {
    // 统计范围：所有终态但非成功的候选人
    // 自动根据 isTerminal && !isSuccess 计算，无需配置
  }
}

/**
 * 根据配置判断候选人是否属于"已成单"
 * @param {Object} match - 候选人记录
 * @param {Object} config - 配置项（默认使用DASHBOARD_CONFIG.closedStage）
 * @returns {boolean}
 */
function isClosed(match, config = DASHBOARD_CONFIG.closedStage) {
  
  if (match.main_status !== 'closed') {
    return false
  }
  
  const subStatus = match.sub_status
  
  if (subStatus === 'pending_onboard' && config.includePendingOnboard) {
    return true
  }
  if (subStatus === 'onboarded' && config.includeOnboarded) {
    return true
  }
  
  return false
}

/**
 * 根据配置判断候选人是否属于"已入职"（严格成单）
 * @param {Object} match - 候选人记录
 * @returns {boolean}
 */
function isOnboarded(match) {
  return match.main_status === 'closed' && match.sub_status === 'onboarded'
}

/**
 * 获取转化率计算的分子数量
 * @param {Array} matches - 所有候选人
 * @param {string} numeratorType - 分子类型（使用conversionRate配置）
 * @returns {number}
 */
function getConversionNumerator(matches, numeratorType = DASHBOARD_CONFIG.conversionRate.numerator) {
  switch (numeratorType) {
    case 'onboarded':
      return matches.filter(m => isOnboarded(m)).length
    case 'pending_onboard':
      return matches.filter(m => m.main_status === 'closed' && m.sub_status === 'pending_onboard').length
    case 'both':
      return matches.filter(m => isClosed(m, { includePendingOnboard: true, includeOnboarded: true })).length
    case 'closed_all':
      return matches.filter(m => isClosed(m)).length
    default:
      return matches.filter(m => isClosed(m, { includePendingOnboard: true, includeOnboarded: true })).length
  }
}

/**
 * 获取转化率计算的分母数量
 * @param {Array} matches - 所有候选人
 * @param {string} denominatorType - 分母类型
 * @returns {number}
 */
function getConversionDenominator(matches, denominatorType = DASHBOARD_CONFIG.conversionRate.denominator) {
  switch (denominatorType) {
    case 'total':
      return matches.length
    case 'screening_passed':
      return matches.filter(m => {
        // 通过简历筛选：主状态不是resume_screening，或者是screening_passed
        return m.main_status !== 'resume_screening' || 
               (m.main_status === 'resume_screening' && m.sub_status === 'screening_passed')
      }).length
    case 'interview_started':
      return matches.filter(m => m.main_status === 'interviewing' || m.main_status === 'salary_negotiation' || 
        (m.main_status === 'closed' && (m.sub_status === 'pending_onboard' || m.sub_status === 'onboarded'))
      ).length
    default:
      return matches.length
  }
}

module.exports = {
  DASHBOARD_CONFIG,
  isClosed,
  isOnboarded,
  getConversionNumerator,
  getConversionDenominator
}
