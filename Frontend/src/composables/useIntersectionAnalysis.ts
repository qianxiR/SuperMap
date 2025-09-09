import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useIntersectionAnalysisStore } from '@/stores/intersectionAnalysisStore'
import { uselayermanager } from '@/composables/uselayermanager'
import { getAnalysisServiceConfig } from '@/api/config'
import { extractGeoJSONFromlayer } from '@/utils/featureUtils'
import { checkLayerGeometryType } from '@/utils/layerValidation'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as Vectorlayer } from 'ol/layer'
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
  sourceTargetlayerName: string
  sourceMasklayerName: string
  createdAt: string
}


export function useIntersectionAnalysis() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const store = useIntersectionAnalysisStore()
  const { saveFeaturesAslayer } = uselayermanager()

  const targetlayerId = computed(() => store.state.targetlayerId)
  const masklayerId = computed(() => store.state.masklayerId)
  const results = computed(() => store.state.results)
  const currentResult = computed(() => store.state.currentResult)
  const isAnalyzing = computed(() => store.state.isAnalyzing)
  const targetFeatureCount = computed(() => store.state.targetFeaturesCache.length)
  const maskFeatureCount = computed(() => store.state.maskFeaturesCache.length)
  const targetFeaturesCache = computed(() => store.state.targetFeaturesCache)
  const maskFeaturesCache = computed(() => store.state.maskFeaturesCache)

  const layerOptions = computed(() => {
    const vectorlayers = mapStore.vectorlayers.filter(l => l.layer && l.layer.getVisible() && l.type === 'vector')
    return vectorlayers.map(l => ({ value: l.id, label: `${l.name} (${l.layer.getSource()?.getFeatures().length || 0}个要素)`, disabled: false }))
  })

  const setTargetlayer = (layerId: string): void => {
    store.setTargetlayerId(layerId)
    const layer = mapStore.vectorlayers.find(l => l.id === layerId)
    const features = layer?.layer?.getSource?.().getFeatures?.() || []
    store.setTargetFeaturesCache(features)
  }

  const setMasklayer = (layerId: string): void => {
    store.setMasklayerId(layerId)
    const layer = mapStore.vectorlayers.find(l => l.id === layerId)
    const features = layer?.layer?.getSource?.().getFeatures?.() || []
    store.setMaskFeaturesCache(features)
  }




  // 等待图层分页加载完成
  const waitForLayerPaginationComplete = async (layer: any, layerName: string): Promise<void> => {
    return new Promise((resolve) => {
      const source = layer.getSource()
      if (!source) {
        resolve()
        return
      }

      let lastFeatureCount = 0
      let stableCount = 0
      const maxStableChecks = 3 // 连续3次检查要素数量不变则认为加载完成
      const checkInterval = 500 // 每500ms检查一次

      const checkPagination = () => {
        const currentFeatureCount = source.getFeatures().length
        
        if (currentFeatureCount === lastFeatureCount) {
          stableCount++
          if (stableCount >= maxStableChecks) {
            console.log(`[Intersection] 图层 ${layerName} 分页加载完成，共 ${currentFeatureCount} 个要素`)
            resolve()
            return
          }
        } else {
          stableCount = 0
          lastFeatureCount = currentFeatureCount
          console.log(`[Intersection] 图层 ${layerName} 正在分页加载，当前 ${currentFeatureCount} 个要素`)
        }
        
        setTimeout(checkPagination, checkInterval)
      }

      // 开始检查
      checkPagination()
    })
  }

  // 相交分析（调用后端API）
  const executeIntersectionAnalysis = async (params: { targetlayerId: string; masklayerId: string; targetFeatures: any[]; maskFeatures: any[]; }): Promise<void> => {
    const tId = params.targetlayerId
    const mId = params.masklayerId

    const target = mapStore.vectorlayers.find(l => l.id === tId)
    const mask = mapStore.vectorlayers.find(l => l.id === mId)

    const targetFeatures: any[] = params.targetFeatures
    const maskFeatures: any[] = params.maskFeatures
    store.setTargetFeaturesCache(targetFeatures)
    store.setMaskFeaturesCache(maskFeatures)

    store.setIsAnalyzing(true)
    analysisStore.setAnalysisStatus('正在检查图层类型...')

    try {
      // 检查图层几何类型
      const targetCheck = checkLayerGeometryType(target!.layer, target!.name, 'polygon')
      const maskCheck = checkLayerGeometryType(mask!.layer, mask!.name, 'polygon')

      if (!targetCheck.isValid) {
        store.setIsAnalyzing(false)
        analysisStore.setAnalysisStatus(targetCheck.message!)
        throw new Error(targetCheck.message!)
      }

      if (!maskCheck.isValid) {
        store.setIsAnalyzing(false)
        analysisStore.setAnalysisStatus(maskCheck.message!)
        throw new Error(maskCheck.message!)
      }

      analysisStore.setAnalysisStatus('正在等待图层数据加载完成...')

      // 等待目标图层和遮罩图层的分页加载完成
      await Promise.all([
        waitForLayerPaginationComplete(target!.layer, target!.name),
        waitForLayerPaginationComplete(mask!.layer, mask!.name)
      ])

      analysisStore.setAnalysisStatus('正在提取图层数据...')

      // 提取目标图层和遮罩图层的GeoJSON数据
      const targetData = extractGeoJSONFromlayer(target!.layer, mapStore.map, {
        enableLogging: true
      })
      const maskData = extractGeoJSONFromlayer(mask!.layer, mapStore.map, {
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
          resultlayerName: '相交分析结果',
          enableStatistics: true,
          coordinateSystem: 'EPSG:4326'
        }
      }

      console.log('[Intersection] 发送API请求:', requestData)

      // 调用后端API
      const API_BASE_URL = getAnalysisServiceConfig().baseUrl
      const response = await fetch(`${API_BASE_URL}/intersection`, {
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
      const features = analysisData.features

      console.log('[Intersection] API响应成功:', {
        featuresCount: features.length,
        statistics: analysisData.statistics
      })

      // 更新状态和显示结果
      store.setResults(features)
      displayIntersectionResults(features)
      analysisStore.setAnalysisStatus(`相交分析完成：共生成 ${features.length} 个结果，已渲染到地图。`)

    } catch (error: any) {
      store.setIsAnalyzing(false)
      throw error // 重新抛出错误，让面板能够捕获
    } finally {
      store.setIsAnalyzing(false)
    }
  }


  const displayIntersectionResults = (items: IntersectionResultItem[]): void => {
    if (!mapStore.map) return

    removeIntersectionlayers()

    // 创建空的矢量图层容器
    const source = new VectorSource({})
    const rootStyle = getComputedStyle(document.documentElement)
    const strokeColor = rootStyle.getPropertyValue('--map-highlight-color')?.trim() || '#000000'
    // 使用分析专用颜色，确保复杂几何体正确显示
    const fillColor = rootStyle.getPropertyValue('--analysis-color')?.trim() || '#0078D4'
    const fillVar = fillColor + '4D' // 蓝色，70%透明度

    const layer = new Vectorlayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: strokeColor, width: 2 }),
        fill: new Fill({ color: fillVar })
      })
    })
    layer.set('isIntersectionlayer', true)
    layer.set('intersectionResults', items)
    mapStore.map.addLayer(layer)

    // 处理所有要素
    const validFeatures: any[] = []
    let invalidCount = 0

    items.forEach((item, index) => {
      if (!item.geometry || !item.geometry.type || !item.geometry.coordinates) {
        invalidCount++
        return
      }

      // 直接使用原始几何体
      const format = new GeoJSON()
      const geometry = format.readGeometry(item.geometry)
      
      if (geometry) {
        const f = new Feature({ 
          geometry, 
          properties: { 
            id: item.id, 
            name: item.name, 
            sourceTarget: item.sourceTargetlayerName, 
            sourceMask: item.sourceMasklayerName, 
            createdAt: item.createdAt 
          } 
        })
        validFeatures.push(f)
      } else {
        invalidCount++
      }
    })

    // 记录处理结果
    console.log('[Intersection] 要素处理完成:', {
      total: items.length,
      valid: validFeatures.length,
      invalid: invalidCount
    })

    // 显示分析状态
    analysisStore.setAnalysisStatus(`相交分析完成：共生成 ${validFeatures.length} 个结果，已渲染到地图。`)

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

  const removeIntersectionlayers = (): void => {
    if (!mapStore.map) return
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((l: any) => {
      if (l.get('isIntersectionlayer')) {
        mapStore.map.removeLayer(l)
      }
      if (l.get('isInvalidGeometrylayer')) {
        mapStore.map.removeLayer(l)
      }
    })
  }

  const clearState = (): void => {
    store.clearResults()
    removeIntersectionlayers()
  }

  // 将相交结果保存为图层管理中的绘制图层
  const saveIntersectionResultsAslayer = async (items: IntersectionResultItem[]): Promise<void> => {
    if (!mapStore.map || items.length === 0) return

    try {
      // 将相交结果转换为 Openlayers Feature
      const features = items.map(item => {
        const format = new GeoJSON()
        if (item.geometry && item.geometry.type && item.geometry.coordinates) {
          const geometry = format.readGeometry(item.geometry)
          const feature = new Feature({ 
            geometry, 
            properties: { 
              id: item.id, 
              name: item.name, 
              sourceTarget: item.sourceTargetlayerName, 
              sourceMask: item.sourceMasklayerName, 
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
        await saveFeaturesAslayer(features as any[], layerName, 'intersect')
        
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
    const lyr = new Vectorlayer({
      source: src,
      style: new Style({ stroke: new Stroke({ color, width: 3, lineDash: [6, 6] }) })
    })
    lyr.set('isInvalidGeometrylayer', true)
    mapStore.map.addLayer(lyr)
  }

  return {
    targetlayerId,
    masklayerId,
    layerOptions,
    results,
    currentResult,
    isAnalyzing,
    targetFeatureCount,
    maskFeatureCount,
    targetFeaturesCache,
    maskFeaturesCache,
    setTargetlayer,
    setMasklayer,
    executeIntersectionAnalysis,
    displayIntersectionResults,
    removeIntersectionlayers,
    clearState,
    saveIntersectionResultsAslayer
  }
}


