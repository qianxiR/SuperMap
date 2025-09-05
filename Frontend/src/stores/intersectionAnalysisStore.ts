import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

interface IntersectionResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetLayerName: string
  sourceMaskLayerName: string
  createdAt: string
}

interface IntersectionAnalysisState {
  targetLayerId: string
  maskLayerId: string
  results: IntersectionResultItem[]
  currentResult: IntersectionResultItem | null
  isAnalyzing: boolean
  targetFeaturesCache: any[]
  maskFeaturesCache: any[]
}

export const useIntersectionAnalysisStore = defineStore('intersectionAnalysis', () => {
  const state = reactive<IntersectionAnalysisState>({
    targetLayerId: '',
    maskLayerId: '',
    results: [],
    currentResult: null,
    isAnalyzing: false,
    targetFeaturesCache: [],
    maskFeaturesCache: []
  })

  const hasResults = computed(() => state.results.length > 0)

  const setTargetLayerId = (layerId: string) => {
    state.targetLayerId = layerId
  }

  const setMaskLayerId = (layerId: string) => {
    state.maskLayerId = layerId
  }

  const setTargetFeaturesCache = (features: any[]) => {
    state.targetFeaturesCache = features
  }

  const setMaskFeaturesCache = (features: any[]) => {
    state.maskFeaturesCache = features
  }

  const setResults = (items: IntersectionResultItem[]) => {
    state.results = items
    state.currentResult = items[0] || null
  }

  const setCurrentResult = (item: IntersectionResultItem | null) => {
    state.currentResult = item
  }

  const setIsAnalyzing = (value: boolean) => {
    state.isAnalyzing = value
  }

  const clearResults = () => {
    state.results = []
    state.currentResult = null
  }

  const clearAll = () => {
    state.targetLayerId = ''
    state.maskLayerId = ''
    state.results = []
    state.currentResult = null
    state.isAnalyzing = false
    state.targetFeaturesCache = []
    state.maskFeaturesCache = []
  }

  return {
    state,
    hasResults,
    setTargetLayerId,
    setMaskLayerId,
    setTargetFeaturesCache,
    setMaskFeaturesCache,
    setResults,
    setCurrentResult,
    setIsAnalyzing,
    clearResults,
    clearAll
  }
})


