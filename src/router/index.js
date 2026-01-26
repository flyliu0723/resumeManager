import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AIConfigView from '../views/AIConfigView.vue'
import InterviewFlowView from '../views/InterviewFlowView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
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
    }
  ]
})

export default router
