/**
 * 最短路径分析状态管理
 */
import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

// 最短路径分析结果接口
interface ShortestPathResult {
  id: string
  name: string
  geometry: any
  distance: number
  duration: number
  pathType: string
  sourceLayerName: string
  createdAt: string
}

// 分析选项接口
interface ShortestPathOptions {
  units: 'kilometers' | 'miles' | 'meters'
  resolution: number
  obstacleLayerId?: string
  costField?: string
}

// 状态接口
interface ShortestPathAnalysisState {
  // 分析点
  startPoint: any
  endPoint: any
  
  // 分析选项
  analysisOptions: ShortestPathOptions
  
  // 分析结果
  analysisResults: ShortestPathResult[]
  currentResult: ShortestPathResult | null
  
  // 分析状态
  isAnalyzing: boolean
  isSelectingStartPoint: boolean
  isSelectingEndPoint: boolean
  
  // 图层名称
  layerName: string
  taskId: string
}

export const useShortestPathAnalysisStore = defineStore('shortestPathAnalysis', () => {
  // 状态定义
  const state = reactive<ShortestPathAnalysisState>({
    startPoint: null,
    endPoint: null,
    analysisOptions: {
      units: 'kilometers',
      resolution: 10000
    },
    analysisResults: [],
    currentResult: null,
    isAnalyzing: false,
    isSelectingStartPoint: false,
    isSelectingEndPoint: false,
    layerName: '',
    taskId: ''
  })

  // 计算属性
  const hasResults = computed(() => state.analysisResults.length > 0)
  const canAnalyze = computed(() => !!(state.startPoint && state.endPoint))
  const hasStartPoint = computed(() => !!state.startPoint)
  const hasEndPoint = computed(() => !!state.endPoint)

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
    state.currentResult = results.length > 0 ? results[0] : null
  }

  const setCurrentResult = (result: ShortestPathResult | null) => {
    state.currentResult = result
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

  const setTaskId = (taskId: string) => {
    state.taskId = taskId
  }

  const clearResults = () => {
    state.analysisResults = []
    state.currentResult = null
  }

  const clearPoints = () => {
    state.startPoint = null
    state.endPoint = null
  }

  const clearAll = () => {
    state.startPoint = null
    state.endPoint = null
    state.analysisResults = []
    state.currentResult = null
    state.isAnalyzing = false
    state.isSelectingStartPoint = false
    state.isSelectingEndPoint = false
    state.layerName = ''
    // 重置为默认设置
    state.analysisOptions = {
      units: 'kilometers',
      resolution: 10000
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
    
    // Actions
    setStartPoint,
    setEndPoint,
    updateAnalysisOptions,
    setAnalysisResults,
    setCurrentResult,
    setIsAnalyzing,
    setIsSelectingStartPoint,
    setIsSelectingEndPoint,
    setLayerName,
    setTaskId,
    clearResults,
    clearPoints,
    clearAll
  }
})
