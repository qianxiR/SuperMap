import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { usePopupStore } from '@/stores/popupStore'
import { uselayermanager } from '@/composables/uselayermanager'

// 生命周期配置常量
const LIFECYCLE_CONFIG = {
  DRAW_MODES: ['point', 'line', 'polygon'],
  CURSOR_STYLES: {
    DRAWING: 'crosshair',
    DEFAULT: 'default'
  }
} as const;

/**
 * 地图生命周期管理 Composable
 * 
 * 功能：管理地图组件的生命周期，包括事件监听、资源清理、状态监听等
 * 职责：Vue组件生命周期钩子、事件绑定/解绑、内存管理等
 * 
 * @returns {Object} 生命周期管理相关的方法和状态
 */
export function useMapLifecycle() {
  const mapStore = useMapStore()
  const analysisStore = useAnalysisStore()
  const popupStore = usePopupStore()
  const layermanager = uselayermanager()
  
  const mapContainer = ref<HTMLElement | null>(null)
  const disposers: Array<() => void> = [] // 清理函数数组
  
  // 事件处理器引用
  let drawCompleteHandler: ((e: Event) => void) | null = null
  let removeLayerHandler: ((e: Event) => void) | null = null

  /**
   * 设置鼠标离开地图容器时的坐标清理
   * 当鼠标离开地图区域时清空坐标显示
   * 
   * @param {HTMLElement} containerEl - 地图容器元素
   * @returns {Function} 清理函数
   */
  const setupMouseLeaveHandler = (containerEl: HTMLElement): (() => void) => {
    const handleMouseLeave = () => {
      try { 
        mapStore.clearCoordinate() 
      } catch (_) {
        // 静默处理错误
      }
    }
    
    if (containerEl) {
      containerEl.addEventListener('mouseleave', handleMouseLeave)
      containerEl.addEventListener('mouseout', (e) => {
        const related = (e as MouseEvent).relatedTarget as Node | null
        if (!related || (containerEl && !containerEl.contains(related))) {
          handleMouseLeave()
        }
      })
    }
    
    return () => {
      if (containerEl) {
        try { 
          containerEl.removeEventListener('mouseleave', handleMouseLeave) 
        } catch (_) {
          // 静默处理错误
        }
      }
    }
  }

  /**
   * 设置绘制模式的鼠标样式监听
   * 根据绘制模式自动切换鼠标样式
   */
  const setupDrawModeWatcher = () => {
    const unwatchDrawMode = watch(() => analysisStore.drawMode, (newMode) => {
      if (!mapStore.map) return;
      const targetElement = mapStore.map.getTargetElement();
      if (LIFECYCLE_CONFIG.DRAW_MODES.includes(newMode as any)) {
        targetElement.style.cursor = LIFECYCLE_CONFIG.CURSOR_STYLES.DRAWING;
      } else {
        targetElement.style.cursor = LIFECYCLE_CONFIG.CURSOR_STYLES.DEFAULT;
      }
    });
    
    disposers.push(unwatchDrawMode)
  }

  /**
   * 设置工具面板状态监听
   * 根据激活的工具自动处理相关状态
   */
  const setupToolPanelWatcher = () => {
    const unwatchToolPanel = watch(() => analysisStore.toolPanel?.activeTool, (newTool) => {
      if (newTool === 'area-selection') {
        popupStore.hidePopup();
      }
    });
    
    disposers.push(unwatchToolPanel)
  }

  /**
   * 设置全局事件监听器
   * 监听绘制完成和图层移除事件
   */
  const setupGlobalEventListeners = () => {
    // 绘制完成事件处理器
    drawCompleteHandler = (e: Event) => {
      layermanager.acceptDrawlayer((e as CustomEvent).detail)
    }
    
    // 图层移除事件处理器
    removeLayerHandler = (e: Event) => {
      const { layer } = (e as CustomEvent).detail
      if (layer && mapStore.map) {
        try {
          mapStore.map.removeLayer(layer)
        } catch (error) {
          // 静默处理错误
        }
      }
    }
    
    // 绑定事件监听器
    window.addEventListener('drawlayerCompleted', drawCompleteHandler)
    window.addEventListener('removelayerRequested', removeLayerHandler)
    
    // 添加清理函数
    disposers.push(() => {
      if (drawCompleteHandler) {
        window.removeEventListener('drawlayerCompleted', drawCompleteHandler)
      }
      if (removeLayerHandler) {
        window.removeEventListener('removelayerRequested', removeLayerHandler)
      }
    })
  }

  /**
   * 初始化生命周期管理
   * 设置所有的监听器和清理函数
   */
  const initializeLifecycle = () => {
    // 设置鼠标离开处理器
    if (mapContainer.value) {
      const mouseLeaveCleanup = setupMouseLeaveHandler(mapContainer.value)
      disposers.push(mouseLeaveCleanup)
    }
    
    // 设置状态监听器
    setupDrawModeWatcher()
    setupToolPanelWatcher()
    
    // 设置全局事件监听器
    setupGlobalEventListeners()
  }

  /**
   * 清理所有资源
   * 清理定时器、事件监听器、状态监听器等
   */
  const cleanup = (): void => {
    // 清理所有注册的清理函数
    while (disposers.length) {
      const dispose = disposers.pop()
      try { 
        dispose && dispose() 
      } catch (_) {
        // 静默处理清理错误
      }
    }
  }

  /**
   * Vue组件挂载时的初始化
   */
  const handleMounted = () => {
    initializeLifecycle()
  }

  /**
   * Vue组件卸载时的清理
   */
  const handleUnmounted = () => {
    cleanup()
  }


  return {
    mapContainer,
    cleanup,
    initializeLifecycle,
    setupMouseLeaveHandler,
    setupDrawModeWatcher,
    setupToolPanelWatcher,
    setupGlobalEventListeners
  }
}
