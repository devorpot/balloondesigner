import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomeView.vue'),
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('@/pages/EditorView.vue'),
  },
  {
    path: '/grid',
    name: 'grid-designer',
    component: () => import('@/pages/GridDesignerView.vue'),
  },
  {
    path: '/guide',
    name: 'guide-wall',
    component: () => import('@/pages/GuideView.vue'),
  },
  {
    path: '/builder',
    name: 'builder-canvas',
    component: () => import('@/pages/BuilderView.vue'),
  },
  {
    path: '/structure',
    name: 'structure-canvas',
    component: () => import('@/pages/StructureView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
