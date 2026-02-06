/**
 * 前端招聘流程状态系统常量定义
 * 与后端保持一致
 */

// 主状态定义
export const MAIN_STATUS = {
  RESUME_SCREENING: {
    code: 'resume_screening',
    label: '简历筛选',
    color: '#909399',
    icon: 'Document',
    description: '简历初筛阶段',
    isFinal: false
  },
  INTERVIEWING: {
    code: 'interviewing',
    label: '面试中',
    color: '#409EFF',
    icon: 'ChatDotRound',
    description: '正在进行面试流程',
    isFinal: false
  },
  SALARY_NEGOTIATION: {
    code: 'salary_negotiation',
    label: '谈薪中',
    color: '#E6A23C',
    icon: 'Money',
    description: '薪资谈判阶段',
    isFinal: false
  },
  CLOSED: {
    code: 'closed',
    label: '已成单',
    color: '#67C23A',
    icon: 'CircleCheck',
    description: '流程已闭环（成功入职）',
    isFinal: true,
    isSuccess: true
  },
  REJECTED: {
    code: 'rejected',
    label: '不合适',
    color: '#F56C6C',
    icon: 'CircleClose',
    description: '流程结束（未通过/放弃）',
    isFinal: true,
    isRejected: true
  }
}

// 子状态定义
export const SUB_STATUS = {
  resume_screening: {
    PENDING_REVIEW: {
      code: 'pending_review',
      label: '待筛选',
      color: '#909399',
      action: '决定是否进入面试环节',
      nextOptions: ['screening_passed', 'screening_rejected']
    },
    SCREENING_PASSED: {
      code: 'screening_passed',
      label: '已通过',
      color: '#67C23A',
      action: '简历筛选通过，准备安排面试',
      nextOptions: ['round_pending']
    },
    SCREENING_REJECTED: {
      code: 'screening_rejected',
      label: '不合适',
      color: '#F56C6C',
      action: '简历不符合要求，流程结束',
      isTerminal: true
    }
  },
  interviewing: {
    ROUND_PENDING: {
      code: 'round_pending',
      label: '待安排',
      color: '#E6A23C',
      action: '等待安排面试',
      nextOptions: ['round_scheduled', 'interview_rejected']
    },
    ROUND_SCHEDULED: {
      code: 'round_scheduled',
      label: '已安排',
      color: '#409EFF',
      action: '面试已安排，等待进行',
      nextOptions: ['round_passed', 'interview_rejected']
    },
    ROUND_PASSED: {
      code: 'round_passed',
      label: '本轮通过',
      color: '#67C23A',
      action: '本轮面试通过',
      nextOptions: ['round_pending', 'all_rounds_passed', 'interview_rejected']
    },
    ALL_ROUNDS_PASSED: {
      code: 'all_rounds_passed',
      label: '全部通过',
      color: '#67C23A',
      action: '所有面试轮次通过，进入谈薪',
      nextOptions: ['approval_pending']
    },
    INTERVIEW_REJECTED: {
      code: 'interview_rejected',
      label: '面试不通过',
      color: '#F56C6C',
      action: '面试未通过，流程结束',
      isTerminal: true
    }
  },
  salary_negotiation: {
    APPROVAL_PENDING: {
      code: 'approval_pending',
      label: '审批中',
      color: '#E6A23C',
      action: 'Offer审批中',
      nextOptions: ['offer_sent', 'salary_rejected']
    },
    OFFER_SENT: {
      code: 'offer_sent',
      label: '已发Offer',
      color: '#409EFF',
      action: '已发送Offer，等待候选人确认',
      nextOptions: ['offer_rejected']
    },
    // 注意：候选人接受后直接进入已成单主状态，不在谈薪中停留
    OFFER_REJECTED: {
      code: 'offer_rejected',
      label: '拒绝Offer',
      color: '#F56C6C',
      action: '候选人拒绝Offer，流程结束',
      isTerminal: true
    },
    SALARY_REJECTED: {
      code: 'salary_rejected',
      label: '谈薪失败',
      color: '#F56C6C',
      action: '薪资未达一致，流程结束',
      isTerminal: true
    }
  },
  closed: {
    PENDING_ONBOARD: {
      code: 'pending_onboard',
      label: '待入职',
      color: '#409EFF',
      action: '候选人接受Offer，等待入职',
      nextOptions: ['onboarded', 'onboard_abandoned']
    },
    ONBOARDED: {
      code: 'onboarded',
      label: '已入职',
      color: '#67C23A',
      action: '候选人已入职，流程成功完成',
      isTerminal: true,
      isSuccess: true
    },
    ONBOARD_ABANDONED: {
      code: 'onboard_abandoned',
      label: '放弃入职',
      color: '#F56C6C',
      action: '候选人入职前放弃，流程结束',
      isTerminal: true
    }
  },
  rejected: {
    // 各阶段的不合适/拒绝状态聚合在主状态rejected下
    SCREENING_REJECTED: {
      code: 'screening_rejected',
      label: '简历筛选不合适',
      color: '#F56C6C',
      action: '简历筛选阶段标记为不合适',
      isTerminal: true,
      category: 'screening'
    },
    INTERVIEW_REJECTED: {
      code: 'interview_rejected',
      label: '面试不通过',
      color: '#F56C6C',
      action: '面试阶段标记为不合适',
      isTerminal: true,
      category: 'interview'
    },
    SALARY_REJECTED: {
      code: 'salary_rejected',
      label: '谈薪失败',
      color: '#F56C6C',
      action: '谈薪阶段未达成一致',
      isTerminal: true,
      category: 'salary'
    },
    OFFER_REJECTED: {
      code: 'offer_rejected',
      label: '拒绝Offer',
      color: '#F56C6C',
      action: '候选人拒绝Offer',
      isTerminal: true,
      category: 'salary'
    },
    ONBOARD_ABANDONED_MAIN: {
      code: 'onboard_abandoned',
      label: '放弃入职',
      color: '#F56C6C',
      action: '入职前放弃',
      isTerminal: true,
      category: 'onboard'
    },
    GENERAL_REJECTED: {
      code: 'general_rejected',
      label: '其他不合适',
      color: '#F56C6C',
      action: '其他原因标记为不合适',
      isTerminal: true,
      category: 'other'
    }
  }
}

// 拒绝原因分类
export const REJECTION_REASONS = {
  RESUME_NOT_MATCH: { code: 'resume_not_match', label: '简历与职位不匹配', category: 'screening' },
  EXPERIENCE_NOT_ENOUGH: { code: 'experience_not_enough', label: '经验不足', category: 'screening' },
  SKILL_NOT_MATCH: { code: 'skill_not_match', label: '技能不匹配', category: 'screening' },
  SALARY_EXPECTATION_HIGH: { code: 'salary_expectation_high', label: '薪资期望过高', category: 'screening' },
  TECHNICAL_NOT_PASS: { code: 'technical_not_pass', label: '技术面试未通过', category: 'interview' },
  COMMUNICATION_ISSUE: { code: 'communication_issue', label: '沟通表达问题', category: 'interview' },
  CULTURE_NOT_MATCH: { code: 'culture_not_match', label: '文化价值观不匹配', category: 'interview' },
  ATTITUDE_ISSUE: { code: 'attitude_issue', label: '态度问题', category: 'interview' },
  STABILITY_CONCERN: { code: 'stability_concern', label: '稳定性顾虑', category: 'interview' },
  SALARY_NOT_AGREE: { code: 'salary_not_agree', label: '薪资未达成一致', category: 'salary' },
  CANDIDATE_REJECT_OFFER: { code: 'candidate_reject_offer', label: '候选人拒绝Offer', category: 'salary' },
  BENEFIT_NOT_SATISFIED: { code: 'benefit_not_satisfied', label: '福利不满意', category: 'salary' },
  GOT_OTHER_OFFER: { code: 'got_other_offer', label: '拿到其他Offer', category: 'salary' },
  CANDIDATE_ABANDON: { code: 'candidate_abandon', label: '候选人主动放弃', category: 'onboard' },
  COMPANY_DECISION: { code: 'company_decision', label: '公司决定取消', category: 'onboard' },
  PERSONAL_REASON: { code: 'personal_reason', label: '个人原因', category: 'onboard' },
  OTHER: { code: 'other', label: '其他原因', category: 'other' }
}

// 状态工具函数
export const StatusUtils = {
  getMainStatus(code) {
    return Object.values(MAIN_STATUS).find(s => s.code === code) || MAIN_STATUS.RESUME_SCREENING
  },
  
  getSubStatus(mainCode, subCode) {
    const subStatusGroup = SUB_STATUS[mainCode]
    if (!subStatusGroup) return null
    return Object.values(subStatusGroup).find(s => s.code === subCode)
  },
  
  getSubStatusList(mainCode) {
    const subStatusGroup = SUB_STATUS[mainCode]
    if (!subStatusGroup) return []
    return Object.values(subStatusGroup)
  },
  
  isTerminalStatus(mainStatus, subStatus) {
    if (!mainStatus) return false
    
    const terminalMainStatuses = ['closed', 'rejected']
    
    if (!terminalMainStatuses.includes(mainStatus)) {
      if (subStatus && (subStatus.includes('rejected') || subStatus.includes('abandoned'))) {
        return true
      }
      return false
    }
    
    if (mainStatus === 'closed') {
      return subStatus === 'onboarded'
    }
    
    return true
  },
  
  isSuccessStatus(mainStatus, subStatus) {
    return mainStatus === 'closed' && subStatus === 'onboarded'
  },
  
  isRejectedStatus(mainStatus, subStatus) {
    return mainStatus === 'rejected' || 
           (subStatus && (subStatus.includes('rejected') || subStatus.includes('abandoned')))
  },
  
  canRejectAtStage(mainStatus, subStatus) {
    if (this.isTerminalStatus(mainStatus, subStatus)) return false
    const rejectableStages = ['resume_screening', 'interviewing', 'salary_negotiation', 'closed']
    return rejectableStages.includes(mainStatus)
  },
  
  getRejectionSubStatus(mainStatus) {
    const rejectionMap = {
      'resume_screening': 'screening_rejected',
      'interviewing': 'interview_rejected',
      'salary_negotiation': 'salary_rejected',
      'closed': 'onboard_abandoned'
    }
    return rejectionMap[mainStatus] || 'screening_rejected'
  },
  
  getStatusFlow(mainStatus, subStatus) {
    const current = this.getSubStatus(mainStatus, subStatus)
    if (!current) return []
    return current.nextOptions || []
  },
  
  getAllTerminalStatuses() {
    const terminals = []
    for (const [mainCode, subStatuses] of Object.entries(SUB_STATUS)) {
      for (const sub of Object.values(subStatuses)) {
        if (sub.isTerminal) {
          terminals.push({
            mainStatus: mainCode,
            subStatus: sub.code,
            label: sub.label,
            isSuccess: sub.isSuccess || false
          })
        }
      }
    }
    return terminals
  }
}
