import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'

// 缓冲区分析结果类型
interface BufferResult {
  id: string
  name: string
  geometry: any
  distance: number
  unit: string
  sourceLayerName: string
  createdAt: string
}

// 缓冲区参数类型
interface BufferSettings {
  radius: number
  semicircleLineSegment: number
}

// 缓冲区分析状态接口
interface BufferAnalysisState {
  selectedAnalysisLayerId: string
  bufferSettings: BufferSettings
  bufferResults: BufferResult[]
  currentResult: BufferResult | null
  isAnalyzing: boolean
  layerName: string
}

export const useBufferAnalysisStore = defineStore('bufferAnalysis', () => {
  // 状态定义
  const state = reactive<BufferAnalysisState>({
    selectedAnalysisLayerId: '',
    bufferSettings: {
      radius: 100,
      semicircleLineSegment: 10
    },
    bufferResults: [],
    currentResult: null,
    isAnalyzing: false,
    layerName: ''
  })

  // 计算属性
  const hasResults = computed(() => state.bufferResults.length > 0)
  const hasSelectedLayer = computed(() => !!state.selectedAnalysisLayerId)

  // Actions
  const setSelectedAnalysisLayer = (layerId: string) => {
    state.selectedAnalysisLayerId = layerId
  }

  const updateBufferSettings = (settings: Partial<BufferSettings>) => {
    Object.assign(state.bufferSettings, settings)
  }

  const setBufferResults = (results: BufferResult[]) => {
    state.bufferResults = results
    state.currentResult = results.length > 0 ? results[0] : null
  }

  const setCurrentResult = (result: BufferResult | null) => {
    state.currentResult = result
  }

  const setIsAnalyzing = (analyzing: boolean) => {
    state.isAnalyzing = analyzing
  }

  const setLayerName = (name: string) => {
    state.layerName = name
  }

  const clearResults = () => {
    state.bufferResults = []
    state.currentResult = null
  }

  const clearAll = () => {
    state.selectedAnalysisLayerId = ''
    state.bufferResults = []
    state.currentResult = null
    state.isAnalyzing = false
    state.layerName = ''
    // 重置为默认设置
    state.bufferSettings = {
      radius: 100,
      semicircleLineSegment: 10
    }
  }

  // 状态持久化
  const saveToLocalStorage = () => {
    try {
      const dataToSave = {
        selectedAnalysisLayerId: state.selectedAnalysisLayerId,
        bufferSettings: { ...state.bufferSettings },
        layerName: state.layerName
      }
      localStorage.setItem('bufferAnalysisState', JSON.stringify(dataToSave))
    } catch (error) {
      console.warn('保存缓冲区分析状态失败:', error)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem('bufferAnalysisState')
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        if (parsedData.selectedAnalysisLayerId) {
          state.selectedAnalysisLayerId = parsedData.selectedAnalysisLayerId
        }
        if (parsedData.bufferSettings) {
          Object.assign(state.bufferSettings, parsedData.bufferSettings)
        }
        if (parsedData.layerName) {
          state.layerName = parsedData.layerName
        }
      }
    } catch (error) {
      console.warn('加载缓冲区分析状态失败:', error)
    }
  }

  const clearLocalStorage = () => {
    try {
      localStorage.removeItem('bufferAnalysisState')
    } catch (error) {
      console.warn('清除缓冲区分析状态失败:', error)
    }
  }

  // 初始化时加载状态
  loadFromLocalStorage()

  return {
    // State
    state,
    
    // Computed
    hasResults,
    hasSelectedLayer,
    
    // Actions
    setSelectedAnalysisLayer,
    updateBufferSettings,
    setBufferResults,
    setCurrentResult,
    setIsAnalyzing,
    setLayerName,
    clearResults,
    clearAll,
    
    // 持久化方法
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  }
})
