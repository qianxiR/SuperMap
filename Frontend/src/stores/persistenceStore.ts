import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * 简化的状态持久化管理Store
 * 只管理主题状态的持久化
 */
export const usePersistenceStore = defineStore('persistence', () => {
  // ===== 持久化配置 =====
  const persistenceConfig = ref({
    // 存储键前缀
    storagePrefix: 'supermap_',
    // 是否启用持久化
    enabled: true
  })

  // ===== 存储键映射 =====
  const getStorageKey = (storeName: string) => {
    return `${persistenceConfig.value.storagePrefix}${storeName}`
  }

  // ===== 持久化方法 =====

  /**
   * 保存主题状态到localStorage
   */
  const saveThemeState = async () => {
    if (!persistenceConfig.value.enabled) return

    try {
      const { useThemeStore } = await import('./themeStore')
      const themeStore = useThemeStore()
      
      const key = getStorageKey('theme')
      const data = {
        theme: themeStore.theme,
        timestamp: Date.now(),
        version: '1.0'
      }
      localStorage.setItem(key, JSON.stringify(data))
      console.log('主题状态已保存到本地存储')
    } catch (error) {
      console.error('保存主题状态失败:', error)
    }
  }

  /**
   * 从localStorage加载主题状态
   */
  const loadThemeState = async () => {
    if (!persistenceConfig.value.enabled) return


      const key = getStorageKey('theme')
      const dataStr = localStorage.getItem(key)
      if (!dataStr) return

      const data = JSON.parse(dataStr)
      const { useThemeStore } = await import('./themeStore')
      const themeStore = useThemeStore()
      themeStore.setTheme(data.theme)
    

  }

  /**
   * 清除主题持久化数据
   */
  const clearThemeState = () => {
    try {
      const key = getStorageKey('theme')
      localStorage.removeItem(key)
      console.log('已清除主题的持久化数据')
    } catch (error) {
      console.error('清除主题状态失败:', error)
    }
  }

  // ===== 页面卸载时保存状态 =====
  const handleBeforeUnload = () => {
    saveThemeState()
  }

  // ===== 初始化 =====
  const initialize = () => {
    // 页面加载时恢复主题状态
    loadThemeState()
    
    // 监听页面卸载事件
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  // ===== 清理 =====
  const cleanup = () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  return {
    // ===== 状态 =====
    persistenceConfig,

    // ===== 方法 =====
    saveThemeState,
    loadThemeState,
    clearThemeState,
    initialize,
    cleanup
  }
})
