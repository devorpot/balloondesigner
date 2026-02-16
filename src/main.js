import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'


import { useCatalogStore } from '@/stores/catalog.store'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import 'bootstrap-icons/font/bootstrap-icons.css'

import '@/assets/styles/main.less'

import App from './App.vue'

import VueKonva from 'vue-konva'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const catalog = useCatalogStore()
catalog.init()
app.use(router)
app.use(VueKonva)

app.mount('#app')
