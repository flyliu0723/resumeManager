import { api } from './api'

export const interviewFlowApi = {
  getCandidates: (params = {}) => {
    return api.get('/interview-flow/candidates', params)
  },

  getOverview: (params = {}) => {
    return api.get('/interview-flow/overview', params)
  },

  getRiskFactors: (params = {}) => {
    return api.get('/interview-flow/risk-factors', params)
  },

  getTimeline: (params = {}) => {
    return api.get('/interview-flow/timeline', params)
  }
}
