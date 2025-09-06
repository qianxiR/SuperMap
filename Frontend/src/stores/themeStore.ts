import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  // 从localStorage读取主题设置，默认为浅色主题
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'light')
  
  // 应用主题到DOM
  const applyTheme = (newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  }
  
  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'
    theme.value = newTheme
    
    // 触发主题切换通知
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '主题已切换',
        message: `已切换到${newTheme === 'light' ? '浅色' : '深色'}主题`,
        type: 'info',
        duration: 2000
      }
    }))
  }
  
  // 设置指定主题
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
  }
  
  // 监听主题变化，自动应用到DOM和localStorage
  watch(theme, (newTheme) => {
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }, { immediate: true })
  
  // 检测系统主题偏好
  const detectSystemTheme = (): Theme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  // 应用系统主题
  const applySystemTheme = () => {
    if (!localStorage.getItem('theme')) {
      setTheme(detectSystemTheme())
    }
  }
  
  // 监听系统主题变化
  const setupSystemThemeListener = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    })
  }
  
  return {
    theme,
    toggleTheme,
    setTheme,
    detectSystemTheme,
    applySystemTheme,
    setupSystemThemeListener
  }
})