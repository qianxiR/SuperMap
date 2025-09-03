import { defineStore } from 'pinia'
import { reactive } from 'vue'

interface ShortestPathPanelState {
  layerName: string
  lastResultCount: number
  displayedOnMap: boolean
}

export const useShortestPathStore = defineStore('shortestPath', () => {
  const state = reactive<ShortestPathPanelState>({
    layerName: '',
    lastResultCount: 0,
    displayedOnMap: false
  })

  const setLayerName = (name: string) => {
    state.layerName = name
  }

  const setResultSummary = (count: number, displayed: boolean) => {
    state.lastResultCount = count
    state.displayedOnMap = displayed
  }

  const saveToLocalStorage = () => {
    try {
      const data = {
        layerName: state.layerName,
        lastResultCount: state.lastResultCount,
        displayedOnMap: state.displayedOnMap
      }
      localStorage.setItem('shortestPathPanelState', JSON.stringify(data))
    } catch (_) {}
  }

  const loadFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem('shortestPathPanelState')
      if (!raw) return
      const data = JSON.parse(raw)
      if (typeof data.layerName === 'string') state.layerName = data.layerName
      if (typeof data.lastResultCount === 'number') state.lastResultCount = data.lastResultCount
      if (typeof data.displayedOnMap === 'boolean') state.displayedOnMap = data.displayedOnMap
    } catch (_) {}
  }

  const clearLocalStorage = () => {
    try { localStorage.removeItem('shortestPathPanelState') } catch (_) {}
  }

  // 初始化加载
  loadFromLocalStorage()

  return {
    state,
    setLayerName,
    setResultSummary,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  }
})

export default useShortestPathStore


