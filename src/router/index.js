import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AIConfigView from '../views/AIConfigView.vue'
import InterviewFlowView from '../views/InterviewFlowView.vue'
import FlowDashboardView from '../views/FlowDashboardView.vue'
import InterviewsView from '../views/InterviewsView.vue'
import DashboardView from '../views/DashboardView.vue'
import DashboardViewNew from '../views/DashboardViewNew.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/dashboard-new',
      name: 'dashboardNew',
      component: DashboardViewNew,
      meta: { 
        title: '招聘管理中心（新）',
        description: '支持新状态系统的 Dashboard'
      }
    },
    {
      path: '/config',
      name: 'config',
      component: AIConfigView
    },
    {
      path: '/interview-flow',
      name: 'interviewFlow',
      component: InterviewFlowView
    },
    {
      path: '/flow-dashboard',
      name: 'flowDashboard',
      component: FlowDashboardView
    },
    {
      path: '/interviews',
      name: 'interviews',
      component: InterviewsView
    }
  ]
})

export default router
