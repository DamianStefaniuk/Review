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

// Validate hash to ensure it's a safe CSS selector (only alphanumeric, hyphens, underscores, dots)
const isValidHashSelector = (hash) => {
  if (!hash || typeof hash !== 'string') return false
  // Hash should start with # and contain only safe characters for CSS selectors
  // Dots are allowed for IDs that contain periods (e.g., section.1.2)
  return /^#[a-zA-Z0-9._-]+$/.test(hash)
}

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash && isValidHashSelector(to.hash)) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})

export default router
