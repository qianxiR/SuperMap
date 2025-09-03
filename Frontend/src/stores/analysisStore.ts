import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToolId = 'draw' | 'buffer' | 'distance' | 'overlay' | 'layer' | 'area-selection' | 'llm' | 'attribute-selection' | '';

export const useAnalysisStore = defineStore('analysis', () => {
  // 分析状态
  const analysisStatus = ref<string>('')
  
  // 通用功能面板（工具面板）状态
  const toolPanel = {
    visible: ref<boolean>(false),
    title: ref<string>(''),
    activeTool: ref<ToolId>('')
  }
  
  // 绘制工具状态
  const drawMode = ref<string>('') // 'point', 'line', 'polygon'
  const selectionMode = ref<string>('') // 
  const currentLayer = ref<any>(null)
  
  // 距离量测模式状态
  const isDistanceMeasureMode = ref<boolean>(false)
  
  // 面积量测模式状态
  const isAreaMeasureMode = ref<boolean>(false)
  
  // Actions
  function setAnalysisStatus(status: string) {
    analysisStatus.value = status
  }

  // 工具面板控制
  function openTool(toolId: ToolId, title: string = '') {
    toolPanel.activeTool.value = toolId
    toolPanel.title.value = title
    toolPanel.visible.value = true
  }

  function closeTool() {
    toolPanel.visible.value = false
    toolPanel.title.value = ''
    toolPanel.activeTool.value = ''
    drawMode.value = ''
  }

  // 设置当前工具（用于状态同步）
  function setActiveTool(toolId: ToolId) {
    toolPanel.activeTool.value = toolId
  }
  
  // 工具切换时的状态清理
  function clearToolState(toolId: ToolId) {
    // 根据工具类型清理相应的状态
    switch (toolId) {
      case 'layer':
        // 图层管理：清理图层选择状态
        break
      case 'attribute-selection':
        // 按属性选择要素：清理查询结果和选择状态
        break
      case 'area-selection':
        // 按区域选择要素：清理区域选择和编辑状态
        break
      case 'buffer':
        // 缓冲区分析：清理分析结果和地图显示
        break
      case 'distance':
        // 最短路径分析：清理路径和地图显示
        break
      case 'overlay':
        // 叠加分析：清理分析结果
        break
      case 'llm':
        // LLM模式：清理AI对话状态
        break
      case 'draw':
        // 绘制工具：清理绘制状态
        break
      default:
        break
    }
  }
  
  // 工具切换时的状态清理（带前一个工具ID）
  function switchTool(newToolId: ToolId, prevToolId?: ToolId) {
    // 如果是从某个工具切换，先清理该工具的状态
    if (prevToolId && prevToolId !== newToolId) {
      clearToolState(prevToolId)
    }
    
    // 设置新工具
    setActiveTool(newToolId)
  }
  
  // 绘制工具控制
  function setDrawMode(mode: string) {
    drawMode.value = mode
  }
  
  function setSelectionMode(mode: string) {
    selectionMode.value = mode
  }

  function setCurrentLayer(layer: any) {
    currentLayer.value = layer
  }
  
  // 距离量测模式控制
  function setDistanceMeasureMode(mode: boolean) {
    isDistanceMeasureMode.value = mode
  }
  
  // 面积量测模式控制
  function setAreaMeasureMode(mode: boolean) {
    isAreaMeasureMode.value = mode
  }
  
  return {
    // State
    analysisStatus,
    toolPanel,
    drawMode,
    selectionMode,
    currentLayer,
    isDistanceMeasureMode,
    isAreaMeasureMode,
    
    // Actions
    setAnalysisStatus,
    openTool,
    closeTool,
    setActiveTool,
    clearToolState,
    switchTool,
    setDrawMode,
    setSelectionMode,
    setCurrentLayer,
    setDistanceMeasureMode,
    setAreaMeasureMode
  }
})
