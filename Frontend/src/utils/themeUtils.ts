/**
 * 主题工具函数
 * 统一管理主题切换、颜色获取等重复逻辑
 */

// 主题类型
export type Theme = 'light' | 'dark'

// 主题颜色配置接口
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  shadow: string
  highlight: string
  hover: string
  select: string
}

// 地图主题颜色配置接口
export interface MapThemeColors {
  baseMap: string
  highlight: string
  hover: string
  select: string
  draw: string
  analysis: string
  upload: string
  path: string
}

/**
 * 获取当前主题
 */
export const getCurrentTheme = (): Theme => {
  const theme = document.documentElement.getAttribute('data-theme')
  return (theme === 'dark' || theme === 'light') ? theme : 'light'
}

/**
 * 设置主题
 */
export const setTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

/**
 * 切换主题
 */
export const toggleTheme = (): Theme => {
  const currentTheme = getCurrentTheme()
  const newTheme = currentTheme === 'light' ? 'dark' : 'light'
  setTheme(newTheme)
  
  // 自动触发主题变化事件
  dispatchThemeChangeEvent(newTheme)
  
  return newTheme
}

/**
 * 获取CSS变量值，支持回退机制
 */
export const getCSSVariable = (variable: string, fallback: string = ''): string => {
  const css = getComputedStyle(document.documentElement)
  return css.getPropertyValue(variable).trim() || fallback
}

/**
 * 获取主题相关的颜色
 */
export const getThemeColor = (lightColor: string, darkColor: string): string => {
  const currentTheme = getCurrentTheme()
  return currentTheme === 'dark' ? darkColor : lightColor
}

/**
 * 获取完整的主题颜色配置
 */
export const getThemeColors = (): ThemeColors => {
  const currentTheme = getCurrentTheme()
  
  if (currentTheme === 'dark') {
    return {
      primary: getCSSVariable('--primary', '#0078D4'),
      secondary: getCSSVariable('--secondary', '#6C757D'),
      accent: getCSSVariable('--accent', '#0078D4'),
      background: getCSSVariable('--bg', '#1a1a1a'),
      surface: getCSSVariable('--panel', '#2d2d2d'),
      text: getCSSVariable('--text', '#ffffff'),
      textSecondary: getCSSVariable('--text-secondary', '#cccccc'),
      border: getCSSVariable('--border', '#404040'),
      shadow: getCSSVariable('--shadow', 'rgba(0, 0, 0, 0.3)'),
      highlight: getCSSVariable('--highlight', '#0078D4'),
      hover: getCSSVariable('--hover', 'rgba(255, 255, 255, 0.1)'),
      select: getCSSVariable('--select', 'rgba(255, 255, 255, 0.2)')
    }
  } else {
    return {
      primary: getCSSVariable('--primary', '#0078D4'),
      secondary: getCSSVariable('--secondary', '#6C757D'),
      accent: getCSSVariable('--accent', '#0078D4'),
      background: getCSSVariable('--bg', '#ffffff'),
      surface: getCSSVariable('--panel', '#f8f9fa'),
      text: getCSSVariable('--text', '#212529'),
      textSecondary: getCSSVariable('--text-secondary', '#6c757d'),
      border: getCSSVariable('--border', '#dee2e6'),
      shadow: getCSSVariable('--shadow', 'rgba(0, 0, 0, 0.1)'),
      highlight: getCSSVariable('--highlight', '#0078D4'),
      hover: getCSSVariable('--hover', 'rgba(0, 0, 0, 0.05)'),
      select: getCSSVariable('--select', 'rgba(0, 0, 0, 0.1)')
    }
  }
}

/**
 * 获取地图主题颜色配置
 */
export const getMapThemeColors = (): MapThemeColors => {
  const currentTheme = getCurrentTheme()
  
  if (currentTheme === 'dark') {
    return {
      baseMap: getCSSVariable('--base-map-dark', ''),
      highlight: getCSSVariable('--map-highlight-color', '#ffffff'),
      hover: getCSSVariable('--map-hover-fill', 'rgba(0, 123, 255, 0.3)'),
      select: getCSSVariable('--map-select-fill', 'rgba(255, 255, 255, 0.15)'),
      draw: getCSSVariable('--draw-color', '#0078D4'),
      analysis: getCSSVariable('--analysis-color', '#dc3545'),
      upload: getCSSVariable('--upload-color', '#28a745'),
      path: getCSSVariable('--path-color', '#0078D4')
    }
  } else {
    return {
      baseMap: getCSSVariable('--base-map-light', ''),
      highlight: getCSSVariable('--map-highlight-color', '#000000'),
      hover: getCSSVariable('--map-hover-fill', 'rgba(0, 123, 255, 0.3)'),
      select: getCSSVariable('--map-select-fill', 'rgba(33, 37, 41, 0.15)'),
      draw: getCSSVariable('--draw-color', '#0078D4'),
      analysis: getCSSVariable('--analysis-color', '#dc3545'),
      upload: getCSSVariable('--upload-color', '#28a745'),
      path: getCSSVariable('--path-color', '#0078D4')
    }
  }
}

/**
 * 获取图层特定的颜色
 */
export const getLayerColor = (layerType: string): string => {
  const mapColors = getMapThemeColors()
  
  const colorMap: Record<string, string> = {
    'draw': mapColors.draw,
    'analysis': mapColors.analysis,
    'upload': mapColors.upload,
    'path': mapColors.path,
    'buffer': mapColors.analysis,
    'intersect': mapColors.analysis,
    'erase': mapColors.analysis,
    'query': mapColors.analysis,
    'area': mapColors.analysis
  }
  
  return colorMap[layerType] || mapColors.analysis
}

/**
 * 创建主题变化事件
 */
export const createThemeChangeEvent = (newTheme: Theme): CustomEvent => {
  return new CustomEvent('themeChanged', {
    detail: { theme: newTheme },
    bubbles: true,
    cancelable: true
  })
}

/**
 * 分发主题变化事件
 */
export const dispatchThemeChangeEvent = (newTheme: Theme): boolean => {
  const event = createThemeChangeEvent(newTheme)
  return window.dispatchEvent(event)
}

/**
 * 监听主题变化
 */
export const onThemeChange = (callback: (theme: Theme) => void): () => void => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent
    callback(customEvent.detail.theme)
  }
  
  window.addEventListener('themeChanged', handler)
  
  return () => {
    window.removeEventListener('themeChanged', handler)
  }
}

/**
 * 应用主题到元素
 * 为指定元素应用主题相关的CSS类
 */
export const applyThemeToElement = (element: HTMLElement, theme?: Theme): void => {
  const currentTheme = theme || getCurrentTheme()
  
  // 移除旧的主题类
  element.classList.remove('theme-light', 'theme-dark')
  
  // 添加新的主题类
  element.classList.add(`theme-${currentTheme}`)
}

/**
 * 获取主题相关的图标
 * 根据当前主题返回对应的图标
 */
export const getThemeIcon = (lightIcon: string, darkIcon: string): string => {
  const currentTheme = getCurrentTheme()
  return currentTheme === 'dark' ? darkIcon : lightIcon
}

/**
 * 检查是否为深色主题
 */
export const isDarkTheme = (): boolean => {
  return getCurrentTheme() === 'dark'
}

/**
 * 检查是否为浅色主题
 */
export const isLightTheme = (): boolean => {
  return getCurrentTheme() === 'light'
}

/**
 * 获取主题相关的透明度
 * 根据主题返回合适的透明度值
 */
export const getThemeOpacity = (lightOpacity: number, darkOpacity: number): number => {
  const currentTheme = getCurrentTheme()
  return currentTheme === 'dark' ? darkOpacity : lightOpacity
}

/**
 * 创建主题相关的渐变
 * 根据主题创建合适的渐变效果
 */
export const createThemeGradient = (
  lightGradient: string,
  darkGradient: string
): string => {
  const currentTheme = getCurrentTheme()
  return currentTheme === 'dark' ? darkGradient : lightGradient
}

/**
 * 获取主题相关的阴影
 * 根据主题返回合适的阴影效果
 */
export const getThemeShadow = (lightShadow: string, darkShadow: string): string => {
  const currentTheme = getCurrentTheme()
  return currentTheme === 'dark' ? darkShadow : lightShadow
}

/**
 * 初始化主题
 * 从localStorage恢复主题设置
 */
export const initializeTheme = (): void => {
  const savedTheme = localStorage.getItem('theme') as Theme
  if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
    setTheme(savedTheme)
  } else {
    // 检测系统主题偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }
}

/**
 * 监听系统主题变化
 * 当系统主题变化时自动切换应用主题
 */
export const watchSystemTheme = (): () => void => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handler = (e: MediaQueryListEvent) => {
    const newTheme = e.matches ? 'dark' : 'light'
    setTheme(newTheme)
    dispatchThemeChangeEvent(newTheme)
  }
  
  mediaQuery.addEventListener('change', handler)
  
  return () => {
    mediaQuery.removeEventListener('change', handler)
  }
}
