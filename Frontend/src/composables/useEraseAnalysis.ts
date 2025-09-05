import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useEraseAnalysisStore } from '@/stores/eraseAnalysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as VectorLayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'
import { difference as turfDifference, union as turfUnion, kinks as turfKinks, polygon as turfPolygon, multiPolygon as turfMultiPolygon, feature as turfFeature } from '@turf/turf'

interface EraseResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetLayerName: string
  sourceEraseLayerName: string
  createdAt: string
}

export function useEraseAnalysis() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const store = useEraseAnalysisStore()
  const { saveFeaturesAsLayer } = useLayerManager()

  const targetLayerId = computed(() => store.state.targetLayerId)
  const eraseLayerId = computed(() => store.state.eraseLayerId)
  const results = computed(() => store.state.results)
  const currentResult = computed(() => store.state.currentResult)
  const isAnalyzing = computed(() => store.state.isAnalyzing)
  const targetFeatureCount = computed(() => store.state.targetFeaturesCache.length)
  const eraseFeatureCount = computed(() => store.state.eraseFeaturesCache.length)
  const targetFeaturesCache = computed(() => store.state.targetFeaturesCache)
  const eraseFeaturesCache = computed(() => store.state.eraseFeaturesCache)

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

  const setEraseLayer = (layerId: string): void => {
    store.setEraseLayerId(layerId)
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    const features = layer?.layer?.getSource?.().getFeatures?.() || []
    store.setEraseFeaturesCache(features)
  }

  // 合并要素集合为单个大要素
  const mergeFeatures = (features: any[]): any => {
    if (features.length === 0) return null
    if (features.length === 1) return features[0]
    
    console.log(`[FeatureMerge] 开始合并 ${features.length} 个要素`)
    
    try {
      let mergedFeature = features[0]
      
      for (let i = 1; i < features.length; i++) {
        const currentFeature = features[i]
        if (currentFeature && currentFeature.geometry) {
          try {
            mergedFeature = turfUnion(mergedFeature, currentFeature)
            if (!mergedFeature) {
              console.warn(`[FeatureMerge] 合并失败，跳过要素 ${i}`)
              continue
            }
          } catch (error) {
            console.warn(`[FeatureMerge] 要素 ${i} 合并失败:`, error)
            continue
          }
        }
      }
      
      console.log(`[FeatureMerge] 合并完成，生成要素类型: ${mergedFeature.geometry?.type}`)
      return mergedFeature
    } catch (error) {
      console.error('[FeatureMerge] 要素合并失败:', error)
      return null
    }
  }

  const executeEraseAnalysis = async (params: { targetLayerId: string; eraseLayerId: string; targetFeatures: any[]; eraseFeatures: any[]; }): Promise<void> => {
    const tId = params.targetLayerId
    const eId = params.eraseLayerId

    const target = mapStore.vectorLayers.find(l => l.id === tId)
    const erase = mapStore.vectorLayers.find(l => l.id === eId)

    const format = new GeoJSON()
    const viewProj = mapStore.map?.getView().getProjection().getCode()

    const targetFeatures: any[] = params.targetFeatures
    const eraseFeatures: any[] = params.eraseFeatures
    store.setTargetFeaturesCache(targetFeatures)
    store.setEraseFeaturesCache(eraseFeatures)

    store.setIsAnalyzing(true)
    analysisStore.setAnalysisStatus('正在执行擦除分析...')

    const toGj = (f: any) => format.writeFeatureObject(f, { dataProjection: 'EPSG:4326', featureProjection: viewProj }) as any
    const targetGeoJson = targetFeatures.map(toGj)
    const eraseGeoJson = eraseFeatures.map(toGj)

    console.log('[Erase] selected ids:', { targetLayerId: tId, eraseLayerId: eId })
    console.log('[Erase] cache sizes (features from store):', { targetCache: targetFeatures.length, eraseCache: eraseFeatures.length })
    console.log('[Erase] geojson sizes (transformed for erase):', { target: targetGeoJson.length, erase: eraseGeoJson.length })
    
    if (targetGeoJson.length < 1 || eraseGeoJson.length < 1) {
      const debugT = targetFeatures.slice(0, 1).map((f: any) => ({
        type: f?.getGeometry?.()?.getType?.(),
        hasGeom: !!f?.getGeometry?.(),
        id: f?.getId?.()
      }))
      const debugE = eraseFeatures.slice(0, 1).map((f: any) => ({
        type: f?.getGeometry?.()?.getType?.(),
        hasGeom: !!f?.getGeometry?.(),
        id: f?.getId?.()
      }))
      console.warn('[Erase] after transformation, one side has 0 geometries. raw feature sample:', { target: debugT, erase: debugE })
    }

    const getType = (g: any) => (g && (g.geometry?.type ?? g.type))
    const typeSampleT = targetGeoJson.slice(0, 5).map((g: any) => getType(g))
    const typeSampleE = eraseGeoJson.slice(0, 5).map((g: any) => getType(g))
    console.log('[Erase] sample types:', { target: typeSampleT, erase: typeSampleE })

    // 几何验证
    const wrapFeature = (geometry: any) => ({ type: 'Feature', geometry, properties: {} }) as any
    const invalidTarget = targetGeoJson
      .filter((g: any) => g && g.geometry)
      .map((g: any, idx: number) => ({ idx, k: turfKinks(wrapFeature(g.geometry)) }))
      .filter((r: any) => r.k && r.k.features && r.k.features.length > 0)
    const invalidErase = eraseGeoJson
      .filter((g: any) => g && g.geometry)
      .map((g: any, idx: number) => ({ idx, k: turfKinks(wrapFeature(g.geometry)) }))
      .filter((r: any) => r.k && r.k.features && r.k.features.length > 0)
    
    if (invalidTarget.length > 0 || invalidErase.length > 0) {
      console.warn('[Erase] kinks detected (self-intersections may affect results):', { invalidTarget, invalidErase })
      analysisStore.setAnalysisStatus(`检测到异常几何：目标 ${invalidTarget.length} 个，擦除 ${invalidErase.length} 个（已高亮）。继续执行分析...`)
      displayInvalidGeometries(invalidTarget, invalidErase)
    }

    const totalPairs = targetGeoJson.length * eraseGeoJson.length
    let processedPairs = 0
    const allResults: EraseResultItem[] = []

    console.log('[Erase] Starting Web Worker erase calculation...', { targetCount: targetGeoJson.length, eraseCount: eraseGeoJson.length, totalPairs })

    // 创建Web Worker
    const worker = new Worker(new URL('../workers/eraseWorker.ts', import.meta.url), { type: 'module' })
    
    // 配置分页参数
    const targetBatchSize = Math.max(1, Math.floor(targetGeoJson.length / 4)) // 目标要素分4批
    const eraseBatchSize = Math.max(1, Math.floor(eraseGeoJson.length / 4))   // 擦除要素分4批
    
    let completedBatches = 0
    const totalBatches = Math.ceil(targetGeoJson.length / targetBatchSize) * Math.ceil(eraseGeoJson.length / eraseBatchSize)

    // 监听Worker消息
    worker.onmessage = (event) => {
      const { type, batchId, results, error, processedPairs: batchProcessedPairs, totalPairs: batchTotalPairs } = event.data

      if (type === 'BATCH_COMPLETE') {
        processedPairs += batchProcessedPairs
        completedBatches++
        
        if (results && results.length > 0) {
          // 转换Worker结果格式
          const convertedResults = results.map((result: any) => ({
            id: result.id,
            name: result.name,
            geometry: result.geometry,
            sourceTargetLayerName: target?.name || '目标图层',
            sourceEraseLayerName: erase?.name || '擦除图层',
            createdAt: result.createdAt
          }))
          allResults.push(...convertedResults)
        }

        const progress = Math.round((processedPairs / totalPairs) * 100)
        analysisStore.setAnalysisStatus(`正在执行擦除分析... ${progress}% (${processedPairs}/${totalPairs}) - 批次 ${completedBatches}/${totalBatches}`)

        console.log(`[Erase] 批次 ${batchId} 完成，处理了 ${batchProcessedPairs} 个组合，生成 ${results?.length || 0} 个结果`)

        if (completedBatches >= totalBatches) {
          // 所有批次完成
          worker.terminate()
          console.log(`[Erase] 所有批次完成，共生成 ${allResults.length} 个结果`)
          store.setResults(allResults)
          displayEraseResults(allResults)
          analysisStore.setAnalysisStatus(`擦除分析完成：共生成 ${allResults.length} 个结果，已渲染到地图。`)
          store.setIsAnalyzing(false)
        }
      } else if (type === 'ERROR') {
        console.error(`[Erase] 批次 ${batchId} 处理失败:`, error)
        completedBatches++
        
        if (completedBatches >= totalBatches) {
          worker.terminate()
          console.log(`[Erase] 分析完成（部分批次失败），共生成 ${allResults.length} 个结果`)
          store.setResults(allResults)
          displayEraseResults(allResults)
          analysisStore.setAnalysisStatus(`擦除分析完成：共生成 ${allResults.length} 个结果，已渲染到地图。`)
          store.setIsAnalyzing(false)
        }
      }
    }

    // 清理要素数据，确保可以序列化
    const cleanGeoJsonData = (features: any[]): any[] => {
      return features.map(feature => {
        if (feature && typeof feature === 'object') {
          // 确保是纯GeoJSON格式，移除任何不可序列化的属性
          return {
            type: feature.type || 'Feature',
            geometry: feature.geometry || feature,
            properties: feature.properties || {}
          }
        }
        return feature
      })
    }

    // 启动分页计算
    try {
      for (let targetStart = 0; targetStart < targetGeoJson.length; targetStart += targetBatchSize) {
        const targetEnd = Math.min(targetStart + targetBatchSize, targetGeoJson.length)
        
        for (let eraseStart = 0; eraseStart < eraseGeoJson.length; eraseStart += eraseBatchSize) {
          const eraseEnd = Math.min(eraseStart + eraseBatchSize, eraseGeoJson.length)
          
          const batchId = `erase_batch_${targetStart}_${targetEnd}_${eraseStart}_${eraseEnd}`
          
          worker.postMessage({
            type: 'PROCESS_BATCH',
            data: {
              batchId,
              targetFeatures: cleanGeoJsonData(targetGeoJson),
              eraseFeatures: cleanGeoJsonData(eraseGeoJson),
              startTargetIndex: targetStart,
              endTargetIndex: targetEnd,
              startEraseIndex: eraseStart,
              endEraseIndex: eraseEnd
            }
          })
        }
      }
    } catch (error) {
      console.error('[Erase] Critical error during analysis:', error)
      worker.terminate()
      analysisStore.setAnalysisStatus(`擦除分析遇到错误，但已处理部分结果：${allResults.length} 个`)
      store.setIsAnalyzing(false)
    }
  }

  const displayEraseResults = (items: EraseResultItem[]): void => {
    if (!mapStore.map) return

    removeEraseLayers()

    // 创建空的矢量图层容器
    const source = new VectorSource({})
    const rootStyle = getComputedStyle(document.documentElement)
    const strokeColor = rootStyle.getPropertyValue('--map-highlight-color')?.trim() || '#000000'
    const fillVar = rootStyle.getPropertyValue('--map-select-fill')?.trim() || 'rgba(0, 0, 0, 0.15)'

    const layer = new VectorLayer({
      source,
      style: new Style({
        stroke: new Stroke({ color: strokeColor, width: 2 }),
        fill: new Fill({ color: fillVar })
      })
    })
    layer.set('isEraseLayer', true)
    layer.set('eraseResults', items)
    mapStore.map.addLayer(layer)

    const totalItems = items.length
    console.log(`[Erase] 开始渲染 ${totalItems} 个结果`)

    // 智能渲染策略：根据要素数量选择渲染方式
    if (totalItems > 1000) {
      // 大数据量：合并要素后渲染
      console.log(`[Erase] 使用合并渲染策略（${totalItems} 个要素）`)
      displayMergedResults(items, source)
    } else {
      // 小数据量：直接渲染
      console.log(`[Erase] 使用直接渲染策略（${totalItems} 个要素）`)
      displayDirectResults(items, source)
    }
  }

  // 合并渲染策略
  const displayMergedResults = (items: EraseResultItem[], source: VectorSource): void => {
    const format = new GeoJSON()
    
    // 转换为GeoJSON格式
    const geoJsonFeatures = items.map(item => {
      if (item.geometry && item.geometry.type && item.geometry.coordinates) {
        return {
          type: 'Feature',
          geometry: item.geometry,
          properties: {
            id: item.id,
            name: item.name,
            sourceTarget: item.sourceTargetLayerName,
            sourceErase: item.sourceEraseLayerName,
            createdAt: item.createdAt
          }
        }
      }
      return null
    }).filter(Boolean)

    if (geoJsonFeatures.length === 0) {
      console.warn('[Erase] 没有有效的要素可以渲染')
      return
    }

    // 合并所有要素
    console.log(`[Erase] 开始合并 ${geoJsonFeatures.length} 个要素`)
    const mergedFeature = mergeFeatures(geoJsonFeatures)
    
    if (mergedFeature && mergedFeature.geometry) {
      // 创建合并后的要素
      const geometry = format.readGeometry(mergedFeature.geometry)
      const mergedOlFeature = new Feature({
        geometry,
        properties: {
          id: `merged_erase_${Date.now()}`,
          name: `合并擦除区域 (${items.length}个要素)`,
          sourceTarget: '多个目标图层',
          sourceErase: '多个擦除图层',
          createdAt: new Date().toISOString(),
          originalCount: items.length
        }
      })

      // 添加到图层
      source.addFeature(mergedOlFeature)
      
      console.log(`[Erase] 合并渲染完成，生成了1个合并要素`)
      
      // 缩放到结果范围
      const extent = source.getExtent()
      if (extent && !extent.every((coord: number) => coord === Infinity)) {
        mapStore.map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000
        })
      }
    } else {
      console.error('[Erase] 要素合并失败')
    }
  }

  // 直接渲染策略
  const displayDirectResults = (items: EraseResultItem[], source: VectorSource): void => {
    const format = new GeoJSON()
    
    // 直接转换所有要素
    const features = items.map(item => {
      if (item.geometry && item.geometry.type && item.geometry.coordinates) {
        const geometry = format.readGeometry(item.geometry)
        return new Feature({
          geometry,
          properties: {
            id: item.id,
            name: item.name,
            sourceTarget: item.sourceTargetLayerName,
            sourceErase: item.sourceEraseLayerName,
            createdAt: item.createdAt
          }
        })
      }
      return null
    }).filter(Boolean)

    // 批量添加要素
    if (features.length > 0) {
      source.addFeatures(features as any[])
      console.log(`[Erase] 直接渲染完成，共渲染 ${features.length} 个要素`)
      
      // 缩放到结果范围
      const extent = source.getExtent()
      if (extent && !extent.every((coord: number) => coord === Infinity)) {
        mapStore.map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000
        })
      }
    }
  }

  const removeEraseLayers = (): void => {
    if (!mapStore.map) return
    const layers = mapStore.map.getLayers().getArray()
    layers.forEach((l: any) => {
      if (l.get('isEraseLayer')) {
        mapStore.map.removeLayer(l)
      }
      if (l.get('isInvalidGeometryLayer')) {
        mapStore.map.removeLayer(l)
      }
    })
  }

  const clearState = (): void => {
    store.clearResults()
    removeEraseLayers()
  }

  // 将擦除结果保存为图层管理中的绘制图层
  const saveEraseResultsAsLayer = async (items: EraseResultItem[]): Promise<void> => {
    if (!mapStore.map || items.length === 0) return

    try {
      // 将擦除结果转换为 OpenLayers Feature
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
              sourceErase: item.sourceEraseLayerName, 
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
        const layerName = `擦除分析结果_${new Date().toLocaleString()}`
        await saveFeaturesAsLayer(features as any[], layerName, 'intersect')
        
        console.log(`[Erase] Saved ${features.length} erase results as layer: ${layerName}`)
      }
    } catch (error: any) {
      console.error('[Erase] Failed to save erase results as layer:', error)
    }
  }

  const displayInvalidGeometries = (invalidTarget: any[], invalidErase: any[]): void => {
    if (!mapStore.map) return
    const format = new GeoJSON()
    const feats: any[] = [] as any
    const take = (arr: any[], src: 'target' | 'erase') => {
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
    take(invalidErase, 'erase')
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
    eraseLayerId,
    layerOptions,
    results,
    currentResult,
    isAnalyzing,
    targetFeatureCount,
    eraseFeatureCount,
    targetFeaturesCache,
    eraseFeaturesCache,
    setTargetLayer,
    setEraseLayer,
    executeEraseAnalysis,
    displayEraseResults,
    removeEraseLayers,
    clearState,
    saveEraseResultsAsLayer
  }
}
