import { defineStore } from 'pinia'
import { ref } from 'vue'

const useInteractionStore = defineStore('interaction', () => {
  // 悬停要素
  const hoveredFeature = ref<any>(null)
  
  // 绘制状态
  const isDrawing = ref<boolean>(false)
  const drawMode = ref<string>('')
  
  // 工具状态
  const activeTool = ref<string>('')
  
  // 交互状态
  const isInteracting = ref<boolean>(false)
  
  // Actions
  function setHoveredFeature(feature: any) {
    hoveredFeature.value = feature
  }
  
  function setDrawingState(drawing: boolean, mode: string = '') {
    isDrawing.value = drawing
    drawMode.value = mode
  }
  
  function setActiveTool(tool: string) {
    activeTool.value = tool
  }
  
  function setInteractingState(interacting: boolean) {
    isInteracting.value = interacting
  }
  
  function clearHover() {
    hoveredFeature.value = null
  }
  
  function clearDrawing() {
    isDrawing.value = false
    drawMode.value = ''
  }
  
  function clearTool() {
    activeTool.value = ''
  }
  
  function clearAll() {
    hoveredFeature.value = null
    isDrawing.value = false
    drawMode.value = ''
    activeTool.value = ''
    isInteracting.value = false
  }
  
  return {
    // 状态
    hoveredFeature,
    isDrawing,
    drawMode,
    activeTool,
    isInteracting,
    
    // Actions
    setHoveredFeature,
    setDrawingState,
    setActiveTool,
    setInteractingState,
    clearHover,
    clearDrawing,
    clearTool,
    clearAll
  }
})

export { useInteractionStore }
export default useInteractionStore
