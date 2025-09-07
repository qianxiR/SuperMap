import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

interface EraseResultItem {
  id: string
  name: string
  geometry: any
  sourceTargetlayerName: string
  sourceEraselayerName: string
  createdAt: string
}

interface EraseAnalysisState {
  targetlayerId: string
  eraselayerId: string
  results: EraseResultItem[]
  currentResult: EraseResultItem | null
  isAnalyzing: boolean
  targetFeaturesCache: any[]
  eraseFeaturesCache: any[]
}

export const useEraseAnalysisStore = defineStore('eraseAnalysis', () => {
  const state = reactive<EraseAnalysisState>({
    targetlayerId: '',
    eraselayerId: '',
    results: [],
    currentResult: null,
    isAnalyzing: false,
    targetFeaturesCache: [],
    eraseFeaturesCache: []
  })

  const hasResults = computed(() => state.results.length > 0)

  const setTargetlayerId = (layerId: string) => {
    state.targetlayerId = layerId
  }

  const setEraselayerId = (layerId: string) => {
    state.eraselayerId = layerId
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
    state.targetlayerId = ''
    state.eraselayerId = ''
    state.results = []
    state.currentResult = null
    state.isAnalyzing = false
    state.targetFeaturesCache = []
    state.eraseFeaturesCache = []
  }

  return {
    state,
    hasResults,
    setTargetlayerId,
    setEraselayerId,
    setTargetFeaturesCache,
    setEraseFeaturesCache,
    setResults,
    setCurrentResult,
    setIsAnalyzing,
    clearResults,
    clearAll
  }
})
