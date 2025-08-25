import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useMapStore } from '@/stores/mapStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useModeStateStore } from '@/stores/modeStateStore'
import type { QueryCondition, QueryConfig, FieldInfo } from '@/types/query'

interface FeatureLike {
  getProperties?: () => Record<string, any>
  getGeometry?: () => any
  getId?: () => string | number | null
  [key: string]: any
}

export const useFeatureQueryStore = defineStore('featureQuery', () => {
  const analysisStore = useAnalysisStore()
  const mapStore = useMapStore()
  const modeStateStore = useModeStateStore()

  const selectedLayerId = ref<string>('')
  const queryResults = ref<any[]>([])
  const layerFields = ref<FieldInfo[]>([])
  const isQuerying = ref<boolean>(false)
  const lastExecutedQuery = ref<string>('')

  const queryConfig = reactive<QueryConfig>({
    condition: { fieldName: '', operator: 'eq', value: '' }
  })

  const selectedFeatureIndex = ref<number>(-1)
  const highlightedFeature = ref<any>(null)

  const hasResults = computed(() => queryResults.value.length > 0)
  const selectedFeature = computed(() => {
    if (selectedFeatureIndex.value >= 0 && selectedFeatureIndex.value < queryResults.value.length) {
      return queryResults.value[selectedFeatureIndex.value]
    }
    return null
  })

  const getLayerOptions = () => {
    const visibleLayers = mapStore.vectorLayers.filter(layer => layer.layer && layer.layer.getVisible())
    return visibleLayers.map(layer => ({ value: layer.id, label: layer.name, disabled: false }))
  }

  const getSelectedLayerName = (layerId: string) => {
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    return layer ? layer.name : ''
  }

  const getLayerFeatureCount = (layerId: string) => {
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    if (!layer || !layer.layer) return 0
    try {
      const source = layer.layer.getSource()
      return source ? source.getFeatures().length : 0
    } catch (_) {
      return 0
    }
  }

  const getFieldType = (value: any): string => {
    if (value === null || value === undefined) return '空值'
    if (typeof value === 'string') return '文本'
    if (typeof value === 'number') return Number.isInteger(value) ? '整数' : '小数'
    if (typeof value === 'boolean') return '布尔值'
    if (value instanceof Date) return '日期'
    if (Array.isArray(value)) return '数组'
    if (typeof value === 'object') return '对象'
    return '未知'
  }

  const getSampleValue = (value: any): string => {
    if (value === null || value === undefined) return '(空值)'
    if (typeof value === 'string') return value.length > 20 ? value.substring(0, 20) + '...' : value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (value instanceof Date) return value.toLocaleDateString()
    if (Array.isArray(value)) return `[${value.length}个元素]`
    if (typeof value === 'object') return '{对象}'
    return String(value)
  }

  const getFieldDescription = (fieldName: string, fieldType: string): string => {
    const commonFields: Record<string, string> = {
      name: '名称字段', id: '标识字段', code: '编码字段', type: '类型字段',
      area: '面积字段', length: '长度字段', population: '人口字段', address: '地址字段',
      description: '描述字段', remark: '备注字段', note: '注释字段', comment: '评论字段'
    }
    const lower = fieldName.toLowerCase()
    for (const [k, v] of Object.entries(commonFields)) {
      if (lower.includes(k)) return v
    }
    return `${fieldType}类型字段`
  }

  const getLayerFields = async (layerId: string) => {
    if (!layerId) { layerFields.value = []; return [] }
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    if (!layer || !layer.layer) { layerFields.value = []; return [] }
    try {
      const source = layer.layer.getSource()
      if (source) {
        const features = source.getFeatures()
        if (features.length > 0) {
          const first = features[0]
          const properties = first.getProperties()
          const fields: FieldInfo[] = []
          Object.keys(properties).forEach(key => {
            if (key !== 'geometry') {
              const value = properties[key]
              const type = getFieldType(value)
              const sample = getSampleValue(value)
              fields.push({ name: key, type, sampleValue: sample, description: getFieldDescription(key, type) })
            }
          })
          fields.sort((a, b) => a.name.localeCompare(b.name))
          layerFields.value = fields
          return fields
        }
      }
      layerFields.value = []
      return []
    } catch (e) {
      layerFields.value = []
      return []
    }
  }

  const validateQueryCondition = (condition: QueryCondition) => {
    if (!condition.fieldName) { analysisStore.setAnalysisStatus('请选择查询字段'); return false }
    if (condition.value === '' || condition.value === null || condition.value === undefined) {
      analysisStore.setAnalysisStatus('请输入查询值'); return false
    }
    return true
  }

  const isSameFeature = (f1: any, f2: any) => {
    if (!f1 || !f2) return false
    const id1 = f1.getId?.() || f1.id
    const id2 = f2.getId?.() || f2.id
    if (id1 && id2 && id1 === id2) return true
    const g1 = f1.getGeometry?.() || f1.geometry
    const g2 = f2.getGeometry?.() || f2.geometry
    if (g1 && g2) {
      const c1 = g1.getCoordinates?.() || g1.coordinates
      const c2 = g2.getCoordinates?.() || g2.coordinates
      if (c1 && c2) return JSON.stringify(c1) === JSON.stringify(c2)
    }
    if (f1._originalFeature && f2._originalFeature) return f1._originalFeature === f2._originalFeature
    return false
  }

  const executeSingleCondition = (feature: FeatureLike, condition: QueryCondition) => {
    const properties = feature.getProperties?.() || feature.properties || {}
    const fieldValue = properties[condition.fieldName]
    if (fieldValue === undefined || fieldValue === null) return false
    const field = layerFields.value.find(f => f.name === condition.fieldName)
    if (!field) return false
    switch (condition.operator) {
      case 'eq':
        return String(fieldValue).toLowerCase() === String(condition.value).toLowerCase()
      case 'gt':
        return field.type === '整数' || field.type === '小数'
          ? Number(fieldValue) > Number(condition.value)
          : String(fieldValue) > String(condition.value)
      case 'lt':
        return field.type === '整数' || field.type === '小数'
          ? Number(fieldValue) < Number(condition.value)
          : String(fieldValue) < String(condition.value)
      case 'gte':
        return field.type === '整数' || field.type === '小数'
          ? Number(fieldValue) >= Number(condition.value)
          : String(fieldValue) >= String(condition.value)
      case 'lte':
        return field.type === '整数' || field.type === '小数'
          ? Number(fieldValue) <= Number(condition.value)
          : String(fieldValue) <= String(condition.value)
      case 'like': {
        const fieldStr = String(fieldValue).toLowerCase()
        const pattern = String(condition.value).toLowerCase().replace(/%/g, '.*')
        const regex = new RegExp(pattern)
        return regex.test(fieldStr)
      }
      default:
        return false
    }
  }

  const executeFrontendQuery = async (condition: QueryCondition) => {
    const layer = mapStore.vectorLayers.find(l => l.id === selectedLayerId.value)
    if (!layer || !layer.layer) return []
    
    // 使用统一的要素数据结构
    const { getNormalizedFeaturesFromLayer, filterFeatures } = await import('@/utils/featureUtils')
    const normalizedFeatures = getNormalizedFeaturesFromLayer(layer)
    const matched = filterFeatures(normalizedFeatures, (f: any) => executeSingleCondition(f, condition))
    return matched
  }

  // 归一化并应用到查询结果（仅限查询模块内部）
  const applyQuerySelection = async (features: any[]) => {
    if (!Array.isArray(features)) {
      return
    }

    // 去重并标准化
    const unique: any[] = []
    const seen = new Set<string>()
    features.forEach((f: any) => {
      const original = f._originalFeature || f
      const geometry = original?.getGeometry?.() || f.geometry
      const coordinates = geometry?.getCoordinates?.() || geometry?.coordinates
      const layerName = f.layerName || original?.get?.('layerName') || ''
      const key = `${layerName}::${coordinates ? JSON.stringify(coordinates) : 'no-geom'}`
      if (!seen.has(key)) {
        seen.add(key)
        // 标准化结构
        const normalized = {
          id: original?.getId?.() || f.id || null,
          properties: original?.getProperties?.() || f.properties || {},
          geometry: geometry || null,
          layerName,
          _originalFeature: original
        }
        unique.push(normalized)
      }
    })

    // 同步到状态与地图（仅查询侧）
    queryResults.value = unique
    selectedFeatureIndex.value = -1
    highlightQueryResults()
    
    // 自动选中第一个要素并触发高亮效果
    if (unique.length > 0) {
      selectedFeatureIndex.value = 0
      const firstFeature = unique[0]
      if (firstFeature) {
        highlightFeatureOnMap(firstFeature)
        triggerMapFeatureHighlight(firstFeature)
        analysisStore.setAnalysisStatus(`已自动选中第一个要素`)
      }
    }
  }

  const highlightFeatureOnMap = (feature: any) => {
    if (!mapStore.map || !feature) return
    const original = feature._originalFeature || feature
    if (mapStore.selectLayer && mapStore.selectLayer.getSource) {
      const source = mapStore.selectLayer.getSource()
      if (source) {
        const exists = source.getFeatures().some((f: any) => {
          const fGeom = f.getGeometry(); const oGeom = original.getGeometry()
          if (!fGeom || !oGeom) return false
          return JSON.stringify(fGeom.getCoordinates()) === JSON.stringify(oGeom.getCoordinates())
        })
        if (!exists) {
          if (feature.layerName) original.set('layerName', feature.layerName)
          // 标记来源为查询
          try { original.set('sourceTag', 'query') } catch (_) {}
          source.addFeature(original)
        }
      }
    }
  }

  const triggerMapFeatureHighlight = (feature: any) => {
    if (highlightedFeature.value) removeHighlightFeature()
    highlightedFeature.value = feature
    startHighlightAnimation()
  }

  const startHighlightAnimation = () => {
    if (!highlightedFeature.value || !mapStore.selectLayer) return
    const source = mapStore.selectLayer.getSource()
    if (!source) return
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007bff'
    const grayFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-select-fill').trim() || 'rgba(128, 128, 128, 0.3)'
    const highlightColor = '#ff6b35'
    const createStyle = () => (feature: any) => {
      const isHighlight = isSameFeature(feature, highlightedFeature.value)
      const geom = feature.getGeometry(); if (!geom) return null
      const type = geom.getType()
      const styleCtor = window.ol.style
      if (isHighlight) {
        switch (type) {
          case 'Point':
          case 'MultiPoint':
            return new styleCtor.Style({ image: new styleCtor.Circle({ radius: 12, stroke: new styleCtor.Stroke({ color: highlightColor, width: 4 }), fill: new styleCtor.Fill({ color: 'rgba(255, 107, 53, 0.4)' }) }) })
          case 'LineString':
          case 'MultiLineString':
            return new styleCtor.Style({ stroke: new styleCtor.Stroke({ color: highlightColor, width: 6, lineCap: 'round', lineJoin: 'round' }) })
          case 'Polygon':
          case 'MultiPolygon':
            return new styleCtor.Style({ stroke: new styleCtor.Stroke({ color: highlightColor, width: 4 }), fill: new styleCtor.Fill({ color: 'rgba(255, 107, 53, 0.3)' }) })
          default:
            return new styleCtor.Style({ image: new styleCtor.Circle({ radius: 12, stroke: new styleCtor.Stroke({ color: highlightColor, width: 4 }), fill: new styleCtor.Fill({ color: 'rgba(255, 107, 53, 0.4)' }) }), stroke: new styleCtor.Stroke({ color: highlightColor, width: 4 }), fill: new styleCtor.Fill({ color: 'rgba(255, 107, 53, 0.3)' }) })
        }
      } else {
        switch (type) {
          case 'Point':
          case 'MultiPoint':
            return new styleCtor.Style({ image: new styleCtor.Circle({ radius: 8, stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) }) })
          case 'LineString':
          case 'MultiLineString':
            return new styleCtor.Style({ stroke: new styleCtor.Stroke({ color: accentColor, width: 5, lineCap: 'round', lineJoin: 'round' }) })
          case 'Polygon':
          case 'MultiPolygon':
            return new styleCtor.Style({ stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) })
          default:
            return new styleCtor.Style({ image: new styleCtor.Circle({ radius: 8, stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) }), stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) })
        }
      }
    }
    mapStore.selectLayer.setStyle(createStyle())
    mapStore.selectLayer.changed()
  }

  const removeHighlightFeature = () => {
    if (!mapStore.selectLayer) return
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007bff'
    const grayFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-select-fill').trim() || 'rgba(128, 128, 128, 0.3)'
    const restore = (feature: any) => {
      const geom = feature.getGeometry(); if (!geom) return null
      const type = geom.getType()
      const styleCtor = window.ol.style
      switch (type) {
        case 'Point':
        case 'MultiPoint':
          return new styleCtor.Style({ image: new styleCtor.Circle({ radius: 8, stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) }) })
        case 'LineString':
        case 'MultiLineString':
          return new styleCtor.Style({ stroke: new styleCtor.Stroke({ color: accentColor, width: 5, lineCap: 'round', lineJoin: 'round' }) })
        case 'Polygon':
        case 'MultiPolygon':
          return new styleCtor.Style({ stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) })
        default:
          return new styleCtor.Style({ image: new styleCtor.Circle({ radius: 8, stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) }), stroke: new styleCtor.Stroke({ color: accentColor, width: 3 }), fill: new styleCtor.Fill({ color: grayFillColor }) })
      }
    }
    mapStore.selectLayer.setStyle(restore)
    mapStore.selectLayer.changed()
  }

  const removeFeaturesByTagOrMatch = (tag: string, candidates: any[] = []) => {
    if (!mapStore.selectLayer || !mapStore.selectLayer.getSource) return
    const source = mapStore.selectLayer.getSource()
    if (!source) return
    const featuresOnLayer = source.getFeatures?.() || []
    featuresOnLayer.forEach((f: any) => {
      const isTagMatch = f?.get && f.get('sourceTag') === tag
      const isGeomMatch = candidates.some((c: any) => isSameFeature(c._originalFeature || c, f))
      if (isTagMatch || isGeomMatch) {
        source.removeFeature(f)
      }
    })
  }

  const highlightQueryResults = () => {
    if (queryResults.value.length === 0) return
    try {
      removeFeaturesByTagOrMatch('query')
      const selectSource = mapStore.selectLayer?.getSource()
      if (selectSource) {
        queryResults.value.forEach((r: any) => {
          if (r._originalFeature) {
            try { r._originalFeature.set('sourceTag', 'query') } catch (_) {}
            selectSource.addFeature(r._originalFeature)
          }
        })
      }
      analysisStore.setAnalysisStatus(`已高亮显示 ${queryResults.value.length} 个查询结果`)
    } catch (_) {
      analysisStore.setAnalysisStatus('高亮显示失败')
    }
  }

  const handleSelectFeature = (index: number) => {
    selectedFeatureIndex.value = index
    const feature = queryResults.value[index]
    if (feature) {
      highlightFeatureOnMap(feature)
      analysisStore.setAnalysisStatus(`已选择要素 ${index + 1}`)
      triggerMapFeatureHighlight(feature)
    }
  }

  const clearSelectedLayer = (layerId: string) => {
    if (!layerId) return
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    if (!layer || !layer.layer) return
    removeFeaturesByTagOrMatch('query', queryResults.value)
  }

  const invertSelectedLayer = (layerId: string) => {
    if (!layerId) return
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    if (!layer || !layer.layer) return
    const source = layer.layer.getSource(); if (!source) return
    const all = source.getFeatures()
    const selectSource = mapStore.selectLayer?.getSource(); if (!selectSource) return
    // 仅清除查询侧高亮，避免影响区域侧
    removeFeaturesByTagOrMatch('query')
    const currentSelected = queryResults.value.map((r: any) => r._originalFeature || r)
    const unselected: any[] = []
    all.forEach((f: any) => {
      const isSelected = currentSelected.some((sf: any) => {
        const sg = sf.getGeometry(); const fg = f.getGeometry()
        if (sg && fg) return JSON.stringify(sg.getCoordinates()) === JSON.stringify(fg.getCoordinates())
        return false
      })
      if (!isSelected) unselected.push(f)
    })
    unselected.forEach(f => {
      try { f.set('sourceTag', 'query') } catch (_) {}
      try { f.set('layerName', layer.name) } catch (_) {}
      selectSource.addFeature(f)
    })
    const inverted = unselected.map((f: any) => ({
      id: f.getId?.() || null,
      properties: f.getProperties ? f.getProperties() : {},
      geometry: f.getGeometry ? f.getGeometry() : null,
      layerName: layer.name,
      _originalFeature: f
    }))
    queryResults.value = inverted
    selectedFeatureIndex.value = -1
    
    // 自动选中第一个要素并触发高亮效果
    if (inverted.length > 0) {
      selectedFeatureIndex.value = 0
      const firstFeature = inverted[0]
      if (firstFeature) {
        highlightFeatureOnMap(firstFeature)
        triggerMapFeatureHighlight(firstFeature)
        analysisStore.setAnalysisStatus(`已自动选中反选后的第一个要素`)
      }
    }
  }

  // 清除：仅清查询侧选择、查询高亮与监听
  const clearQuerySelection = () => {
    // 清除地图上的查询高亮
    removeFeaturesByTagOrMatch('query', queryResults.value)
    
    // 清除选择存储中的查询要素（如果有的话）
    const selectionStore = useSelectionStore()
    const updatedFeatures = selectionStore.selectedFeatures.filter((feature: any) => {
      const sourceTag = feature.get?.('sourceTag') || feature.sourceTag || 
                       (feature.getProperties ? feature.getProperties().sourceTag : null)
      return sourceTag !== 'query'
    })
    selectionStore.setSelectedFeatures(updatedFeatures)
    
    // 如果当前选中的要素被移除，重置选中索引
    if (selectionStore.selectedFeatureIndex >= updatedFeatures.length) {
      selectionStore.setSelectedFeatureIndex(-1)
    }

    // 清除查询存储状态
    queryResults.value = []
    selectedFeatureIndex.value = -1
    highlightedFeature.value = null

    try {
      modeStateStore.saveToolState('query', {
        selectedLayerId: selectedLayerId.value,
        queryConfig: { condition: { ...queryConfig.condition } },
        queryResults: []
      })
    } catch (_) {}

    analysisStore.setAnalysisStatus('已清空查询结果')
  }

  const executeQuery = async () => {
    if (!selectedLayerId.value) {
      analysisStore.setAnalysisStatus('请选择查询图层')
      return { success: false, data: [], totalCount: 0, queryType: 'frontend' as const, error: '请选择查询图层' }
    }
    const condition = queryConfig.condition
    if (!validateQueryCondition(condition)) {
      return { success: false, data: [], totalCount: 0, queryType: 'frontend' as const, error: '查询条件不完整' }
    }
    const layer = mapStore.vectorLayers.find(l => l.id === selectedLayerId.value)
    if (!layer || !layer.layer) {
      analysisStore.setAnalysisStatus('图层不存在或不可用')
      return { success: false, data: [], totalCount: 0, queryType: 'frontend' as const, error: '图层不存在或不可用' }
    }
    isQuerying.value = true
    analysisStore.setAnalysisStatus('正在执行前端查询...')
    try {
      const results = await executeFrontendQuery(condition)
      const formatted = results.map((feature: any) => {
        const original = (feature as any)._originalFeature || feature
        if (original && typeof original.set === 'function') original.set('layerName', layer.name)
        return {
          id: original?.getId?.() || feature.id || null,
          properties: original?.getProperties?.() || feature.getProperties?.() || {},
          geometry: original?.getGeometry?.() || feature.getGeometry?.() || null,
          layerName: layer.name,
          _originalFeature: original
        }
      })
      await applyQuerySelection(formatted)
      const queryDesc = `${condition.fieldName} ${condition.operator} ${condition.value}`
      lastExecutedQuery.value = `前端查询: ${queryDesc}`
      analysisStore.setAnalysisStatus(`前端查询完成，找到 ${formatted.length} 个匹配要素`)
      return { success: true, data: formatted, totalCount: formatted.length, queryType: 'frontend' as const }
    } catch (e: any) {
      analysisStore.setAnalysisStatus('查询执行失败，请重试')
      return { success: false, data: [], totalCount: 0, queryType: 'frontend' as const, error: e?.message || '查询执行失败' }
    } finally {
      isQuerying.value = false
    }
  }

  return {
    // state
    selectedLayerId,
    queryResults,
    layerFields,
    queryConfig,
    isQuerying,
    lastExecutedQuery,
    selectedFeatureIndex,
    highlightedFeature,
    hasResults,
    selectedFeature,

    // getters/helpers
    getLayerOptions,
    getSelectedLayerName,
    getLayerFeatureCount,

    // actions
    getLayerFields,
    executeQuery,
    highlightQueryResults,
    handleSelectFeature,
    highlightFeatureOnMap,
    triggerMapFeatureHighlight,
    removeHighlightFeature,
    clearSelectedLayer,
    invertSelectedLayer,
    isSameFeature,
    applyQuerySelection,
    clearQuerySelection
  }
})

export default useFeatureQueryStore


