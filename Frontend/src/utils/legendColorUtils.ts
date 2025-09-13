import { getCurrentTheme } from './themeUtils'

/**
 * 获取图层颜色工具函数
 * 从CSS变量和主题配置中获取图层的颜色信息
 */
export const getLayerColors = (layerName: string) => {
  const css = getComputedStyle(document.documentElement)
  const currentTheme = getCurrentTheme()
  
  // 获取图层特定的样式变量
  const strokeVar = css.getPropertyValue(`--layer-stroke-${layerName}`).trim()
  const fillVar = css.getPropertyValue(`--layer-fill-${layerName}`).trim()
  const accentFallback = css.getPropertyValue('--accent').trim() || (currentTheme === 'dark' ? '#666666' : '#4a5568')

  // 解析样式颜色，优先使用图层特定变量，回退到主题色
  const strokeColor = strokeVar || accentFallback
  const fillColor = fillVar || (currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(74,85,104,0.1)')
  
  return {
    stroke: strokeColor,
    fill: fillColor
  }
}

/**
 * 获取特定图层的颜色配置
 * 为图例组件提供统一的颜色获取接口
 */
export const getLegendColors = () => {
  return {
    // 行政区划图层
    '武汉_市级': getLayerColors('武汉_市级'),
    '武汉_县级': getLayerColors('武汉_县级'),
    
    // 交通图层
    '公路': getLayerColors('公路'),
    '铁路': getLayerColors('铁路'),
    
    // 水系图层
    '水系面': getLayerColors('水系面'),
    '水系线': getLayerColors('水系线'),
    '长江面': getLayerColors('长江面'),
    '长江线': getLayerColors('长江线'),
    
    // 民生设施图层
    '医院': getLayerColors('医院'),
    '学校': getLayerColors('学校'),
    '居民地地名点': getLayerColors('居民地地名点'),
    
    // 水文监测点（特殊处理，使用固定颜色）
    '水文监测点': {
      stroke: '#0288d1',
      fill: '#4fc3f7'
    }
  }
}

/**
 * 获取长江流域相关图层的颜色
 * 专门为长江监测预警一体化页面提供颜色配置
 */
export const getYangtzeColors = () => {
  return {
    '长江面': {
      stroke: '#003a8c',
      fill: 'rgba(0, 50, 115, 0.3)'
    },
    '长江线': {
      stroke: '#002766',
      fill: '#002766'
    },
    '水文监测点': {
      stroke: '#0288d1',
      fill: '#4fc3f7'
    }
  }
}

