import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useModeStateStore } from '@/stores/modeStateStore'
import type { ComparisonOperator } from '@/types/query'

// 工具类型定义
export type ToolId = 'layer' | 'attribute-selection' | 'area-selection' | 'buffer' | 'distance' | 'overlay'

// 图层管理状态
interface LayerManagementState {
  selectedLayerId: string
  layerVisibility: Record<string, boolean>
  layerOpacity: Record<string, number>
  layerOrder: string[]
  [key: string]: any // 支持动态属性如 collapsed_${source}, visibility_${layerId} 等
}

// 属性选择状态
interface AttributeSelectionState {
  selectedLayerId: string
  queryKeyword: string
  queryResults: any[]
  selectedFeatureIndex: number
  highlightedFeature: any
  layerFields: any[]
  isQuerying: boolean
  queryConfig: {
    condition: {
      fieldName: string
      operator: ComparisonOperator
      value: string
    }
  }
}

// 区域选择状态
interface AreaSelectionState {
  selectedFeatures: any[]
  selectedFeatureIndex: number
  highlightedFeature: any
  selectionMode: 'rectangle' | 'polygon' | 'circle'
  isSelecting: boolean
}

// 缓冲区分析状态
interface BufferAnalysisState {
  selectedAnalysisLayerId: string
  bufferDistance: number
  bufferUnit: string
  radius: number
  semicircleLineSegment: number
  bufferResults: any[]
  currentResult: any
  isAnalyzing: boolean
  layerName: string
}

// 最短路径分析状态
interface DistanceAnalysisState {
  startPoint: any
  endPoint: any
  isSelectingStartPoint: boolean
  isSelectingEndPoint: boolean
  analysisResults: any[]
  currentResult: any
  isAnalyzing: boolean
  layerName: string
  obstacles: any[]
}

// 叠加分析状态
interface OverlayAnalysisState {
  selectedLayer1: string
  selectedLayer2: string
  selectedOperation: 'intersect' | 'union' | 'difference' | 'xor'
  overlayResult: any
  isAnalyzing: boolean
  layerName: string
}

// 完整状态接口
interface TraditionalToolsState {
  layer: LayerManagementState
  'attribute-selection': AttributeSelectionState
  'area-selection': AreaSelectionState
  buffer: BufferAnalysisState
  distance: DistanceAnalysisState
  overlay: OverlayAnalysisState
}

export const useTraditionalToolsStore = defineStore('traditionalTools', () => {
  const mapStore = useMapStore()
  const modeStateStore = useModeStateStore()

  // 统一的状态定义
  const toolStates = reactive<TraditionalToolsState>({
    // 图层管理状态
    layer: {
      selectedLayerId: '',
      layerVisibility: {},
      layerOpacity: {},
      layerOrder: []
    },

    // 属性选择状态
    'attribute-selection': {
      selectedLayerId: '',
      queryKeyword: '',
      queryResults: [],
      selectedFeatureIndex: -1,
      highlightedFeature: null,
      layerFields: [],
      isQuerying: false,
      queryConfig: {
        condition: {
          fieldName: '',
          operator: 'eq',
          value: ''
        }
      }
    },

    // 区域选择状态
    'area-selection': {
      selectedFeatures: [],
      selectedFeatureIndex: -1,
      highlightedFeature: null,
      selectionMode: 'rectangle',
      isSelecting: false
    },

    // 缓冲区分析状态
    buffer: {
      selectedAnalysisLayerId: '',
      bufferDistance: 100,
      bufferUnit: '米',
      radius: 100,
      semicircleLineSegment: 10,
      bufferResults: [],
      currentResult: null,
      isAnalyzing: false,
      layerName: ''
    },

    // 最短路径分析状态
    distance: {
      startPoint: null,
      endPoint: null,
      isSelectingStartPoint: false,
      isSelectingEndPoint: false,
      analysisResults: [],
      currentResult: null,
      isAnalyzing: false,
      layerName: '',
      obstacles: []
    },

    // 叠加分析状态
    overlay: {
      selectedLayer1: '',
      selectedLayer2: '',
      selectedOperation: 'intersect',
      overlayResult: null,
      isAnalyzing: false,
      layerName: ''
    }
  })

  // 计算属性
  const getLayerOptions = computed(() => {
    const visibleLayers = mapStore.vectorLayers.filter(layer => 
      layer.layer && layer.layer.getVisible() && layer.type === 'vector'
    )
    return visibleLayers.map(layer => ({ 
      value: layer.id, 
      label: layer.name, 
      disabled: false 
    }))
  })

  const getLayerOptionsWithNone = computed(() => {
    const visibleLayers = mapStore.vectorLayers.filter(layer => 
      layer.layer && layer.layer.getVisible() && layer.type === 'vector'
    )
    return [
      { value: '', label: '无', disabled: false },
      ...visibleLayers.map(layer => ({ 
        value: layer.id, 
        label: layer.name, 
        disabled: false 
      }))
    ]
  })

  // 状态管理方法
  const saveToolState = (toolId: ToolId, state: Partial<any>) => {
    if (toolStates[toolId]) {
      Object.assign(toolStates[toolId], state)
      // 同步到模式状态管理
      modeStateStore.saveToolState(toolId, toolStates[toolId])
    }
  }

  const restoreToolState = (toolId: ToolId) => {
    const savedState = modeStateStore.getToolState(toolId)
    if (savedState && toolStates[toolId]) {
      Object.assign(toolStates[toolId], savedState)
    }
  }

  const clearToolState = (toolId: ToolId) => {
    if (toolStates[toolId]) {
      // 重置为初始状态
      const initialState = getInitialState(toolId)
      Object.assign(toolStates[toolId], initialState)
      // 从模式状态管理中清除
      modeStateStore.clearToolState(toolId)
    }
  }

  const clearToolTemporaryData = (toolId: ToolId, keysToKeep: string[] = []) => {
    if (toolStates[toolId]) {
      const initialState = getInitialState(toolId)
      const newState: any = {}
      
      // 只保留指定的配置项
      keysToKeep.forEach(key => {
        if ((toolStates[toolId] as any)[key] !== undefined) {
          newState[key] = (toolStates[toolId] as any)[key]
        }
      })
      
      // 重置为初始状态，但保留指定项
      Object.assign(toolStates[toolId], initialState, newState)
      // 保存到模式状态管理
      modeStateStore.saveToolState(toolId, toolStates[toolId])
    }
  }

  // 获取初始状态
  const getInitialState = (toolId: ToolId): any => {
    const initialStateMap = {
      layer: {
        selectedLayerId: '',
        layerVisibility: {},
        layerOpacity: {},
        layerOrder: []
      },
      'attribute-selection': {
        selectedLayerId: '',
        queryKeyword: '',
        queryResults: [],
        selectedFeatureIndex: -1,
        highlightedFeature: null,
        layerFields: [],
        isQuerying: false,
        queryConfig: {
          condition: {
            fieldName: '',
            operator: 'eq',
            value: ''
          }
        }
      },
      'area-selection': {
        selectedFeatures: [],
        selectedFeatureIndex: -1,
        highlightedFeature: null,
        selectionMode: 'rectangle',
        isSelecting: false
      },
      buffer: {
        selectedAnalysisLayerId: '',
        bufferDistance: 100,
        bufferUnit: '米',
        radius: 100,
        semicircleLineSegment: 10,
        bufferResults: [],
        currentResult: null,
        isAnalyzing: false,
        layerName: ''
      },
      distance: {
        startPoint: null,
        endPoint: null,
        isSelectingStartPoint: false,
        isSelectingEndPoint: false,
        analysisResults: [],
        currentResult: null,
        isAnalyzing: false,
        layerName: '',
        obstacles: []
      },
      overlay: {
        selectedLayer1: '',
        selectedLayer2: '',
        selectedOperation: 'intersect',
        overlayResult: null,
        isAnalyzing: false,
        layerName: ''
      }
    }
    
    return initialStateMap[toolId] || {}
  }

  // 初始化所有工具状态
  const initializeAllStates = () => {
    const toolIds: ToolId[] = ['layer', 'attribute-selection', 'area-selection', 'buffer', 'distance', 'overlay']
    toolIds.forEach(toolId => {
      restoreToolState(toolId)
    })
  }

  // 清除所有工具状态
  const clearAllStates = () => {
    const toolIds: ToolId[] = ['layer', 'attribute-selection', 'area-selection', 'buffer', 'distance', 'overlay']
    toolIds.forEach(toolId => {
      clearToolState(toolId)
    })
  }

  // 获取图层信息
  const getLayerInfo = (layerId: string) => {
    const layer = mapStore.vectorLayers.find(l => l.id === layerId)
    if (!layer || !layer.layer) return null
    
    try {
      const source = layer.layer.getSource()
      const featureCount = source ? source.getFeatures().length : 0
      
      return {
        id: layer.id,
        name: layer.name,
        type: layer.type || '未知',
        featureCount,
        visible: layer.layer.getVisible()
      }
    } catch (_) {
      return null
    }
  }

  return {
    // 状态
    toolStates,
    
    // 计算属性
    getLayerOptions,
    getLayerOptionsWithNone,
    
    // 状态管理方法
    saveToolState,
    restoreToolState,
    clearToolState,
    clearToolTemporaryData,
    
    // 初始化方法
    initializeAllStates,
    clearAllStates,
    
    // 工具方法
    getLayerInfo
  }
})
