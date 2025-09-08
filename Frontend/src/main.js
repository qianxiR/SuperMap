import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/theme.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// 延迟初始化持久化，避免循环依赖
setTimeout(async () => {
  try {
    const { usePersistenceStore } = await import('./stores/persistenceStore')
    const persistenceStore = usePersistenceStore()
    persistenceStore.initialize()
    console.log('状态持久化已初始化')
  } catch (error) {
    console.error('初始化状态持久化失败:', error)
  }
}, 500)
