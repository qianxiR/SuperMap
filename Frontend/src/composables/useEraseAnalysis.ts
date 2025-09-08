import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useEraseAnalysisStore } from '@/stores/eraseAnalysisStore'
import { uselayermanager } from '@/composables/uselayermanager'
import { getAnalysisServiceConfig } from '@/api/config'
import { extractGeoJSONFromlayer } from '@/utils/featureUtils'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as Vectorlayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'

interface EraseResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetlayerName: string
  sourceEraselayerName: string
  createdAt: string
}

export function useEraseAnalysis() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const store = useEraseAnalysisStore()
  const { saveFeaturesAslayer } = uselayermanager()

  const targetlayerId = computed(() => store.state.targetlayerId)
  const eraselayerId = computed(() => store.state.eraselayerId)
  const results = computed(() => store.state.results)
  const currentResult = computed(() => store.state.currentResult)
  const isAnalyzing = computed(() => store.state.isAnalyzing)
  const targetFeatureCount = computed(() => store.state.targetFeaturesCache.length)
  const eraseFeatureCount = computed(() => store.state.eraseFeaturesCache.length)
  const targetFeaturesCache = computed(() => store.state.targetFeaturesCache)
  const eraseFeaturesCache = computed(() => store.state.eraseFeaturesCache)

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

  const setEraselayer = (layerId: string): void => {
    store.setEraselayerId(layerId)
    const layer = mapStore.vectorlayers.find(l => l.id === layerId)
    const features = layer?.layer?.getSource?.().getFeatures?.() || []
    store.setEraseFeaturesCache(features)
  }

  // 擦除分析（调用后端API）
  const executeEraseAnalysis = async (params: { targetlayerId: string; eraselayerId: string; targetFeatures: any[]; eraseFeatures: any[]; }): Promise<void> => {
    const tId = params.targetlayerId
    const eId = params.eraselayerId

    const target = mapStore.vectorlayers.find(l => l.id === tId)
    const erase = mapStore.vectorlayers.find(l => l.id === eId)

    const targetFeatures: any[] = params.targetFeatures
    const eraseFeatures: any[] = params.eraseFeatures
    store.setTargetFeaturesCache(targetFeatures)
    store.setEraseFeaturesCache(eraseFeatures)

    store.setIsAnalyzing(true)
    analysisStore.setAnalysisStatus('正在执行擦除分析...')

    try {
      // 提取目标图层和擦除图层的GeoJSON数据
      const targetData = extractGeoJSONFromlayer(target!.layer, mapStore.map, {
        enableLogging: true
      })
      const eraseData = extractGeoJSONFromlayer(erase!.layer, mapStore.map, {
        enableLogging: true
      })

      console.log('[Erase] 提取数据完成:', {
        targetFeatures: targetData.features?.length || 0,
        eraseFeatures: eraseData.features?.length || 0
      })

      // 构建API请求数据
      const requestData = {
        targetData: targetData,
        eraseData: eraseData,
        analysisOptions: {
          batchSize: 100,
          enableProgress: true,
          returnGeometry: true
        },
        options: {
          resultlayerName: '擦除分析结果',
          enableStatistics: true,
          coordinateSystem: 'EPSG:4326'
        }
      }

      console.log('[Erase] 发送API请求:', requestData)

      // 调用后端API
      const API_BASE_URL = getAnalysisServiceConfig().baseUrl
      const response = await fetch(`${API_BASE_URL}/spatial-analysis/erase`, {
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

      console.log('[Erase] API响应成功:', {
        resultsCount: results.length,
        statistics: analysisData.statistics
      })

      // 更新状态和显示结果
      store.setResults(results)
      displayeraseResults(results)
      analysisStore.setAnalysisStatus(`擦除分析完成：共生成 ${results.length} 个结果，已渲染到地图。`)

    } catch (error: any) {
      console.error('[Erase] 擦除分析失败:', error)
      analysisStore.setAnalysisStatus(`擦除分析失败: ${error.message}`)
    } finally {
      store.setIsAnalyzing(false)
      console.log('[Erase] 分析状态更新完成')
    }
  }

  // 简化的几何体验证函数 - 只进行基本检查
  const validateAndCleanGeometry = (geometry: any): any | null => {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return null
    }

    // 直接返回原始几何体，不进行复杂的拓扑验证
    return geometry
  }

  const displayeraseResults = (items: EraseResultItem[]): void => {
    if (!mapStore.map) return

    removeEraselayers()

    // 创建空的矢量图层容器
    const source = new VectorSource({})
    const rootStyle = getComputedStyle(document.documentElement)
    const strokeColor = rootStyle.getPropertyValue('--map-highlight-color')?.trim() || '#000000'
    // 使用分析专用颜色，确保挖洞效果正确显示
    const fillColor = rootStyle.getPropertyValue('--analysis-color')?.trim() || '#0078D4'
    // 使用蓝色，70%透明度
    const fillVar = fillColor + '4D'

    const layer = new Vectorlayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: strokeColor, width: 2 }),
        fill: new Fill({ color: fillVar })
      })
    })
    layer.set('isEraselayer', true)
    layer.set('eraseResults', items)
    mapStore.map.addLayer(layer)

    // 处理所有要素，直接使用原始几何体
    const validFeatures: any[] = []

    items.forEach((item, index) => {
      if (!item.geometry || !item.geometry.type || !item.geometry.coordinates) {
        return
      }

      // 直接使用原始几何体，不进行复杂验证
      const format = new GeoJSON()
      const geometry = format.readGeometry(item.geometry)
      
      const f = new Feature({ 
        geometry, 
        properties: { 
          id: item.id, 
          name: item.name, 
          sourceTarget: item.sourceTargetlayerName, 
          sourceErase: item.sourceEraselayerName, 
          createdAt: item.createdAt 
        } 
      })
      validFeatures.push(f)
    })

    // 记录处理结果
    console.log('[Erase] 要素处理完成:', {
      total: items.length,
      valid: validFeatures.length
    })

    // 显示分析状态
    analysisStore.setAnalysisStatus(`擦除分析完成：共生成 ${validFeatures.length} 个结果，已渲染到地图。`)

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
          console.log('[Erase] 已缩放到擦除结果范围')
        }
      } catch (error) {
        console.warn('[Erase] 缩放到结果范围失败:', error)
      }
    }
  }

  const removeEraselayers = (): void => {
    if (!mapStore.map) return
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((l: any) => {
      if (l.get('isEraselayer')) {
        mapStore.map.removeLayer(l)
      }
      if (l.get('isInvalidGeometrylayer')) {
        mapStore.map.removeLayer(l)
      }
    })
  }

  const clearState = (): void => {
    store.clearResults()
    removeEraselayers()
  }

  // 将擦除结果保存为图层管理中的绘制图层
  const saveEraseResultsAslayer = async (items: EraseResultItem[]): Promise<void> => {
    if (!mapStore.map || items.length === 0) return

    try {
      // 将擦除结果转换为 Openlayers Feature
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
              sourceErase: item.sourceEraselayerName, 
              createdAt: item.createdAt,
              analysisType: 'erase'
            } 
          })
          return feature
        }
        return null
      }).filter(Boolean)

      if (features.length > 0) {
        // 使用图层管理器的保存功能
        const layerName = `擦除分析结果`
        await saveFeaturesAslayer(features as any[], layerName, 'erase')
        
        console.log(`[Erase] Saved ${features.length} erase results as layer: ${layerName}`)
      }
    } catch (error: any) {
      console.error('[Erase] Failed to save erase results as layer:', error)
    }
  }

  return {
    targetlayerId,
    eraselayerId,
    layerOptions,
    results,
    currentResult,
    isAnalyzing,
    targetFeatureCount,
    eraseFeatureCount,
    targetFeaturesCache,
    eraseFeaturesCache,
    setTargetlayer,
    setEraselayer,
    executeEraseAnalysis,
    displayeraseResults,
    removeEraselayers,
    clearState,
    saveEraseResultsAslayer
  }
}