import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useIntersectionAnalysisStore } from '@/stores/intersectionAnalysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import { Feature } from 'ol'
import { Vector as VectorSource } from 'ol/source'
import { Vector as VectorLayer } from 'ol/layer'
import { Style, Stroke, Fill } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'
import { intersect as turfIntersect, kinks as turfKinks, polygon as turfPolygon, multiPolygon as turfMultiPolygon, feature as turfFeature } from '@turf/turf'
import { convertFeaturesToTurfGeometries, prepareTurfAnalysisInput } from '@/utils/geometryConverter'

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

  // 智能相交分析（统一使用传统计算方法）
  const executeSmartIntersectionAnalysis = async (params: { targetLayerId: string; maskLayerId: string; targetFeatures: any[]; maskFeatures: any[]; }): Promise<void> => {
    const targetCount = params.targetFeatures.length
    const maskCount = params.maskFeatures.length
    const totalPairs = targetCount * maskCount
    
    console.log(`[SmartIntersection] 数据量分析: 目标要素 ${targetCount}, 遮罩要素 ${maskCount}, 总组合数 ${totalPairs}`)
    
    // 统一使用传统计算方法
    console.log('[SmartIntersection] 使用传统计算方法')
    await executeIntersectionAnalysis(params)
  }


  // 传统相交分析（保留作为备用）
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

    // 使用直接坐标转换方法替代writeFeatureObject
    const targetGeoJson = convertFeaturesToTurfGeometries(targetFeatures)
    const maskGeoJson = convertFeaturesToTurfGeometries(maskFeatures)

    console.log('[Intersection] selected ids:', { targetLayerId: tId, maskLayerId: mId })
    console.log('[Intersection] cache sizes (features from store):', { targetCache: targetFeatures.length, maskCache: maskFeatures.length })
    console.log('[Intersection] geojson sizes (transformed for intersect):', { target: targetGeoJson.length, mask: maskGeoJson.length })
    
    if (targetGeoJson.length < 1 || maskGeoJson.length < 1) {
      console.warn('[Intersection] after transformation, one side has 0 geometries')
      analysisStore.setAnalysisStatus('转换后的几何数据为空，无法执行相交分析')
      store.setIsAnalyzing(false)
      return
    }

    const coordinateShape = (coords: any): number[] => {
      const sizes: number[] = []
      let cur: any = coords
      while (Array.isArray(cur)) {
        sizes.push(cur.length)
        cur = cur[0]
      }
      return sizes
    }
    const firstPosition = (coords: any): any => {
      let cur: any = coords
      while (Array.isArray(cur) && Array.isArray(cur[0])) {
        cur = cur[0]
      }
      if (Array.isArray(cur)) {
        return (cur as number[]).slice(0, 3)
      }
      return cur
    }

    console.log('[Intersection] sample geometries (first 5):', { 
      target: targetGeoJson.slice(0, 5).map((g: any, idx: number) => ({ idx, type: g?.geometry?.type })),
      mask: maskGeoJson.slice(0, 5).map((g: any, idx: number) => ({ idx, type: g?.geometry?.type }))
    })

    // 检查几何有效性（turf几何对象已经是有效的）
    const validTarget = targetGeoJson.filter((g: any) => g && g.geometry)
    const validMask = maskGeoJson.filter((g: any) => g && g.geometry)
    console.log('[Intersection] valid geometries:', { target: validTarget.length, mask: validMask.length })

    const out: IntersectionResultItem[] = []
    const totalPairs = targetGeoJson.length * maskGeoJson.length
    let processedPairs = 0

    console.log('[Intersection] Starting async intersection calculation...', { targetCount: targetGeoJson.length, maskCount: maskGeoJson.length, totalPairs })

    // 异步处理函数
    const processIntersectionAsync = async (): Promise<void> => {
      return new Promise((resolve) => {
        const processBatch = (startI: number, startJ: number) => {
          const batchSize = 100 // 每批处理10个组合
          let currentI = startI
          let currentJ = startJ
          let batchCount = 0

          while (currentI < targetGeoJson.length && batchCount < batchSize) {
            const tfGj: any = targetGeoJson[currentI]
            const mfGj: any = maskGeoJson[currentJ]

            console.log(`[Intersection] Processing pair [${currentI}, ${currentJ}]...`)

            try {
              const targetFeature = tfGj
              const maskFeature = mfGj
              
              if (!targetFeature || !maskFeature) {
                console.log(`[Intersection] Skipping [${currentI}, ${currentJ}] - invalid features`)
              } else {
                // 使用工具函数准备FeatureCollection格式的输入进行相交分析
                const featureCollection = prepareTurfAnalysisInput(targetFeature, maskFeature)
                const intersection: any = turfIntersect(featureCollection)
                
                if (intersection && intersection.geometry) {
                  const resultItem: IntersectionResultItem = {
                    id: `intersection_${currentI}_${currentJ}_${Date.now()}`,
                    name: `相交区域 ${out.length + 1}`,
                    geometry: intersection.geometry,
                    sourceTargetLayerName: target?.name || '目标图层',
                    sourceMaskLayerName: mask?.name || '遮罩图层',
                    createdAt: new Date().toISOString()
                  }
                  out.push(resultItem)
                  console.log(`[Intersection] Added result [${currentI}, ${currentJ}], total results: ${out.length}`)
                }
              }
            } catch (error: any) {
              console.warn(`[Intersection] Failed to compute intersection for target[${currentI}] and mask[${currentJ}]:`, {
                error: error?.message || error,
                targetType: tfGj?.geometry?.type,
                maskType: mfGj?.geometry?.type
              })
            }

            processedPairs++
            batchCount++

            // 更新进度
            const progress = Math.round((processedPairs / totalPairs) * 100)
            analysisStore.setAnalysisStatus(`正在执行相交分析... ${progress}% (${processedPairs}/${totalPairs})`)

            // 移动到下一个组合
            currentJ++
            if (currentJ >= maskGeoJson.length) {
              currentJ = 0
              currentI++
            }

            // 检查是否完成
            if (currentI >= targetGeoJson.length) {
              resolve()
              return
            }
          }

          // 使用 setTimeout 让出控制权，避免阻塞浏览器
          setTimeout(() => {
            processBatch(currentI, currentJ)
          }, 0)
        }

        // 开始处理
        processBatch(0, 0)
      })
    }

    try {
      await processIntersectionAsync()
    } catch (error) {
      console.error('[Intersection] Critical error during analysis:', error)
      analysisStore.setAnalysisStatus(`相交分析遇到错误，但已处理部分结果：${out.length} 个`)
    } finally {
      console.log(`[Intersection] Analysis completed. Results: ${out.length}`)
      store.setResults(out)
      displayIntersectionResults(out)
      analysisStore.setAnalysisStatus(`相交分析完成：共生成 ${out.length} 个结果，已渲染到地图。`)
      store.setIsAnalyzing(false)
      console.log(`[Intersection] Analysis status updated and isAnalyzing set to false`)
    }
  }

  const displayIntersectionResults = (items: IntersectionResultItem[]): void => {
    if (!mapStore.map) return

    removeIntersectionLayers()

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
    layer.set('isIntersectionLayer', true)
    layer.set('intersectionResults', items)
    mapStore.map.addLayer(layer)

    // 分页处理要素，避免一次性渲染大量要素导致卡死
    const pageSize = 100 // 每批处理100个要素
    let currentIndex = 0

    const processBatch = (): void => {
      const endIndex = Math.min(currentIndex + pageSize, items.length)
      const batchItems = items.slice(currentIndex, endIndex)

      const batchFeatures = batchItems.map(item => {
        let geometry
        const format = new GeoJSON()
        if (item.geometry && item.geometry.type && item.geometry.coordinates) {
          geometry = format.readGeometry(item.geometry)
        } else {
          return null
        }
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
        return f
      }).filter(Boolean)

      // 批量添加要素到图层
      if (batchFeatures.length > 0) {
        source.addFeatures(batchFeatures as any[])
      }

      currentIndex = endIndex

      // 如果还有更多要素需要处理，使用setTimeout让出控制权
      if (currentIndex < items.length) {
        setTimeout(() => {
          processBatch()
        }, 0)
      } else {
        // 所有要素处理完成，缩放到结果范围
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
        }
      }
    }

    // 开始分页处理
    processBatch()
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
    executeSmartIntersectionAnalysis, // 分析方法
    displayIntersectionResults,
    removeIntersectionLayers,
    clearState,
    saveIntersectionResultsAsLayer
  }
}


