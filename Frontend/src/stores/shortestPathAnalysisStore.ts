/**
 * 最短路径分析状态管理
 */
import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

// 点信息接口
interface PointInfo {
  name: string
  coordinates: string
  geometry: any
}

// 最短路径分析结果接口
interface ShortestPathResult {
  id: string
  name: string
  geometry: any
  distance: number
  duration: number
  pathType: string
  sourcelayerName: string
  createdAt: string
}

// 分析选项接口
interface ShortestPathOptions {
  obstacles?: any
  units: 'degrees' | 'radians' | 'miles' | 'kilometers'
  resolution: number
}

// 分析及绘制图层引用接口
interface AnalysisLayers {
  startPointlayer: any
  endPointlayer: any
  pathlayer: any
  obstacleslayer: any
}

// 状态接口
interface ShortestPathAnalysisState {
  // 核心状态
  analysisResults: ShortestPathResult[]
  layerName: string
  lastFeatureCollection: any | null  // 添加临时保存的分析结果
  
  // 地图交互状态
  isSelectingStartPoint: boolean
  isSelectingEndPoint: boolean
  startPoint: any
  endPoint: any
  
  // 分析配置选项
  analysisOptions: ShortestPathOptions
  
  // 分析及绘制图层引用
  analysislayers: AnalysisLayers
  
  // 分析状态
  isAnalyzing: boolean
}

export const useShortestPathAnalysisStore = defineStore('shortestPathAnalysis', () => {
  // 状态定义
  const state = reactive<ShortestPathAnalysisState>({
    // 核心状态
    analysisResults: [],
    layerName: '',
    lastFeatureCollection: null,
    
    // 地图交互状态
    isSelectingStartPoint: false,
    isSelectingEndPoint: false,
    startPoint: null,
    endPoint: null,
    
    // 分析配置选项
    analysisOptions: {
      obstacles: null,
      units: 'kilometers',
      resolution: 1000
    },
    
    // 分析及绘制图层引用
    analysislayers: {
      startPointlayer: null,
      endPointlayer: null,
      pathlayer: null,
      obstacleslayer: null
    },
    
    // 分析状态
    isAnalyzing: false
  })

  // 计算属性
  const hasResults = computed(() => state.analysisResults.length > 0)
  const canAnalyze = computed(() => !!(state.startPoint && state.endPoint))
  const hasStartPoint = computed(() => !!state.startPoint)
  const hasEndPoint = computed(() => !!state.endPoint)
  const currentResult = computed(() => state.analysisResults[0] || null)
  
  const startPointInfo = computed<PointInfo | null>(() => {
    if (!state.startPoint) return null
    
    const geometry = state.startPoint.getGeometry()
    const coords = geometry?.getCoordinates()
    
    return {
      name: '起始点',
      coordinates: coords ? `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` : '未知坐标',
      geometry: geometry
    }
  })
  
  const endPointInfo = computed<PointInfo | null>(() => {
    if (!state.endPoint) return null
    
    const geometry = state.endPoint.getGeometry()
    const coords = geometry?.getCoordinates()
    
    return {
      name: '目标点',
      coordinates: coords ? `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}` : '未知坐标',
      geometry: geometry
    }
  })

  // Actions
  const setStartPoint = (point: any) => {
    state.startPoint = point
  }

  const setEndPoint = (point: any) => {
    state.endPoint = point
  }

  const updateAnalysisOptions = (options: Partial<ShortestPathOptions>) => {
    Object.assign(state.analysisOptions, options)
  }

  const setAnalysisResults = (results: ShortestPathResult[]) => {
    state.analysisResults = results
  }

  const setIsAnalyzing = (analyzing: boolean) => {
    state.isAnalyzing = analyzing
  }

  const setIsSelectingStartPoint = (selecting: boolean) => {
    state.isSelectingStartPoint = selecting
  }

  const setIsSelectingEndPoint = (selecting: boolean) => {
    state.isSelectingEndPoint = selecting
  }

  const setLayerName = (name: string) => {
    state.layerName = name
  }

  const setLastFeatureCollection = (featureCollection: any) => {
    state.lastFeatureCollection = featureCollection
  }

  const setAnalysisLayers = (layers: Partial<AnalysisLayers>) => {
    Object.assign(state.analysislayers, layers)
  }

  const clearResults = () => {
    state.analysisResults = []
  }

  const clearPoints = () => {
    state.startPoint = null
    state.endPoint = null
  }

  const clearAll = () => {
    state.startPoint = null
    state.endPoint = null
    state.analysisResults = []
    state.isAnalyzing = false
    state.isSelectingStartPoint = false
    state.isSelectingEndPoint = false
    state.layerName = ''
    state.lastFeatureCollection = null
    // 重置为默认设置
    state.analysisOptions = {
      obstacles: null,
      units: 'kilometers',
      resolution: 1000
    }
    // 重置图层引用
    state.analysislayers = {
      startPointlayer: null,
      endPointlayer: null,
      pathlayer: null,
      obstacleslayer: null
    }
  }

  return {
    // State
    state,
    
    // Computed
    hasResults,
    canAnalyze,
    hasStartPoint,
    hasEndPoint,
    currentResult,
    startPointInfo,
    endPointInfo,
    
    // Actions
    setStartPoint,
    setEndPoint,
    updateAnalysisOptions,
    setAnalysisResults,
    setIsAnalyzing,
    setIsSelectingStartPoint,
    setIsSelectingEndPoint,
    setLayerName,
    setLastFeatureCollection,
    setAnalysisLayers,
    clearResults,
    clearPoints,
    clearAll
  }
})
