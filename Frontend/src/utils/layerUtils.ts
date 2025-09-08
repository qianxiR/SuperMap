/**
 * 图层管理工具函数
 * 统一管理图层添加、移除、清理等重复逻辑
 */

// 图层信息接口
export interface LayerInfo {
  id: string
  name: string
  layer: any
  visible: boolean
  type: string
  source: string
  isLazyLoaded?: boolean
  isLoaded?: boolean
}

// 图层清理结果接口
export interface LayerCleanupResult {
  removedCount: number
  errors: string[]
}

/**
 * 安全移除图层
 * 包含错误处理，避免移除失败导致程序崩溃
 */
export const safeRemoveLayer = (map: any, layer: any): boolean => {
  if (!map || !layer) return false
  
  try {
    map.removeLayer(layer)
    return true
  } catch (error) {
    console.warn('移除图层失败:', error)
    return false
  }
}

/**
 * 批量移除图层
 * 移除指定图层数组中的所有图层
 */
export const removeLayers = (map: any, layers: LayerInfo[]): LayerCleanupResult => {
  const result: LayerCleanupResult = {
    removedCount: 0,
    errors: []
  }
  
  if (!map) {
    result.errors.push('地图实例不存在')
    return result
  }
  
  layers.forEach((layerInfo) => {
    if (layerInfo.layer) {
      const success = safeRemoveLayer(map, layerInfo.layer)
      if (success) {
        result.removedCount++
      } else {
        result.errors.push(`移除图层失败: ${layerInfo.name}`)
      }
    }
  })
  
  return result
}

/**
 * 清空图层数组
 * 安全清空图层数组，避免引用问题
 */
export const clearLayerArrays = (vectorLayers: LayerInfo[], customLayers: any[]): void => {
  // 清空矢量图层数组
  vectorLayers.length = 0
  
  // 清空自定义图层数组
  customLayers.length = 0
}

/**
 * 清理选择图层数据源
 * 清空选择图层中的所有要素
 */
export const clearSelectionLayer = (selectLayer: any): boolean => {
  if (!selectLayer?.getSource) return false
  
  try {
    selectLayer.getSource().clear()
    return true
  } catch (error) {
    console.warn('清理选择图层失败:', error)
    return false
  }
}

/**
 * 清理所有图层数据
 * 统一清理所有类型的图层，包括矢量图层、自定义图层、选择图层
 */
export const clearAllLayers = (
  map: any, 
  vectorLayers: LayerInfo[], 
  customLayers: any[], 
  selectLayer?: any
): LayerCleanupResult => {
  const result: LayerCleanupResult = {
    removedCount: 0,
    errors: []
  }
  
  if (!map) {
    result.errors.push('地图实例不存在')
    return result
  }
  
  // 移除矢量图层
  const vectorResult = removeLayers(map, vectorLayers)
  result.removedCount += vectorResult.removedCount
  result.errors.push(...vectorResult.errors)
  
  // 移除自定义图层
  const customResult = removeLayers(map, customLayers)
  result.removedCount += customResult.removedCount
  result.errors.push(...customResult.errors)
  
  // 清空图层数组
  clearLayerArrays(vectorLayers, customLayers)
  
  // 清理选择图层
  if (selectLayer) {
    clearSelectionLayer(selectLayer)
  }
  
  return result
}

/**
 * 清理特定类型的图层
 * 只清理指定来源的图层，保留其他图层
 */
export const clearLayersBySource = (
  map: any, 
  vectorLayers: LayerInfo[], 
  source: string
): LayerCleanupResult => {
  const result: LayerCleanupResult = {
    removedCount: 0,
    errors: []
  }
  
  if (!map) {
    result.errors.push('地图实例不存在')
    return result
  }
  
  // 过滤出指定来源的图层
  const targetLayers = vectorLayers.filter(layer => layer.source === source)
  
  // 移除图层
  const removeResult = removeLayers(map, targetLayers)
  result.removedCount += removeResult.removedCount
  result.errors.push(...removeResult.errors)
  
  // 从数组中移除
  const beforeCount = vectorLayers.length
  vectorLayers.splice(0, vectorLayers.length, ...vectorLayers.filter(layer => layer.source !== source))
  const afterCount = vectorLayers.length
  
  console.log(`清理${source}图层完成，移除 ${beforeCount - afterCount} 个图层`)
  
  return result
}

/**
 * 添加图层到地图
 * 安全添加图层，包含错误处理
 */
export const safeAddLayer = (map: any, layer: any, zIndex?: number): boolean => {
  if (!map || !layer) return false
  
  try {
    if (zIndex !== undefined) {
      layer.setZIndex(zIndex)
    }
    map.addLayer(layer)
    return true
  } catch (error) {
    console.warn('添加图层失败:', error)
    return false
  }
}

/**
 * 创建图层信息对象
 * 统一创建图层信息对象，确保数据结构一致
 */
export const createLayerInfo = (
  id: string,
  name: string,
  layer: any,
  source: string,
  options: Partial<LayerInfo> = {}
): LayerInfo => {
  return {
    id,
    name,
    layer,
    visible: true,
    type: 'vector',
    source,
    ...options
  }
}

/**
 * 更新图层可见性
 * 安全更新图层可见性，包含响应式更新
 */
export const updateLayerVisibility = (
  layerInfo: LayerInfo, 
  visible: boolean
): boolean => {
  if (!layerInfo.layer) return false
  
  try {
    layerInfo.layer.setVisible(visible)
    layerInfo.visible = visible
    return true
  } catch (error) {
    console.warn('更新图层可见性失败:', error)
    return false
  }
}

/**
 * 查找图层
 * 根据ID或名称查找图层
 */
export const findLayer = (
  layers: LayerInfo[], 
  identifier: string, 
  byName: boolean = false
): LayerInfo | undefined => {
  return layers.find(layer => 
    byName ? layer.name === identifier : layer.id === identifier
  )
}

/**
 * 获取图层统计信息
 * 获取图层的统计信息，用于调试和监控
 */
export const getLayerStats = (vectorLayers: LayerInfo[], customLayers: any[]): {
  total: number
  bySource: Record<string, number>
  byType: Record<string, number>
  visible: number
  hidden: number
} => {
  const allLayers = [...vectorLayers, ...customLayers]
  
  const stats = {
    total: allLayers.length,
    bySource: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    visible: 0,
    hidden: 0
  }
  
  allLayers.forEach(layer => {
    // 按来源统计
    const source = layer.source || 'unknown'
    stats.bySource[source] = (stats.bySource[source] || 0) + 1
    
    // 按类型统计
    const type = layer.type || 'unknown'
    stats.byType[type] = (stats.byType[type] || 0) + 1
    
    // 按可见性统计
    if (layer.visible) {
      stats.visible++
    } else {
      stats.hidden++
    }
  })
  
  return stats
}
