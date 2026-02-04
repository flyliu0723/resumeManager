/**
 * 招聘流程状态系统常量定义
 * 主状态 + 子状态架构
 * 
 * 支持全流程回退到"不合适"终态：
 * - 简历筛选 → 不合适
 * - 面试中 → 不合适（面试不通过）
 * - 谈薪中 → 不合适（谈薪失败）
 * - 已成单 → 不合适（入职前放弃）
 */

// 主状态定义
const MAIN_STATUS = {
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

// 子状态定义（按主状态分组）
const SUB_STATUS = {
  // 简历筛选阶段的子状态
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
      nextOptions: ['round_pending'] // 流向面试中
    },
    SCREENING_REJECTED: {
      code: 'screening_rejected',
      label: '不合适',
      color: '#F56C6C',
      action: '简历不符合要求，流程结束',
      isTerminal: true,
      terminalReason: '简历不合适'
    }
  },
  
  // 面试中阶段的子状态
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
      nextOptions: ['round_pending', 'all_rounds_passed', 'interview_rejected'] // 可以继续下一轮或全部通过
    },
    ALL_ROUNDS_PASSED: {
      code: 'all_rounds_passed',
      label: '全部通过',
      color: '#67C23A',
      action: '所有面试轮次通过，进入谈薪',
      nextOptions: ['approval_pending'] // 流向谈薪中
    },
    INTERVIEW_REJECTED: {
      code: 'interview_rejected',
      label: '面试不通过',
      color: '#F56C6C',
      action: '面试未通过，流程结束',
      isTerminal: true,
      terminalReason: '面试不合适'
    }
  },
  
  // 谈薪中阶段的子状态
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
      nextOptions: ['offer_rejected', 'pending_onboard'] // 接受offer直接进入待入职
    },
    OFFER_REJECTED: {
      code: 'offer_rejected',
      label: '拒绝Offer',
      color: '#F56C6C',
      action: '候选人拒绝Offer，流程结束',
      isTerminal: true,
      terminalReason: '谈薪失败'
    },
    SALARY_REJECTED: {
      code: 'salary_rejected',
      label: '谈薪失败',
      color: '#F56C6C',
      action: '薪资未达一致，流程结束',
      isTerminal: true,
      terminalReason: '谈薪不合适'
    }
  },
  
  // 已成单阶段的子状态
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
      isSuccess: true,
      terminalReason: '成功入职'
    },
    ONBOARD_ABANDONED: {
      code: 'onboard_abandoned',
      label: '放弃入职',
      color: '#F56C6C',
      action: '候选人入职前放弃，流程结束',
      isTerminal: true,
      terminalReason: '入职前放弃'
    }
  },
  
  // 不合适终态的子状态（汇总各阶段的拒绝）
  rejected: {
    SCREENING_REJECTED: {
      code: 'screening_rejected',
      label: '简历不合适',
      color: '#F56C6C',
      originalMainStatus: 'resume_screening',
      rejectReasonCategory: '简历筛选未通过'
    },
    INTERVIEW_REJECTED: {
      code: 'interview_rejected',
      label: '面试不通过',
      color: '#F56C6C',
      originalMainStatus: 'interviewing',
      rejectReasonCategory: '面试未通过'
    },
    SALARY_REJECTED: {
      code: 'salary_rejected',
      label: '谈薪失败',
      color: '#F56C6C',
      originalMainStatus: 'salary_negotiation',
      rejectReasonCategory: '薪资谈判失败'
    },
    OFFER_REJECTED: {
      code: 'offer_rejected',
      label: '拒绝Offer',
      color: '#F56C6C',
      originalMainStatus: 'salary_negotiation',
      rejectReasonCategory: '候选人拒绝Offer'
    },
    ONBOARD_ABANDONED: {
      code: 'onboard_abandoned',
      label: '放弃入职',
      color: '#F56C6C',
      originalMainStatus: 'closed',
      rejectReasonCategory: '入职前放弃'
    }
  }
}

// 面试轮次状态
const ROUND_STATUS = {
  PENDING: {
    code: 'pending',
    label: '待安排',
    color: '#909399'
  },
  SCHEDULED: {
    code: 'scheduled',
    label: '已安排',
    color: '#409EFF'
  },
  COMPLETED: {
    code: 'completed',
    label: '已完成',
    color: '#67C23A'
  },
  CANCELLED: {
    code: 'cancelled',
    label: '已取消',
    color: '#F56C6C'
  }
}

// 面试结果
const ROUND_RESULT = {
  PASSED: {
    code: 'passed',
    label: '通过',
    color: '#67C23A'
  },
  FAILED: {
    code: 'failed',
    label: '未通过',
    color: '#F56C6C'
  },
  PENDING: {
    code: 'pending',
    label: '待定',
    color: '#E6A23C'
  }
}

// 拒绝原因分类（用于统计和分析）
const REJECTION_REASONS = {
  // 简历筛选阶段
  RESUME_NOT_MATCH: { code: 'resume_not_match', label: '简历与职位不匹配', category: 'screening' },
  EXPERIENCE_NOT_ENOUGH: { code: 'experience_not_enough', label: '经验不足', category: 'screening' },
  SKILL_NOT_MATCH: { code: 'skill_not_match', label: '技能不匹配', category: 'screening' },
  SALARY_EXPECTATION_HIGH: { code: 'salary_expectation_high', label: '薪资期望过高', category: 'screening' },
  
  // 面试阶段
  TECHNICAL_NOT_PASS: { code: 'technical_not_pass', label: '技术面试未通过', category: 'interview' },
  COMMUNICATION_ISSUE: { code: 'communication_issue', label: '沟通表达问题', category: 'interview' },
  CULTURE_NOT_MATCH: { code: 'culture_not_match', label: '文化价值观不匹配', category: 'interview' },
  ATTITUDE_ISSUE: { code: 'attitude_issue', label: '态度问题', category: 'interview' },
  STABILITY_CONCERN: { code: 'stability_concern', label: '稳定性顾虑', category: 'interview' },
  
  // 谈薪阶段
  SALARY_NOT_AGREE: { code: 'salary_not_agree', label: '薪资未达成一致', category: 'salary' },
  CANDIDATE_REJECT_OFFER: { code: 'candidate_reject_offer', label: '候选人拒绝Offer', category: 'salary' },
  BENEFIT_NOT_SATISFIED: { code: 'benefit_not_satisfied', label: '福利不满意', category: 'salary' },
  GOT_OTHER_OFFER: { code: 'got_other_offer', label: '拿到其他Offer', category: 'salary' },
  
  // 入职前阶段
  CANDIDATE_ABANDON: { code: 'candidate_abandon', label: '候选人主动放弃', category: 'onboard' },
  COMPANY_DECISION: { code: 'company_decision', label: '公司决定取消', category: 'onboard' },
  PERSONAL_REASON: { code: 'personal_reason', label: '个人原因', category: 'onboard' },
  
  // 其他
  OTHER: { code: 'other', label: '其他原因', category: 'other' }
}

// 旧状态映射到新状态（用于数据迁移）
const STATUS_MIGRATION_MAP = {
  '待沟通': { main_status: 'resume_screening', sub_status: 'pending_review' },
  '待面试': { main_status: 'interviewing', sub_status: 'round_pending' },
  '面试中': { main_status: 'interviewing', sub_status: 'round_scheduled' },
  '已通过': { main_status: 'salary_negotiation', sub_status: 'approval_pending' },
  '已拒绝': { main_status: 'rejected', sub_status: 'screening_rejected' },
  '未解析': { main_status: 'resume_screening', sub_status: 'pending_review' },
  '已解析': { main_status: 'resume_screening', sub_status: 'pending_review' }
}

// 面试评价维度模板
const FEEDBACK_DIMENSIONS = [
  { name: '技术能力', weight: 1.0, maxScore: 100 },
  { name: '项目经验', weight: 1.0, maxScore: 100 },
  { name: '沟通能力', weight: 0.8, maxScore: 100 },
  { name: '逻辑思维', weight: 0.8, maxScore: 100 },
  { name: '文化匹配', weight: 0.6, maxScore: 100 },
  { name: '学习能力', weight: 0.6, maxScore: 100 }
]

// 工具函数
const StatusUtils = {
  // 获取主状态定义
  getMainStatus(code) {
    return Object.values(MAIN_STATUS).find(s => s.code === code) || MAIN_STATUS.RESUME_SCREENING
  },
  
  // 获取子状态定义
  getSubStatus(mainCode, subCode) {
    const subStatusGroup = SUB_STATUS[mainCode]
    if (!subStatusGroup) return null
    return Object.values(subStatusGroup).find(s => s.code === subCode)
  },
  
  // 获取主状态的所有子状态
  getSubStatusList(mainCode) {
    const subStatusGroup = SUB_STATUS[mainCode]
    if (!subStatusGroup) return []
    return Object.values(subStatusGroup)
  },
  
  // 判断是否为终态
  isTerminalStatus(mainStatus, subStatus) {
    const sub = this.getSubStatus(mainStatus, subStatus)
    if (!sub) return false
    return sub.isTerminal || false
  },
  
  // 判断是否成功入职
  isSuccessStatus(mainStatus, subStatus) {
    return mainStatus === 'closed' && subStatus === 'onboarded'
  },
  
  // 判断是否被拒绝
  isRejectedStatus(mainStatus, subStatus) {
    return mainStatus === 'rejected' || (subStatus && subStatus.includes('rejected')) || (subStatus && subStatus.includes('abandoned'))
  },
  
  // 判断是否可以进入下一轮面试
  canProceedToNextRound(mainStatus, subStatus, currentRound) {
    if (mainStatus !== 'interviewing') return false
    if (subStatus !== 'round_passed') return false
    return true
  },
  
  // 判断是否可以谈薪
  canNegotiateSalary(mainStatus, subStatus) {
    return mainStatus === 'interviewing' && subStatus === 'all_rounds_passed'
  },
  
  // 判断是否可以发Offer
  canSendOffer(mainStatus, subStatus) {
    return mainStatus === 'salary_negotiation' && subStatus === 'approval_pending'
  },
  
  // 判断是否可以在当前阶段拒绝
  canRejectAtStage(mainStatus, subStatus) {
    // 各阶段都可以拒绝，除非是已经终态的
    if (this.isTerminalStatus(mainStatus, subStatus)) return false
    
    const rejectableStages = ['resume_screening', 'interviewing', 'salary_negotiation', 'closed']
    return rejectableStages.includes(mainStatus)
  },
  
  // 获取拒绝时的目标子状态
  getRejectionSubStatus(mainStatus, rejectReason) {
    const rejectionMap = {
      'resume_screening': 'screening_rejected',
      'interviewing': 'interview_rejected',
      'salary_negotiation': rejectReason?.includes('salary') ? 'salary_rejected' : 'offer_rejected',
      'closed': 'onboard_abandoned'
    }
    return rejectionMap[mainStatus] || 'screening_rejected'
  },
  
  // 迁移旧状态
  migrateOldStatus(oldStatus) {
    return STATUS_MIGRATION_MAP[oldStatus] || { 
      main_status: 'resume_screening', 
      sub_status: 'pending_review' 
    }
  },
  
  // 获取状态流转图
  getStatusFlow(mainStatus, subStatus) {
    const current = this.getSubStatus(mainStatus, subStatus)
    if (!current) return []
    return current.nextOptions || []
  },
  
  // 获取跨主状态的流转选项（用于处理如谈薪中->已成单的情况）
  getCrossMainStatusFlow(mainStatus, subStatus) {
    const nextOptions = this.getStatusFlow(mainStatus, subStatus)
    return nextOptions.map(code => {
      // 首先在当前主状态下查找
      let subStatusInfo = this.getSubStatus(mainStatus, code)
      let targetMainStatus = mainStatus
      
      // 如果当前主状态下找不到，则在所有主状态中查找
      if (!subStatusInfo) {
        for (const [mCode, subStatuses] of Object.entries(SUB_STATUS)) {
          const found = Object.values(subStatuses).find(s => s.code === code)
          if (found) {
            subStatusInfo = found
            targetMainStatus = mCode
            break
          }
        }
      }
      
      return {
        code,
        targetMainStatus,
        label: subStatusInfo?.label || code,
        action: subStatusInfo?.action || '',
        isTerminal: subStatusInfo?.isTerminal || false
      }
    })
  },
  
  // 获取所有终态列表（用于统计流失率）
  getAllTerminalStatuses() {
    const terminals = []
    for (const [mainCode, subStatuses] of Object.entries(SUB_STATUS)) {
      for (const sub of Object.values(subStatuses)) {
        if (sub.isTerminal) {
          terminals.push({
            mainStatus: mainCode,
            subStatus: sub.code,
            label: sub.label,
            reason: sub.terminalReason,
            isSuccess: sub.isSuccess || false
          })
        }
      }
    }
    return terminals
  }
}

module.exports = {
  MAIN_STATUS,
  SUB_STATUS,
  ROUND_STATUS,
  ROUND_RESULT,
  REJECTION_REASONS,
  STATUS_MIGRATION_MAP,
  FEEDBACK_DIMENSIONS,
  StatusUtils
}
