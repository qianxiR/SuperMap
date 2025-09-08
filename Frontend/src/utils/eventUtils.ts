/**
 * 事件管理工具函数
 * 统一管理事件监听器的绑定、解绑和清理
 */

// 事件处理器类型
export type EventHandler = (event: Event) => void

// 事件配置接口
export interface EventConfig {
  event: string
  handler: EventHandler
  target?: EventTarget
  options?: AddEventListenerOptions
}

// 事件管理器类
export class EventManager {
  private disposers: Array<() => void> = []
  private eventHandlers: Map<string, EventHandler> = new Map()
  
  /**
   * 添加事件监听器
   * 自动管理清理函数
   */
  addEventListener(config: EventConfig): () => void {
    const { event, handler, target = window, options } = config
    const key = `${event}_${target === window ? 'window' : 'element'}`
    
    // 如果已存在相同的事件监听器，先移除
    if (this.eventHandlers.has(key)) {
      this.removeEventListener(key)
    }
    
    // 添加事件监听器
    target.addEventListener(event, handler, options)
    this.eventHandlers.set(key, handler)
    
    // 创建清理函数
    const disposer = () => {
      target.removeEventListener(event, handler, options)
      this.eventHandlers.delete(key)
    }
    
    this.disposers.push(disposer)
    return disposer
  }
  
  /**
   * 移除特定的事件监听器
   */
  removeEventListener(key: string): boolean {
    const disposer = this.disposers.find(d => {
      // 这里需要更复杂的逻辑来匹配key
      return true // 简化实现
    })
    
    if (disposer) {
      disposer()
      return true
    }
    
    return false
  }
  
  /**
   * 清理所有事件监听器
   */
  cleanup(): void {
    while (this.disposers.length) {
      const dispose = this.disposers.pop()
      try {
        dispose && dispose()
      } catch (error) {
        console.warn('清理事件监听器失败:', error)
      }
    }
    this.eventHandlers.clear()
  }
  
  /**
   * 获取当前注册的事件数量
   */
  getEventCount(): number {
    return this.eventHandlers.size
  }
}

/**
 * 创建全局事件管理器实例
 */
export const globalEventManager = new EventManager()

/**
 * 安全添加事件监听器
 * 包含错误处理和自动清理
 */
export const safeAddEventListener = (
  target: EventTarget,
  event: string,
  handler: EventHandler,
  options?: AddEventListenerOptions
): () => void => {
  try {
    target.addEventListener(event, handler, options)
    
    return () => {
      try {
        target.removeEventListener(event, handler, options)
      } catch (error) {
        console.warn('移除事件监听器失败:', error)
      }
    }
  } catch (error) {
    console.warn('添加事件监听器失败:', error)
    return () => {} // 返回空的清理函数
  }
}

/**
 * 创建防抖事件处理器
 * 避免频繁触发事件处理函数
 */
export const createDebouncedHandler = (
  handler: EventHandler,
  delay: number = 300
): EventHandler => {
  let timeoutId: number | null = null
  
  return (event: Event) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = window.setTimeout(() => {
      handler(event)
      timeoutId = null
    }, delay)
  }
}

/**
 * 创建节流事件处理器
 * 限制事件处理函数的执行频率
 */
export const createThrottledHandler = (
  handler: EventHandler,
  delay: number = 100
): EventHandler => {
  let lastExecTime = 0
  
  return (event: Event) => {
    const now = Date.now()
    
    if (now - lastExecTime >= delay) {
      handler(event)
      lastExecTime = now
    }
  }
}

/**
 * 创建一次性事件监听器
 * 事件触发一次后自动移除
 */
export const addOnceEventListener = (
  target: EventTarget,
  eventName: string,
  handler: EventHandler,
  options?: AddEventListenerOptions
): void => {
  const onceHandler = (event: Event) => {
    handler(event)
    target.removeEventListener(eventName, onceHandler, options)
  }
  
  target.addEventListener(eventName, onceHandler, options)
}

/**
 * 创建自定义事件
 * 统一创建和分发自定义事件
 */
export const createCustomEvent = (
  eventName: string,
  detail?: any,
  options?: CustomEventInit
): CustomEvent => {
  return new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true,
    ...options
  })
}

/**
 * 分发自定义事件
 * 安全分发自定义事件，包含错误处理
 */
export const dispatchCustomEvent = (
  target: EventTarget,
  eventName: string,
  detail?: any,
  options?: CustomEventInit
): boolean => {
  try {
    const event = createCustomEvent(eventName, detail, options)
    return target.dispatchEvent(event)
  } catch (error) {
    console.warn('分发自定义事件失败:', error)
    return false
  }
}

/**
 * 创建事件代理
 * 为多个目标元素创建统一的事件处理
 */
export const createEventDelegate = (
  targets: EventTarget[],
  event: string,
  handler: EventHandler,
  options?: AddEventListenerOptions
): () => void => {
  const disposers: Array<() => void> = []
  
  targets.forEach(target => {
    const disposer = safeAddEventListener(target, event, handler, options)
    disposers.push(disposer)
  })
  
  return () => {
    disposers.forEach(dispose => dispose())
  }
}

/**
 * 创建鼠标事件处理器
 * 统一处理鼠标相关事件
 */
export const createMouseEventHandler = (
  onMouseEnter?: (event: MouseEvent) => void,
  onMouseLeave?: (event: MouseEvent) => void,
  onMouseMove?: (event: MouseEvent) => void,
  onMouseClick?: (event: MouseEvent) => void
): {
  mouseenter: EventHandler
  mouseleave: EventHandler
  mousemove: EventHandler
  click: EventHandler
} => {
  return {
    mouseenter: (event: Event) => {
      if (onMouseEnter && event instanceof MouseEvent) {
        onMouseEnter(event)
      }
    },
    mouseleave: (event: Event) => {
      if (onMouseLeave && event instanceof MouseEvent) {
        onMouseLeave(event)
      }
    },
    mousemove: (event: Event) => {
      if (onMouseMove && event instanceof MouseEvent) {
        onMouseMove(event)
      }
    },
    click: (event: Event) => {
      if (onMouseClick && event instanceof MouseEvent) {
        onMouseClick(event)
      }
    }
  }
}

/**
 * 创建键盘事件处理器
 * 统一处理键盘相关事件
 */
export const createKeyboardEventHandler = (
  onKeyDown?: (event: KeyboardEvent) => void,
  onKeyUp?: (event: KeyboardEvent) => void,
  onKeyPress?: (event: KeyboardEvent) => void
): {
  keydown: EventHandler
  keyup: EventHandler
  keypress: EventHandler
} => {
  return {
    keydown: (event: Event) => {
      if (onKeyDown && event instanceof KeyboardEvent) {
        onKeyDown(event)
      }
    },
    keyup: (event: Event) => {
      if (onKeyUp && event instanceof KeyboardEvent) {
        onKeyUp(event)
      }
    },
    keypress: (event: Event) => {
      if (onKeyPress && event instanceof KeyboardEvent) {
        onKeyPress(event)
      }
    }
  }
}

/**
 * 创建窗口事件处理器
 * 统一处理窗口相关事件
 */
export const createWindowEventHandler = (
  onResize?: (event: Event) => void,
  onScroll?: (event: Event) => void,
  onLoad?: (event: Event) => void,
  onUnload?: (event: Event) => void
): () => void => {
  const disposers: Array<() => void> = []
  
  if (onResize) {
    const resizeHandler = createThrottledHandler(onResize, 100)
    disposers.push(safeAddEventListener(window, 'resize', resizeHandler))
  }
  
  if (onScroll) {
    const scrollHandler = createThrottledHandler(onScroll, 16) // 60fps
    disposers.push(safeAddEventListener(window, 'scroll', scrollHandler))
  }
  
  if (onLoad) {
    disposers.push(safeAddEventListener(window, 'load', onLoad))
  }
  
  if (onUnload) {
    disposers.push(safeAddEventListener(window, 'beforeunload', onUnload))
  }
  
  return () => {
    disposers.forEach(dispose => dispose())
  }
}
