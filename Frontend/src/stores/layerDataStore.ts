import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 图层数据状态管理
 * 用于保存当前打开图层的所有属性信息数据
 */
export const useLayerDataStore = defineStore('layerData', () => {
  // 图层属性数据存储
  const layerAttributes = ref<Map<string, any[]>>(new Map())
  
  // 当前激活的图层数据
  const activeLayerData = ref<Map<string, any>>(new Map())
  
  /**
   * 设置图层属性数据
   * @param layerName 图层名称
   * @param features 要素数据数组
   */
  const setLayerAttributes = (layerName: string, features: any[]) => {
    layerAttributes.value.set(layerName, features)
    
    // 同时更新激活图层数据，用于快速查找
    const attributeMap = new Map()
    features.forEach((feature, index) => {
      if (feature.properties) {
        // 使用要素ID或索引作为key
        const key = feature.id || feature.properties.id || index
        attributeMap.set(key, feature.properties)
      }
    })
    activeLayerData.value.set(layerName, attributeMap)
  }
  
  /**
   * 获取图层属性数据
   * @param layerName 图层名称
   * @returns 图层属性数据数组
   */
  const getLayerAttributes = (layerName: string): any[] => {
    return layerAttributes.value.get(layerName) || []
  }
  
  /**
   * 根据要素ID获取属性数据
   * @param layerName 图层名称
   * @param featureId 要素ID
   * @returns 要素属性数据
   */
  const getFeatureAttributes = (layerName: string, featureId: string | number): any => {
    const layerData = activeLayerData.value.get(layerName)
    return layerData ? layerData.get(featureId) : null
  }
  
  /**
   * 获取图层中指定字段的所有值
   * @param layerName 图层名称
   * @param fieldName 字段名称
   * @returns 字段值数组
   */
  const getFieldValues = (layerName: string, fieldName: string): any[] => {
    const features = getLayerAttributes(layerName)
    return features
      .map(feature => feature.properties?.[fieldName])
      .filter(value => value !== undefined && value !== null)
  }
  
  /**
   * 根据字段值查找要素
   * @param layerName 图层名称
   * @param fieldName 字段名称
   * @param fieldValue 字段值
   * @returns 匹配的要素数组
   */
  const findFeaturesByField = (layerName: string, fieldName: string, fieldValue: any): any[] => {
    const features = getLayerAttributes(layerName)
    return features.filter(feature => 
      feature.properties?.[fieldName] === fieldValue
    )
  }
  
  /**
   * 清空指定图层数据
   * @param layerName 图层名称
   */
  const clearLayerData = (layerName: string) => {
    layerAttributes.value.delete(layerName)
    activeLayerData.value.delete(layerName)
  }
  
  /**
   * 清空所有图层数据
   */
  const clearAllLayerData = () => {
    layerAttributes.value.clear()
    activeLayerData.value.clear()
  }
  
  /**
   * 获取所有图层名称
   */
  const getAllLayerNames = computed(() => {
    return Array.from(layerAttributes.value.keys())
  })
  
  /**
   * 获取图层数据统计信息
   */
  const getLayerStats = computed(() => {
    const stats: Record<string, number> = {}
    layerAttributes.value.forEach((features, layerName) => {
      stats[layerName] = features.length
    })
    return stats
  })
  
  return {
    // 状态
    layerAttributes,
    activeLayerData,
    
    // 计算属性
    getAllLayerNames,
    getLayerStats,
    
    // 方法
    setLayerAttributes,
    getLayerAttributes,
    getFeatureAttributes,
    getFieldValues,
    findFeaturesByField,
    clearLayerData,
    clearAllLayerData
  }
})
