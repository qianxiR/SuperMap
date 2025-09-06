import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useIntersectionAnalysisStore } from '@/stores/intersectionAnalysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import { getAnalysisServiceConfig } from '@/api/config'
import { extractGeoJSONFromLayer } from '@/utils/featureUtils'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as VectorLayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'

declare global {
  interface Window {
    turf: any
  }
}

interface IntersectionResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetLayerName: string
  sourceMaskLayerName: string
  createdAt: string
}


export function useIntersectionAnalysis() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const store = useIntersectionAnalysisStore()
  const { saveFeaturesAsLayer } = useLayerManager()

  const targetLayerId = computed(() => store.state.targetLayerId)
  const maskLayerId = computed(() => store.state.maskLayerId)
  const results = computed(() => store.state.results)
  const currentResult = computed(() => store.state.currentResult)
  const isAnalyzing = computed(() => store.state.isAnalyzing)
  const targetFeatureCount = computed(() => store.state.targetFeaturesCache.length)
  const maskFeatureCount = computed(() => store.state.maskFeaturesCache.length)
  const targetFeaturesCache = computed(() => store.state.targetFeaturesCache)
  const maskFeaturesCache = computed(() => store.state.maskFeaturesCache)

  const layerOptions = computed(() => {
    const vectorLayers = mapStore.vectorLayers.filter(l => l.layer && l.layer.getVisible() && l.type === 'vector')
    return vectorLayers.map(l => ({ value: l.id, label: `${l.name} (${l.layer.getSource()?.getFeatures().length || 0}个要素)`, disabled: false }))
  })

  const setTargetLayer = (layerId: string): void => {
    store.setTargetLayerId(layerId)
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    const features = layer?.layer?.getSource?.().getFeatures?.() || []
    store.setTargetFeaturesCache(features)
  }

  const setMaskLayer = (layerId: string): void => {
    store.setMaskLayerId(layerId)
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    const features = layer?.layer?.getSource?.().getFeatures?.() || []
    store.setMaskFeaturesCache(features)
  }



  // 相交分析（调用后端API）
  const executeIntersectionAnalysis = async (params: { targetLayerId: string; maskLayerId: string; targetFeatures: any[]; maskFeatures: any[]; }): Promise<void> => {
    const tId = params.targetLayerId
    const mId = params.maskLayerId

    const target = mapStore.vectorLayers.find(l => l.id === tId)
    const mask = mapStore.vectorLayers.find(l => l.id === mId)

    const targetFeatures: any[] = params.targetFeatures
    const maskFeatures: any[] = params.maskFeatures
    store.setTargetFeaturesCache(targetFeatures)
    store.setMaskFeaturesCache(maskFeatures)

    store.setIsAnalyzing(true)
    analysisStore.setAnalysisStatus('正在执行相交分析...')

    try {
      // 提取目标图层和遮罩图层的GeoJSON数据
      const targetData = extractGeoJSONFromLayer(target!.layer, mapStore.map, {
        enableLogging: true
      })
      const maskData = extractGeoJSONFromLayer(mask!.layer, mapStore.map, {
        enableLogging: true
      })

      console.log('[Intersection] 提取数据完成:', {
        targetFeatures: targetData.features?.length || 0,
        maskFeatures: maskData.features?.length || 0
      })

      // 构建API请求数据
      const requestData = {
        targetData: targetData,
        maskData: maskData,
        analysisOptions: {
          batchSize: 100,
          enableProgress: true,
          returnGeometry: true
        },
        options: {
          resultLayerName: '相交分析结果',
          enableStatistics: true,
          coordinateSystem: 'EPSG:4326'
        }
      }

      console.log('[Intersection] 发送API请求:', requestData)

      // 调用后端API
      const API_BASE_URL = getAnalysisServiceConfig().baseUrl
      const response = await fetch(`${API_BASE_URL}/spatial-analysis/intersection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const apiResponse = await response.json()

      if (!apiResponse.success) {
        throw new Error(`API请求失败: ${apiResponse.error?.message || '未知错误'}`)
      }

      const analysisData = apiResponse.data
      const results = analysisData.results

      console.log('[Intersection] API响应成功:', {
        resultsCount: results.length,
        statistics: analysisData.statistics
      })

      // 更新状态和显示结果
      store.setResults(results)
      displayIntersectionResults(results)
      analysisStore.setAnalysisStatus(`相交分析完成：共生成 ${results.length} 个结果，已渲染到地图。`)

    } catch (error: any) {
      console.error('[Intersection] 相交分析失败:', error)
      analysisStore.setAnalysisStatus(`相交分析失败: ${error.message}`)
    } finally {
      store.setIsAnalyzing(false)
      console.log('[Intersection] 分析状态更新完成')
    }
  }

  // 几何体拓扑验证和清理函数
  const validateAndCleanGeometry = (geometry: any): any | null => {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return null
    }

    try {
      // 检查turf库是否可用
      if (!window.turf) {
        console.warn('[Intersection] Turf库未加载，跳过拓扑验证')
        return geometry
      }

      const turf = window.turf

      // 创建turf要素进行验证
      const turfFeature = {
        type: 'Feature',
        geometry: geometry,
        properties: {}
      }

      // 1. 检查几何体有效性
      if (!turf.booleanValid(turfFeature)) {
        console.warn('[Intersection] 几何体无效，尝试修复:', geometry.type)
        
        // 尝试修复几何体
        try {
          const fixedGeometry = turf.cleanCoords(turfFeature)
          if (turf.booleanValid(fixedGeometry)) {
            console.log('[Intersection] 几何体修复成功')
            return fixedGeometry.geometry
          }
        } catch (fixError) {
          console.warn('[Intersection] 几何体修复失败:', fixError)
        }
        
        return null
      }

      // 2. 对于多边形，检查是否闭合
      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        // 清理坐标，移除重复点
        const cleanedFeature = turf.cleanCoords(turfFeature)
        
        // 检查多边形是否有效（闭合且面积大于0）
        if (cleanedFeature.geometry.type === 'Polygon') {
          const rings = cleanedFeature.geometry.coordinates
          for (const ring of rings) {
            if (ring.length < 4) {
              console.warn('[Intersection] 多边形环点数不足，移除:', ring.length)
              return null
            }
            
            // 检查首尾点是否相同（闭合检查）
            const first = ring[0]
            const last = ring[ring.length - 1]
            if (first[0] !== last[0] || first[1] !== last[1]) {
              console.warn('[Intersection] 多边形未闭合，移除')
              return null
            }
          }
        }
        
        return cleanedFeature.geometry
      }

      // 3. 对于其他几何类型，只进行基本清理
      const cleanedFeature = turf.cleanCoords(turfFeature)
      return cleanedFeature.geometry

    } catch (error) {
      console.warn('[Intersection] 几何体验证失败:', error)
      return null
    }
  }

  const displayIntersectionResults = (items: IntersectionResultItem[]): void => {
    if (!mapStore.map) return

    removeIntersectionLayers()

    // 创建空的矢量图层容器
    const source = new VectorSource({})
    const rootStyle = getComputedStyle(document.documentElement)
    const strokeColor = rootStyle.getPropertyValue('--map-highlight-color')?.trim() || '#000000'
    // 使用分析专用颜色，确保复杂几何体正确显示
    const fillColor = rootStyle.getPropertyValue('--analysis-color')?.trim() || '#0078D4'
    const fillVar = fillColor + '60' // 60% 不透明度

    const layer = new VectorLayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: strokeColor, width: 2 }),
        fill: new Fill({ color: fillVar })
      })
    })
    layer.set('isIntersectionLayer', true)
    layer.set('intersectionResults', items)
    mapStore.map.addLayer(layer)

    // 处理所有要素，进行拓扑验证和清理
    const validFeatures: any[] = []
    const invalidCount = { total: 0, unclosed: 0, invalid: 0 }

    items.forEach((item, index) => {
      if (!item.geometry || !item.geometry.type || !item.geometry.coordinates) {
        invalidCount.total++
        return
      }

      // 进行拓扑验证和清理
      const cleanedGeometry = validateAndCleanGeometry(item.geometry)
      
      if (cleanedGeometry) {
        const format = new GeoJSON()
        const geometry = format.readGeometry(cleanedGeometry)
        
        const f = new Feature({ 
          geometry, 
          properties: { 
            id: item.id, 
            name: item.name, 
            sourceTarget: item.sourceTargetLayerName, 
            sourceMask: item.sourceMaskLayerName, 
            createdAt: item.createdAt 
          } 
        })
        validFeatures.push(f)
      } else {
        invalidCount.total++
        if (item.geometry.type === 'Polygon' || item.geometry.type === 'MultiPolygon') {
          invalidCount.unclosed++
        } else {
          invalidCount.invalid++
        }
      }
    })

    // 记录清理结果
    console.log('[Intersection] 几何体清理完成:', {
      total: items.length,
      valid: validFeatures.length,
      invalid: invalidCount.total,
      unclosed: invalidCount.unclosed,
      invalidGeometry: invalidCount.invalid
    })

    // 如果有无效几何体，显示警告
    if (invalidCount.total > 0) {
      analysisStore.setAnalysisStatus(
        `相交分析完成：共生成 ${items.length} 个结果，其中 ${validFeatures.length} 个有效，${invalidCount.total} 个无效（${invalidCount.unclosed} 个未闭合，${invalidCount.invalid} 个几何体无效）`
      )
    } else {
      analysisStore.setAnalysisStatus(`相交分析完成：共生成 ${validFeatures.length} 个有效结果，已渲染到地图。`)
    }

    // 添加所有有效要素到图层
    if (validFeatures.length > 0) {
      source.addFeatures(validFeatures as any[])
      
      // 缩放到结果图层范围
      try {
        const extent = source.getExtent()
        if (extent && 
            !extent.every((coord: number) => coord === Infinity) &&
            !extent.every((coord: number) => coord === -Infinity) &&
            extent[0] !== extent[2] && 
            extent[1] !== extent[3]) {
          mapStore.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
          })
          console.log('[Intersection] 已缩放到相交结果范围')
        }
      } catch (error) {
        console.warn('[Intersection] 缩放到结果范围失败:', error)
      }
    }
  }

  const removeIntersectionLayers = (): void => {
    if (!mapStore.map) return
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((l: any) => {
      if (l.get('isIntersectionLayer')) {
        mapStore.map.removeLayer(l)
      }
      if (l.get('isInvalidGeometryLayer')) {
        mapStore.map.removeLayer(l)
      }
    })
  }

  const clearState = (): void => {
    store.clearResults()
    removeIntersectionLayers()
  }

  // 将相交结果保存为图层管理中的绘制图层
  const saveIntersectionResultsAsLayer = async (items: IntersectionResultItem[]): Promise<void> => {
    if (!mapStore.map || items.length === 0) return

    try {
      // 将相交结果转换为 OpenLayers Feature
      const features = items.map(item => {
        const format = new GeoJSON()
        if (item.geometry && item.geometry.type && item.geometry.coordinates) {
          const geometry = format.readGeometry(item.geometry)
          const feature = new Feature({ 
            geometry, 
            properties: { 
              id: item.id, 
              name: item.name, 
              sourceTarget: item.sourceTargetLayerName, 
              sourceMask: item.sourceMaskLayerName, 
              createdAt: item.createdAt,
              analysisType: 'intersection'
            } 
          })
          return feature
        }
        return null
      }).filter(Boolean)

      if (features.length > 0) {
        // 使用图层管理器的保存功能
        const layerName = `相交分析结果`
        await saveFeaturesAsLayer(features as any[], layerName, 'intersect')
        
        console.log(`[Intersection] Saved ${features.length} intersection results as layer: ${layerName}`)
      }
    } catch (error: any) {
      console.error('[Intersection] Failed to save intersection results as layer:', error)
    }
  }

  const displayInvalidGeometries = (invalidTarget: any[], invalidMask: any[]): void => {
    if (!mapStore.map) return
    const format = new GeoJSON()
    const feats: any[] = [] as any
    const take = (arr: any[], src: 'target' | 'mask') => {
      arr.forEach((it: any) => {
        const gj = it?.k
        if (!gj || !gj.features) return
        gj.features.forEach((f: any) => {
          const g = f?.geometry
          if (!g) return
          const olGeom = format.readGeometry(g)
          const feat = new Feature({ geometry: olGeom, properties: { src } })
          feats.push(feat)
        })
      })
    }
    take(invalidTarget, 'target')
    take(invalidMask, 'mask')
    if (feats.length === 0) return
    const src = new VectorSource({ features: feats as any })
    const root = getComputedStyle(document.documentElement)
    const color = root.getPropertyValue('--map-highlight-color')?.trim() || '#ff0000'
    const lyr = new VectorLayer({
      source: src,
      style: new Style({ stroke: new Stroke({ color, width: 3, lineDash: [6, 6] }) })
    })
    lyr.set('isInvalidGeometryLayer', true)
    mapStore.map.addLayer(lyr)
  }

  return {
    targetLayerId,
    maskLayerId,
    layerOptions,
    results,
    currentResult,
    isAnalyzing,
    targetFeatureCount,
    maskFeatureCount,
    targetFeaturesCache,
    maskFeaturesCache,
    setTargetLayer,
    setMaskLayer,
    executeIntersectionAnalysis,
    displayIntersectionResults,
    removeIntersectionLayers,
    clearState,
    saveIntersectionResultsAsLayer
  }
}


