import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

interface IntersectionResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetlayerName: string
  sourceMasklayerName: string
  createdAt: string
}

interface IntersectionAnalysisState {
  targetlayerId: string
  masklayerId: string
  results: IntersectionResultItem[]
  currentResult: IntersectionResultItem | null
  isAnalyzing: boolean
  targetFeaturesCache: any[]
  maskFeaturesCache: any[]
}

export const useIntersectionAnalysisStore = defineStore('intersectionAnalysis', () => {
  const state = reactive<IntersectionAnalysisState>({
    targetlayerId: '',
    masklayerId: '',
    results: [],
    currentResult: null,
    isAnalyzing: false,
    targetFeaturesCache: [],
    maskFeaturesCache: []
  })

  const hasResults = computed(() => state.results.length > 0)

  const setTargetlayerId = (layerId: string) => {
    state.targetlayerId = layerId
  }

  const setMasklayerId = (layerId: string) => {
    state.masklayerId = layerId
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
    state.targetlayerId = ''
    state.masklayerId = ''
    state.results = []
    state.currentResult = null
    state.isAnalyzing = false
    state.targetFeaturesCache = []
    state.maskFeaturesCache = []
  }

  return {
    state,
    hasResults,
    setTargetlayerId,
    setMasklayerId,
    setTargetFeaturesCache,
    setMaskFeaturesCache,
    setResults,
    setCurrentResult,
    setIsAnalyzing,
    clearResults,
    clearAll
  }
})


