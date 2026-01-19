import { createRouter, createWebHashHistory } from 'vue-router'
import SprintView from '../views/SprintView.vue'
import PresentationMode from '../views/PresentationMode.vue'

const routes = [
  {
    path: '/',
    redirect: '/sprint'
  },
  {
    path: '/sprint/:sprintId?',
    name: 'sprint',
    component: SprintView,
    props: true
  },
  {
    path: '/sprint/:sprintId/goal/:goalId',
    name: 'goal',
    component: SprintView,
    props: true
  },
  {
    path: '/presentation/:sprintId?',
    name: 'presentation',
    component: PresentationMode,
    props: true
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})

export default router
