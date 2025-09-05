import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

interface EraseResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetLayerName: string
  sourceEraseLayerName: string
  createdAt: string
}

interface EraseAnalysisState {
  targetLayerId: string
  eraseLayerId: string
  results: EraseResultItem[]
  currentResult: EraseResultItem | null
  isAnalyzing: boolean
  targetFeaturesCache: any[]
  eraseFeaturesCache: any[]
}

export const useEraseAnalysisStore = defineStore('eraseAnalysis', () => {
  const state = reactive<EraseAnalysisState>({
    targetLayerId: '',
    eraseLayerId: '',
    results: [],
    currentResult: null,
    isAnalyzing: false,
    targetFeaturesCache: [],
    eraseFeaturesCache: []
  })

  const hasResults = computed(() => state.results.length > 0)

  const setTargetLayerId = (layerId: string) => {
    state.targetLayerId = layerId
  }

  const setEraseLayerId = (layerId: string) => {
    state.eraseLayerId = layerId
  }

  const setTargetFeaturesCache = (features: any[]) => {
    state.targetFeaturesCache = features
  }

  const setEraseFeaturesCache = (features: any[]) => {
    state.eraseFeaturesCache = features
  }

  const setResults = (items: EraseResultItem[]) => {
    state.results = items
    state.currentResult = items[0] || null
  }

  const setCurrentResult = (item: EraseResultItem | null) => {
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
    state.eraseLayerId = ''
    state.results = []
    state.currentResult = null
    state.isAnalyzing = false
    state.targetFeaturesCache = []
    state.eraseFeaturesCache = []
  }

  return {
    state,
    hasResults,
    setTargetLayerId,
    setEraseLayerId,
    setTargetFeaturesCache,
    setEraseFeaturesCache,
    setResults,
    setCurrentResult,
    setIsAnalyzing,
    clearResults,
    clearAll
  }
})
