import { ref, nextTick } from 'vue'
import { useThemeStore } from '@/stores/themeStore'

export function useThemeOptimization() {
  const themeStore = useThemeStore()
  const isTransitioning = ref(false)
  const transitionDuration = 150 // 毫秒

  // 预渲染主题状态
  const preRenderThemes = () => {
    const root = document.documentElement
    const currentTheme = themeStore.theme
    
    // 创建两个隐藏的容器来预渲染两种主题
    const lightContainer = document.createElement('div')
    const darkContainer = document.createElement('div')
    
    lightContainer.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
      z-index: -1;
    `
    
    darkContainer.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
      z-index: -1;
    `
    
    // 设置预渲染容器的主题
    lightContainer.setAttribute('data-theme', 'light')
    darkContainer.setAttribute('data-theme', 'dark')
    
    // 克隆当前页面内容到预渲染容器
    const currentContent = document.body.cloneNode(true) as HTMLElement
    lightContainer.appendChild(currentContent.cloneNode(true))
    darkContainer.appendChild(currentContent.cloneNode(true))
    
    document.body.appendChild(lightContainer)
    document.body.appendChild(darkContainer)
    
    // 强制浏览器渲染预渲染容器
    lightContainer.offsetHeight
    darkContainer.offsetHeight
    
    return { lightContainer, darkContainer }
  }

  // 优化的主题切换函数
  const optimizedToggleTheme = async () => {
    if (isTransitioning.value) return
    
    isTransitioning.value = true
    const newTheme = themeStore.theme === 'light' ? 'dark' : 'light'
    
    try {
      // 1. 预渲染新主题
      const { lightContainer, darkContainer } = preRenderThemes()
      
      // 2. 使用 requestAnimationFrame 确保在下一帧执行
      await new Promise(resolve => requestAnimationFrame(resolve))
      
      // 3. 批量更新所有主题相关的CSS变量
      const root = document.documentElement
      const newThemeVars = getThemeVariables(newTheme)
      
      // 使用 CSS 自定义属性批量更新
      Object.entries(newThemeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
      
      // 4. 更新 data-theme 属性
      root.setAttribute('data-theme', newTheme)
      
      // 5. 等待一帧确保DOM更新完成
      await new Promise(resolve => requestAnimationFrame(resolve))
      
      // 6. 更新store状态
      themeStore.setTheme(newTheme)
      
      // 7. 清理预渲染容器
      setTimeout(() => {
        lightContainer.remove()
        darkContainer.remove()
        isTransitioning.value = false
      }, transitionDuration)
      
      // 8. 触发通知
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
      '--text': '#212529',
      '--text-secondary': '#495057',
      '--sub': '#6c757d',
      '--accent': '#0078D4',
      '--accent-rgb': '0, 120, 212',
      '--accent-light': 'rgba(0, 120, 212, 0.1)',
      '--glow': '0 2px 8px rgba(0, 0, 0, 0.08)',
      '--btn-primary-bg': '#0078D4',
      '--btn-primary-color': '#ffffff',
      '--btn-secondary-bg': '#e0e0e0',
      '--btn-secondary-color': '#212529',
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
      '--upload-color': '#212529',
      '--upload-rgb': '33, 37, 41'
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
