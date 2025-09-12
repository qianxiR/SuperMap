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
  lastFeatureCollection: any | null  // 添加临时保存的分析结果
}

export const useEraseAnalysisStore = defineStore('eraseAnalysis', () => {
  const state = reactive<EraseAnalysisState>({
    targetlayerId: '',
    eraselayerId: '',
    results: [],
    currentResult: null,
    isAnalyzing: false,
    targetFeaturesCache: [],
    eraseFeaturesCache: [],
    lastFeatureCollection: null
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

  const setLastFeatureCollection = (featureCollection: any) => {
    state.lastFeatureCollection = featureCollection
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
    state.lastFeatureCollection = null
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
    setLastFeatureCollection,
    clearResults,
    clearAll
  }
})
