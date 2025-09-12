import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useAreaSelectionStore } from '@/stores/areaSelectionStore'
import { usePopupStore } from '@/stores/popupStore'
import { getFeatureGeometryType, getFeatureGeometryDescription } from '@/utils/featureUtils'

const ol = window.ol

export function useFeatureSelection() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const selectionStore = useAreaSelectionStore()
  const popupStore = usePopupStore()

  // 状态管理
  const boxSelectInteraction = ref<any>(null)
  const highlightedFeature = ref<any>(null)

  // 选中要素列表（使用 selectionStore 的状态）
  const selectedFeatures = computed({
    get: () => selectionStore.selectedFeatures,
    set: (value) => selectionStore.setSelectedFeatures(value)
  })

  const selectedFeatureIndex = computed({
    get: () => selectionStore.selectedFeatureIndex,
    set: (value) => selectionStore.setSelectedFeatureIndex(value)
  })

  // 几何计算函数
  const calculateLineLength = (coordinates: number[][]): number => {
    if (!coordinates || coordinates.length < 2) return 0
    
    let totalLength = 0
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1]
      const [lon2, lat2] = coordinates[i]
      totalLength += haversineDistance(lat1, lon1, lat2, lon2)
    }
    return totalLength
  }

  const calculatePolygonArea = (coordinates: number[][]): number => {
    if (!coordinates || coordinates.length < 3) return 0
    
    // 简化的球面面积计算（适用于小区域）
    let area = 0
    const n = coordinates.length
    
    for (let i = 0; i < n - 1; i++) {
      const [x1, y1] = coordinates[i]
      const [x2, y2] = coordinates[i + 1]
      area += x1 * y2 - x2 * y1
    }
    
    // 将度转换为平方千米（近似）
    const earthRadius = 6371 // 地球半径（千米）
    const latRad = coordinates[0][1] * Math.PI / 180
    const kmPerDegLat = earthRadius * Math.PI / 180
    const kmPerDegLon = kmPerDegLat * Math.cos(latRad)
    
    return Math.abs(area * kmPerDegLat * kmPerDegLon / 2)
  }

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // 地球半径（千米）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // 要素信息处理函数
  const getFeatureType = (feature: any): string => {
    return getFeatureGeometryType(feature)
  }

  const getFeatureCoords = (feature: any): string => {
    return getFeatureGeometryDescription(feature)
  }

  const getFeatureGeometryInfo = (feature: any): string => {
    return getFeatureGeometryDescription(feature)
  }

  // 创建框选交互
  const createBoxSelectInteraction = () => {
    const interaction = new ol.interaction.DragBox({
      condition: ol.events.condition.always
    })

    interaction.on('boxstart', () => {
      analysisStore.setAnalysisStatus('开始框选，请拖拽鼠标选择要素')
    })

    interaction.on('boxend', async (event: any) => {
      const extent = event.target.getGeometry().getExtent()
      await selectFeaturesInExtent(extent)
    })

    return interaction
  }

  // 设置选择交互
  const setupSelectionInteractions = () => {
    if (!mapStore.map) return

    // 清除现有交互
    clearSelectionInteractions()

    // 创建框选交互
    boxSelectInteraction.value = createBoxSelectInteraction()
    mapStore.map.addInteraction(boxSelectInteraction.value)
  }

  // 清除选择交互
  const clearSelectionInteractions = () => {
    if (!mapStore.map) return

    if (boxSelectInteraction.value) {
      mapStore.map.removeInteraction(boxSelectInteraction.value)
      boxSelectInteraction.value = null
    }
  }

  // 在范围内选择要素
  const selectFeaturesInExtent = async (extent: number[]) => {
    const features: any[] = []

    // 显示加载状态
    analysisStore.setAnalysisStatus('正在收集框选区域内的要素...')

    // 使用 setTimeout 让UI有机会更新
    await new Promise(resolve => setTimeout(resolve, 10))

    mapStore.vectorlayers.forEach(layerInfo => {
      if (layerInfo.visible && layerInfo.layer) {
        const source = layerInfo.layer.getSource()
        if (source && source.forEachFeatureInExtent) {
          source.forEachFeatureInExtent(extent, (feature: any) => {
            features.push(feature)
          })
        }
      }
    })

    if (features.length > 0) {
      analysisStore.setAnalysisStatus(`找到 ${features.length} 个要素，正在处理...`)
      // 区域侧仅维护自己的结果
      selectionStore.setSelectedFeatures(features)
      selectionStore.setSelectedFeatureIndex(-1)
      // 在地图上高亮并标记来源为 area
      await highlightFeaturesAsync(features.map(f => {
        if (typeof f.set === 'function') {
          try { f.set('sourceTag', 'area') } catch (_) {}
        }
        return f
      }))
      // 清空后首次框选：自动选中首项并触发高亮
      if (selectionStore.selectedFeatures.length > 0) {
        selectionStore.setSelectedFeatureIndex(0)
        handleSelectFeature(0)
      }
    } else {
      analysisStore.setAnalysisStatus('框选范围内没有找到要素')
    }
  }

  // 异步高亮显示多个要素
  const highlightFeaturesAsync = async (features: any[]) => {
    if (!mapStore.map || !mapStore.selectlayer || features.length === 0) return

    const source = mapStore.selectlayer.getSource()
    if (!source) return

    const batchSize = 100

    // 分批添加要素到高亮图层
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize)

      batch.forEach(feature => {
        if (feature) {
          source.addFeature(feature)
        }
      })

      // 让UI有机会更新
      if (i + batchSize < features.length) {
        await new Promise(resolve => setTimeout(resolve, 5))
      }
    }
  }

  // 选择要素（在列表中点击）
  const handleSelectFeature = (index: number) => {
    selectedFeatureIndex.value = index
    const feature = selectedFeatures.value[index]
    if (feature) {
      highlightFeatureOnMap(feature)
      analysisStore.setAnalysisStatus(`已选择要素 ${index + 1}`)
      
      // 触发地图中的要素常亮效果
      triggerMapFeatureHighlight(feature)
    }
  }

  // 在地图上高亮显示要素
  const highlightFeatureOnMap = (feature: any) => {
    if (!mapStore.map || !feature) return

    // 确保选择图层中包含当前要素
    if (mapStore.selectlayer && mapStore.selectlayer.getSource) {
      const source = mapStore.selectlayer.getSource()
      if (source) {
        // 检查要素是否已经在高亮图层中，如果不在则添加
        const features = source.getFeatures()
        const exists = features.some((f: any) => {
          const fGeometry = f.getGeometry()
          const originalGeometry = feature.getGeometry()
          if (!fGeometry || !originalGeometry) return false

          const fCoords = JSON.stringify(fGeometry.getCoordinates())
          const originalCoords = JSON.stringify(originalGeometry.getCoordinates())
          return fCoords === originalCoords
        })

        if (!exists) {
          try { feature.set('sourceTag', 'area') } catch (_) {}
          source.addFeature(feature)
        }
      }
    }
  }

  // 触发地图中要素常亮效果
  const triggerMapFeatureHighlight = (feature: any) => {
    // 清除之前的常亮要素
    if (highlightedFeature.value) {
      removeHighlightFeature()
    }

    // 设置常亮要素
    highlightedFeature.value = feature

    // 开始常亮效果
    startHighlightAnimation()
  }

  // 开始常亮效果
  const startHighlightAnimation = () => {
    if (!highlightedFeature.value || !mapStore.selectlayer) return

    const source = mapStore.selectlayer.getSource()
    if (!source) return

    // 创建常亮样式
    const createFlashingStyle = () => {
      const grayFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-select-fill').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(74, 85, 104, 0.15)')
      const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--map-highlight-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#4a5568')

      return (feature: any) => {
        // 检查是否是常亮要素
        const isHighlightFeature = isSameFeature(feature, highlightedFeature.value)

        const geometry = feature.getGeometry()
        if (!geometry) return null

        const geometryType = geometry.getType()

        if (isHighlightFeature) {
          // 常亮样式 - 橙色高亮
          switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
              return new ol.style.Style({
                image: new ol.style.Circle({ 
                  radius: 12, 
                  stroke: new ol.style.Stroke({color: highlightColor, width: 4}), 
                  fill: new ol.style.Fill({color: grayFillColor})
                })
              })
              
            case 'LineString':
            case 'MultiLineString':
              return new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: highlightColor, 
                  width: 6,
                  lineCap: 'round',
                  lineJoin: 'round'
                })
              })
              
                         case 'Polygon':
             case 'MultiPolygon':
               return new ol.style.Style({
                 stroke: new ol.style.Stroke({color: highlightColor, width: 4}),
                 fill: new ol.style.Fill({color: grayFillColor})
               })
               
             default:
               return new ol.style.Style({
                 image: new ol.style.Circle({ 
                   radius: 12, 
                   stroke: new ol.style.Stroke({color: highlightColor, width: 4}), 
                   fill: new ol.style.Fill({color: grayFillColor})
                 }),
                 stroke: new ol.style.Stroke({color: highlightColor, width: 4}),
                 fill: new ol.style.Fill({color: grayFillColor})
               })
          }
        } else {
          // 正常样式 - 使用主题高亮颜色
          switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
              return new ol.style.Style({
                image: new ol.style.Circle({ 
                  radius: 8, 
                  stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
                  fill: new ol.style.Fill({color: grayFillColor})
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
                stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
                fill: new ol.style.Fill({color: grayFillColor})
              })
              
            default:
              return new ol.style.Style({
                image: new ol.style.Circle({ 
                  radius: 8, 
                  stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
                  fill: new ol.style.Fill({color: grayFillColor})
                }),
                stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
                fill: new ol.style.Fill({color: grayFillColor})
              })
          }
        }
      }
    }

    // 设置常亮样式
    mapStore.selectlayer.setStyle(createFlashingStyle())
    mapStore.selectlayer.changed()
  }

  // 移除常亮要素
  const removeHighlightFeature = () => {
    if (!mapStore.selectlayer) return

    // 恢复原始样式
    const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--map-highlight-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#4a5568')
    const grayFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-select-fill').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(74, 85, 104, 0.15)')

    const restoreOriginalStyle = (feature: any) => {
      const geometry = feature.getGeometry()
      if (!geometry) return null

      const geometryType = geometry.getType()

      switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
          return new ol.style.Style({
            image: new ol.style.Circle({ 
              radius: 8, 
              stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
              fill: new ol.style.Fill({color: grayFillColor})
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
            stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
            fill: new ol.style.Fill({color: grayFillColor})
          })
          
        default:
          return new ol.style.Style({
            image: new ol.style.Circle({ 
              radius: 8, 
              stroke: new ol.style.Stroke({color: highlightColor, width: 3}), 
              fill: new ol.style.Fill({color: grayFillColor})
            }),
            stroke: new ol.style.Stroke({color: highlightColor, width: 3}),
            fill: new ol.style.Fill({color: grayFillColor})
          })
      }
    }

    mapStore.selectlayer.setStyle(restoreOriginalStyle)
    mapStore.selectlayer.changed()
  }

  // 检查两个要素是否相同
  const isSameFeature = (feature1: any, feature2: any): boolean => {
    if (!feature1 || !feature2) return false

    // 比较ID
    const id1 = feature1.getId?.() || feature1.id
    const id2 = feature2.getId?.() || feature2.id
    if (id1 && id2 && id1 === id2) return true

    // 比较几何坐标
    const geom1 = feature1.getGeometry?.()
    const geom2 = feature2.getGeometry?.()

    if (geom1 && geom2) {
      const coords1 = geom1.getCoordinates?.()
      const coords2 = geom2.getCoordinates?.()

      if (coords1 && coords2) {
        const coordStr1 = JSON.stringify(coords1)
        const coordStr2 = JSON.stringify(coords2)
        return coordStr1 === coordStr2
      }
    }

    return false
  }

  // 清除地图上的区域选择高亮
  const clearMapSelection = () => {
    if (mapStore.selectlayer && mapStore.selectlayer.getSource) {
      const source = mapStore.selectlayer.getSource()
      if (source) {
        const feats = source.getFeatures?.() || []
        feats.forEach((f: any) => {
          if (f?.get && f.get('sourceTag') === 'area') {
            source.removeFeature(f)
          }
        })
      }
    }
  }

  // 反选：基于当前已选要素所在图层进行反选
  const invertSelectedlayer = () => {
    // 推断目标图层：通过几何坐标匹配找到要素所属的图层
    const first = selectedFeatures.value[0]
    if (!first) {
      analysisStore.setAnalysisStatus('请先选择要操作的数据')
      return
    }

    // 通过几何坐标匹配找到要素所属的图层
    let layerInfo = null
    for (const layer of mapStore.vectorlayers) {
      if (layer.visible && layer.layer) {
        const source = layer.layer.getSource()
        if (source) {
          const features = source.getFeatures()
          const found = features.some((f: any) => {
            const fGeom = f.getGeometry()
            const firstGeom = first.getGeometry()
            if (fGeom && firstGeom) {
              const fCoords = JSON.stringify(fGeom.getCoordinates())
              const firstCoords = JSON.stringify(firstGeom.getCoordinates())
              return fCoords === firstCoords
            }
            return false
          })
          if (found) {
            layerInfo = layer
            break
          }
        }
      }
    }

    if (!layerInfo || !layerInfo.layer) {
      analysisStore.setAnalysisStatus('图层不存在或不可用')
      return
    }

    const source = layerInfo.layer.getSource?.()
    const selectSource = mapStore.selectlayer?.getSource?.()
    if (!source || !selectSource) {
      analysisStore.setAnalysisStatus('数据源不可用')
      return
    }

    // 移除区域侧旧高亮
    clearMapSelection()

    // 计算未被选择的要素集合
    const all = source.getFeatures?.() || []
    const currentSelectedOriginals = selectedFeatures.value
    const unselected: any[] = []
    all.forEach((f: any) => {
      const isSelected = currentSelectedOriginals.some((sf: any) => {
        const sg = sf.getGeometry?.(); const fg = f.getGeometry?.()
        if (sg && fg) return JSON.stringify(sg.getCoordinates()) === JSON.stringify(fg.getCoordinates())
        return false
      })
      if (!isSelected) unselected.push(f)
    })

    // 高亮未选中的要素并标记来源
    unselected.forEach(f => {
      try { f.set('sourceTag', 'area') } catch (_) {}
      selectSource.addFeature(f)
    })

    // 写入区域选择结果
    selectionStore.setSelectedFeatures(unselected)
    selectionStore.setSelectedFeatureIndex(-1)

    // 自动选中第一个要素并触发高亮效果
    if (unselected.length > 0) {
      selectionStore.setSelectedFeatureIndex(0)
      const firstFeature = unselected[0]
      if (firstFeature) {
        highlightFeatureOnMap(firstFeature)
        triggerMapFeatureHighlight(firstFeature)
        analysisStore.setAnalysisStatus(`已反选图层 "${layerInfo.name}"，已自动选中第一个要素`)
      }
    } else {
      analysisStore.setAnalysisStatus(`已反选图层 "${layerInfo.name}"，更新选择列表`)
    }
  }

  // 清除区域选择：只清除sourceTag为'area'的要素
  const clearSelection = () => {
    // 先移除区域选择相关交互与监听
    clearSelectionInteractions()
    
    // 清除地图上的区域高亮
    if (mapStore.selectlayer && mapStore.selectlayer.getSource()) {
      const source = mapStore.selectlayer.getSource()
      const features = source.getFeatures()
      features.forEach((f: any) => {
        if (f?.get && f.get('sourceTag') === 'area') {
          source.removeFeature(f)
        }
      })
      mapStore.selectlayer.changed()
    }
    
    // 清除区域选择存储状态
    selectionStore.clear()
    
    // 清除弹窗状态，确保状态同步
    popupStore.hidePopup()
    
    // 恢复区域选择交互，确保清空后可继续框选
    setupSelectionInteractions()
  }

  // 初始化高亮已有要素
  const initializeHighlightFeatures = async () => {
    if (selectedFeatures.value.length > 0) {
      // 延迟一下确保地图已经准备好
      setTimeout(async () => {
        await highlightFeaturesAsync(selectedFeatures.value)
      }, 100)
    }
  }

  return {
    // 状态
    selectedFeatures,
    selectedFeatureIndex,
    highlightedFeature,

    // 方法
    setupSelectionInteractions,
    clearSelectionInteractions,
    handleSelectFeature,
    clearSelection,
    invertSelectedlayer,
    triggerMapFeatureHighlight,
    removeHighlightFeature,
    initializeHighlightFeatures,
    
    // 内部方法（可选择性暴露）
    selectFeaturesInExtent,
    highlightFeatureOnMap,
    isSameFeature,
    getFeatureType,
    getFeatureCoords,
    getFeatureGeometryInfo
  }
}