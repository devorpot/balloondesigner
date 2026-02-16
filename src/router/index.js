import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/editor'
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('@/pages/EditorView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
