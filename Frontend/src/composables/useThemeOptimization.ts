import { ref, nextTick } from 'vue'
import { useThemeStore } from '@/stores/themeStore'

export function useThemeOptimization() {
  const themeStore = useThemeStore()
  const isTransitioning = ref(false)
  const transitionDuration = 0 // 毫秒

  // 直接同步主题切换，不使用预渲染容器

  // 优化的主题切换函数
  const optimizedToggleTheme = async () => {
    if (isTransitioning.value) return
    
    isTransitioning.value = true
    const newTheme = themeStore.theme === 'light' ? 'dark' : 'light'
    
    try {
      // 1. 同步更新：CSS变量 + data-theme + store状态
      const root = document.documentElement
      const newThemeVars = getThemeVariables(newTheme)
      
      // 批量更新CSS变量
      Object.entries(newThemeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
      
      // 同步更新data-theme属性
      root.setAttribute('data-theme', newTheme)
      
      // 同步更新store状态
      themeStore.setTheme(newTheme)
      
      // 2. 立即触发地图主题更新事件（同步执行）
      window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: newTheme }
      }))
      
      // 3. 等待一帧确保所有更新完成
      await new Promise(resolve => requestAnimationFrame(resolve))
      
      // 4. 完成切换
      isTransitioning.value = false
      
      // 5. 触发通知
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '主题已切换',
          message: `已切换到${newTheme === 'light' ? '浅色' : '深色'}主题`,
          type: 'info',
          duration: 2000
        }
      }))
      
    } catch (error) {
      console.error('主题切换失败:', error)
      isTransitioning.value = false
    }
  }

  // 获取主题变量
  const getThemeVariables = (theme: 'light' | 'dark') => {
    const lightVars = {
      '--bg': '#f8f9fa',
      '--panel': '#f9f9f9',
      '--border': '#dee2e6',
      '--text': '#4a5568',
      '--text-secondary': '#495057',
      '--sub': '#6c757d',
      '--accent': '#0078D4',
      '--accent-rgb': '0, 120, 212',
      '--accent-light': 'rgba(0, 120, 212, 0.1)',
      '--glow': '0 2px 8px rgba(0, 0, 0, 0.08)',
      '--btn-primary-bg': '#0078D4',
      '--btn-primary-color': '#ffffff',
      '--btn-secondary-bg': '#e0e0e0',
      '--btn-secondary-color': '#4a5568',
      '--surface': 'rgba(0, 0, 0, 0.03)',
      '--surface-hover': 'rgba(0, 0, 0, 0.06)',
      '--splitter-bg': 'rgba(0, 0, 0, 0.1)',
      '--splitter-hover': '#0078D4',
      '--selection-bg': 'rgba(0, 0, 0, 0.1)',
      '--map-highlight-color': '#0078D4',
      '--draw-color': '#0078D4',
      '--draw-rgb': '0, 120, 212',
      '--analysis-color': '#0078D4',
      '--analysis-rgb': '0, 120, 212',
      '--upload-color': '#4a5568',
      '--upload-rgb': '74, 85, 104'
    }

    const darkVars = {
      '--bg': '#1e1e1e',
      '--panel': '#262626',
      '--border': '#3c3c3c',
      '--text': '#ffffff',
      '--text-secondary': '#b0b0b0',
      '--sub': '#cccccc',
      '--accent': '#0078D4',
      '--accent-rgb': '0, 120, 212',
      '--accent-light': 'rgba(0, 120, 212, 0.1)',
      '--glow': '0 2px 8px rgba(0, 0, 0, 0.4)',
      '--btn-primary-bg': '#0078D4',
      '--btn-primary-color': '#ffffff',
      '--btn-secondary-bg': '#3c3c3c',
      '--btn-secondary-color': '#ffffff',
      '--surface': 'rgba(255, 255, 255, 0.03)',
      '--surface-hover': 'rgba(255, 255, 255, 0.06)',
      '--splitter-bg': 'rgba(255, 255, 255, 0.1)',
      '--splitter-hover': '#0078D4',
      '--selection-bg': 'rgba(255, 255, 255, 0.1)',
      '--map-highlight-color': '#0078D4',
      '--draw-color': '#0078D4',
      '--draw-rgb': '0, 120, 212',
      '--analysis-color': '#0078D4',
      '--analysis-rgb': '0, 120, 212',
      '--upload-color': '#ffffff',
      '--upload-rgb': '255, 255, 255'
    }

    return theme === 'light' ? lightVars : darkVars
  }

  // 同步主题切换（用于地图等需要特殊处理的组件）
  const syncThemeChange = async (callback: () => Promise<void>) => {
    if (isTransitioning.value) {
      // 如果正在切换中，等待切换完成
      const checkTransition = () => {
        return new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (!isTransitioning.value) {
              clearInterval(interval)
              resolve()
            }
          }, 10)
        })
      }
      await checkTransition()
    }
    
    await callback()
  }

  return {
    isTransitioning,
    optimizedToggleTheme,
    syncThemeChange
  }
}

