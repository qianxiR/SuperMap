/**
 * 样式工具函数
 * 统一管理地图样式创建、颜色解析等重复逻辑
 */

// 样式配置接口
export interface StyleConfig {
  strokeColor?: string
  strokeWidth?: number
  fillOpacity?: number
  pointRadius?: number
  pointStrokeWidth?: number
  lineCap?: string
  lineJoin?: string
  text?: {
    text: string
    font?: string
    fill?: { color: string }
    stroke?: { color: string; width: number }
    offsetY?: number
    textAlign?: string
    textBaseline?: string
  }
}

// 颜色解析结果接口
export interface ColorParseResult {
  strokeColor: string
  fillColor: string
  rgb: string
}

/**
 * 解析CSS颜色为RGBA格式
 * 支持十六进制、RGB、CSS变量等多种格式
 */
export const parseColorToRgba = (color: string, opacity: number = 1): ColorParseResult => {
  const css = getComputedStyle(document.documentElement)
  
  // 获取实际颜色值
  let actualColor = color
  if (color.startsWith('--')) {
    actualColor = css.getPropertyValue(color).trim() || color
  }
  
  // 解析RGB值
  const rgbMatch = actualColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  let fillColor = `rgba(0, 0, 0, ${opacity})`
  let rgb = '0, 0, 0'
  
  if (rgbMatch) {
    rgb = `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`
    fillColor = `rgba(${rgb}, ${opacity})`
  } else if (actualColor.startsWith('#')) {
    // 处理十六进制颜色
    const hex = actualColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    rgb = `${r}, ${g}, ${b}`
    fillColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  
  return {
    strokeColor: actualColor,
    fillColor,
    rgb
  }
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
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
  return currentTheme === 'dark' ? darkColor : lightColor
}

/**
 * 创建统一的OpenLayers样式对象
 */
export const createOLStyle = (config: StyleConfig): any => {
  const ol = window.ol
  
  const {
    strokeColor = '#0078D4',
    strokeWidth = 2,
    fillOpacity = 0.3,
    pointRadius = 6,
    pointStrokeWidth = 2,
    lineCap = 'round',
    lineJoin = 'round',
    text
  } = config
  
  const colorResult = parseColorToRgba(strokeColor, fillOpacity)
  const panelColor = getCSSVariable('--panel', '#ffffff')
  
  const styleConfig: any = {
    stroke: new ol.style.Stroke({
      color: colorResult.strokeColor,
      width: strokeWidth,
      lineCap,
      lineJoin
    }),
    fill: new ol.style.Fill({
      color: colorResult.fillColor
    }),
    image: new ol.style.Circle({
      radius: pointRadius,
      fill: new ol.style.Fill({
        color: colorResult.strokeColor
      }),
      stroke: new ol.style.Stroke({
        color: panelColor,
        width: pointStrokeWidth
      })
    })
  }
  
  // 如果配置了文本样式，添加文本样式
  if (text) {
    const textConfig: any = {
      text: text.text,
      font: text.font || '12px sans-serif',
      fill: new ol.style.Fill({
        color: text.fill?.color || colorResult.strokeColor
      }),
      offsetY: text.offsetY || 0,
      textAlign: text.textAlign || 'center',
      textBaseline: text.textBaseline || 'middle'
    }
    
    // 如果配置了文本描边，添加描边样式
    if (text.stroke) {
      textConfig.stroke = new ol.style.Stroke({
        color: text.stroke.color,
        width: text.stroke.width
      })
    }
    
    styleConfig.text = new ol.style.Text(textConfig)
  }
  
  return new ol.style.Style(styleConfig)
}

/**
 * 根据图层类型创建样式
 */
export const createLayerStyle = (sourceType: string, layerName?: string): any => {
  const css = getComputedStyle(document.documentElement)
  
  // 获取图层特定的样式变量
  const getStyleConfig = (prefix: string): StyleConfig => {
    const strokeColor = getCSSVariable(`--${prefix}-stroke-color`) || 
                       getCSSVariable('--accent') || 
                       getThemeColor('#4a5568', '#ffffff')
    
    return {
      strokeColor,
      strokeWidth: parseInt(getCSSVariable(`--${prefix}-stroke-width`)) || 2,
      fillOpacity: parseFloat(getCSSVariable(`--${prefix}-fill-opacity`)) || 0.3,
      pointRadius: parseInt(getCSSVariable(`--${prefix}-point-radius`)) || 6,
      pointStrokeWidth: parseInt(getCSSVariable(`--${prefix}-point-stroke-width`)) || 2
    }
  }
  
  // 根据图层来源类型返回对应样式配置
  const styleMap: Record<string, string> = {
    'draw': 'draw',
    'area': 'area', 
    'query': 'query',
    'buffer': 'buffer',
    'upload': 'upload',
    'path': 'path',
    'intersect': 'intersect',
    'erase': 'erase'
  }
  
  const prefix = styleMap[sourceType] || 'analysis'
  const config = getStyleConfig(prefix)
  
  // 特殊处理路径分析图层（使用蓝色）
  if (sourceType === 'path') {
    config.strokeColor = '#0078D4'
    config.fillOpacity = 0.3
    config.strokeWidth = 4
  }
  
  return createOLStyle(config)
}

/**
 * 创建悬停样式
 */
export const createHoverStyle = (): any => {
  const highlightColor = getCSSVariable('--map-highlight-color') || 
                        getThemeColor('#4a5568', '#ffffff')
  const hoverFillColor = getCSSVariable('--map-hover-fill') || 'rgba(0, 123, 255, 0.3)'
  
  return createOLStyle({
    strokeColor: highlightColor,
    strokeWidth: 2,
    fillOpacity: 0.3,
    pointRadius: 6,
    pointStrokeWidth: 2
  })
}

/**
 * 创建选择样式
 */
export const createSelectStyle = (): any => {
  const highlightColor = getCSSVariable('--map-highlight-color') || 
                        getThemeColor('#4a5568', '#ffffff')
  const selectFillColor = getCSSVariable('--map-select-fill') || 
                         getThemeColor('rgba(33, 37, 41, 0.15)', 'rgba(255, 255, 255, 0.15)')
  
  return (feature: any) => {
    const geometry = feature.getGeometry()
    if (!geometry) {
      return createOLStyle({
        strokeColor: highlightColor,
        strokeWidth: 3,
        fillOpacity: 0.15,
        pointRadius: 8,
        pointStrokeWidth: 3
      })
    }
    
    const geometryType = geometry.getType()
    const ol = window.ol
    
    switch (geometryType) {
      case 'Point':
      case 'MultiPoint':
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            stroke: new ol.style.Stroke({ color: highlightColor, width: 3 }),
            fill: new ol.style.Fill({ color: selectFillColor })
          })
        })
        
      case 'LineString':
      case 'MultiLineString':
        return new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: highlightColor,
            width: 5,
            lineCap: 'round',
            lineJoin: 'round'
          })
        })
        
      case 'Polygon':
      case 'MultiPolygon':
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ color: highlightColor, width: 3 }),
          fill: new ol.style.Fill({ color: selectFillColor })
        })
        
      default:
        return createOLStyle({
          strokeColor: highlightColor,
          strokeWidth: 3,
          fillOpacity: 0.15,
          pointRadius: 8,
          pointStrokeWidth: 3
        })
    }
  }
}
