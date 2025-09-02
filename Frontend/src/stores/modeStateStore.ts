import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 模式类型定义
type ModeType = 'llm' | 'traditional'

// LLM模式状态接口
interface LLMState {
  messages: Array<{
    id: number
    text: string
    sender: 'user' | 'system'
  }>
  inputText: string
  scrollPosition: number
  lastActiveTime: number
}

// 传统模式状态接口
interface TraditionalState {
  activeTool: string
  toolStates: {
    [toolId: string]: {
      selectedLayerId?: string
      queryKeyword?: string
      queryResults?: any[]
      bufferDistance?: number
      bufferUnit?: string
      distanceStart?: any
      distanceEnd?: any
      accessibilityCenter?: any
      accessibilityRadius?: number
      editMode?: string
      selectedFeatures?: any[]
      [key: string]: any
    }
  }
  lastActiveTime: number
}

// 完整模式状态接口
interface ModeState {
  llm: LLMState
  traditional: TraditionalState
  currentMode: ModeType
  lastSwitchTime: number
}

export const useModeStateStore = defineStore('modeState', () => {
  // 状态
  const modeState = ref<ModeState>({
    llm: {
      messages: [],
      inputText: '',
      scrollPosition: 0,
      lastActiveTime: Date.now()
    },
    traditional: {
      activeTool: 'layer',
      toolStates: {},
      lastActiveTime: Date.now()
    },
    currentMode: 'llm',
    lastSwitchTime: Date.now()
  })

  // 计算属性
  const currentMode = computed(() => modeState.value.currentMode)
  const llmState = computed(() => modeState.value.llm)
  const traditionalState = computed(() => modeState.value.traditional)

  // 保存LLM模式状态
  const saveLLMState = (state: Partial<LLMState>) => {
    modeState.value.llm = {
      ...modeState.value.llm,
      ...state,
      lastActiveTime: Date.now()
    }
    // 持久化到localStorage
    localStorage.setItem('llmModeState', JSON.stringify(modeState.value.llm))
  }

  // 保存传统模式状态
  const saveTraditionalState = (state: Partial<TraditionalState>) => {
    modeState.value.traditional = {
      ...modeState.value.traditional,
      ...state,
      lastActiveTime: Date.now()
    }
    // 持久化到localStorage
    localStorage.setItem('traditionalModeState', JSON.stringify(modeState.value.traditional))
  }

  // 获取LLM模式状态
  const getLLMState = (): LLMState => {
    return modeState.value.llm
  }

  // 获取传统模式状态
  const getTraditionalState = (): TraditionalState => {
    return modeState.value.traditional
  }

  // 保存工具状态
  const saveToolState = (toolId: string, state: any) => {
    if (!modeState.value.traditional.toolStates[toolId]) {
      modeState.value.traditional.toolStates[toolId] = {}
    }
    modeState.value.traditional.toolStates[toolId] = {
      ...modeState.value.traditional.toolStates[toolId],
      ...state
    }
    saveTraditionalState(modeState.value.traditional)
  }

  // 获取工具状态
  const getToolState = (toolId: string): any => {
    return modeState.value.traditional.toolStates[toolId] || {}
  }

  // 清理特定工具状态
  const clearToolState = (toolId: string) => {
    if (modeState.value.traditional.toolStates[toolId]) {
      delete modeState.value.traditional.toolStates[toolId]
      saveTraditionalState(modeState.value.traditional)
    }
  }

  // 清理工具状态中的临时数据（保留配置，清理结果）
  const clearToolTemporaryData = (toolId: string, keysToKeep: string[] = []) => {
    if (modeState.value.traditional.toolStates[toolId]) {
      const currentState = modeState.value.traditional.toolStates[toolId]
      const newState: any = {}
      
      // 只保留指定的配置项
      keysToKeep.forEach(key => {
        if (currentState[key] !== undefined) {
          newState[key] = currentState[key]
        }
      })
      
      modeState.value.traditional.toolStates[toolId] = newState
      saveTraditionalState(modeState.value.traditional)
    }
  }

  // 组件布局持久化（位置/尺寸/滚动等）
  const LAYOUT_KEY_PREFIX = '__layout__'

  const saveComponentLayout = (componentId: string, layout: Record<string, any>) => {
    const key = `${LAYOUT_KEY_PREFIX}:${componentId}`
    const current = modeState.value.traditional.toolStates[key] || {}
    modeState.value.traditional.toolStates[key] = { ...current, ...layout }
    saveTraditionalState(modeState.value.traditional)
  }

  const getComponentLayout = (componentId: string): Record<string, any> => {
    const key = `${LAYOUT_KEY_PREFIX}:${componentId}`
    return modeState.value.traditional.toolStates[key] || {}
  }

  // 切换模式
  const switchMode = (targetMode: ModeType) => {
    // 保存当前模式状态
    if (modeState.value.currentMode === 'llm') {
      saveLLMState(modeState.value.llm)
    } else {
      saveTraditionalState(modeState.value.traditional)
    }

    // 更新当前模式
    modeState.value.currentMode = targetMode
    modeState.value.lastSwitchTime = Date.now()

    // 持久化模式切换状态
    localStorage.setItem('currentMode', targetMode)
    localStorage.setItem('modeSwitchTime', modeState.value.lastSwitchTime.toString())
  }

  // 恢复模式状态
  const restoreModeState = (mode: ModeType) => {
    try {
      if (mode === 'llm') {
        const savedState = localStorage.getItem('llmModeState')
        if (savedState) {
          modeState.value.llm = JSON.parse(savedState)
        }
      } else {
        const savedState = localStorage.getItem('traditionalModeState')
        if (savedState) {
          modeState.value.traditional = JSON.parse(savedState)
        }
      }
    } catch (error) {
      console.warn('恢复模式状态失败:', error)
    }
  }

  // 初始化状态
  const initializeState = () => {
    try {
      // 恢复当前模式，如果没有保存过则默认为llm
      const savedMode = localStorage.getItem('currentMode') as ModeType
      if (savedMode && (savedMode === 'llm' || savedMode === 'traditional')) {
        modeState.value.currentMode = savedMode
      } else {
        // 默认设置为llm模式
        modeState.value.currentMode = 'llm'
        localStorage.setItem('currentMode', 'llm')
      }

      // 恢复模式切换时间
      const savedSwitchTime = localStorage.getItem('modeSwitchTime')
      if (savedSwitchTime) {
        modeState.value.lastSwitchTime = parseInt(savedSwitchTime)
      } else {
        modeState.value.lastSwitchTime = Date.now()
        localStorage.setItem('modeSwitchTime', modeState.value.lastSwitchTime.toString())
      }

      // 恢复各模式状态
      restoreModeState('llm')
      restoreModeState('traditional')
    } catch (error) {
      console.warn('初始化模式状态失败:', error)
      // 出错时重置为默认状态
      modeState.value.currentMode = 'llm'
      localStorage.setItem('currentMode', 'llm')
    }
  }

  // 清除所有状态
  const clearAllStates = () => {
    modeState.value = {
      llm: {
        messages: [],
        inputText: '',
        scrollPosition: 0,
        lastActiveTime: Date.now()
      },
      traditional: {
        activeTool: 'layer',
        toolStates: {},
        lastActiveTime: Date.now()
      },
      currentMode: 'llm',
      lastSwitchTime: Date.now()
    }
    
    // 清除localStorage
    localStorage.removeItem('llmModeState')
    localStorage.removeItem('traditionalModeState')
    localStorage.removeItem('currentMode')
    localStorage.removeItem('modeSwitchTime')
  }

  // 初始化
  initializeState()

  return {
    // State
    modeState,
    currentMode,
    llmState,
    traditionalState,

    // Actions
    saveLLMState,
    saveTraditionalState,
    getLLMState,
    getTraditionalState,
    saveToolState,
    getToolState,
    clearToolState,
    clearToolTemporaryData,
    saveComponentLayout,
    getComponentLayout,
    switchMode,
    restoreModeState,
    clearAllStates,
    initializeState
  }
})
