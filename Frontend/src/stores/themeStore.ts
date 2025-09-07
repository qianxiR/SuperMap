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
  
  // 优化的主题切换
  const toggleTheme = async () => {
    // 动态导入以避免循环依赖
    const { useThemeOptimization } = await import('@/composables/useThemeOptimization')
    const { optimizedToggleTheme } = useThemeOptimization()
    await optimizedToggleTheme()
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