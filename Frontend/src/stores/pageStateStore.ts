import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 页面状态管理Store
 * 管理页面级别的状态，包括页面切换、模式切换等
 */
export const usePageStateStore = defineStore('pageState', () => {
  // ===== 当前页面状态 =====
  const currentPage = ref<'view' | 'manage'>('view')
  
  // ===== 页面切换历史 =====
  const pageHistory = ref<Array<{ page: string; timestamp: number }>>([])
  
  // ===== 地图初始化状态 =====
  const mapInitialized = ref<boolean>(false)
  const mapInitializing = ref<boolean>(false)
  
  // ===== 页面加载状态 =====
  const pageLoading = ref<boolean>(false)
  
  // ===== 上次页面切换时间 =====
  const lastPageSwitchTime = ref<number>(0)
  
  // ===== 页面特定状态保存 =====
  const pageStates = ref<Record<string, any>>({
    view: {},
    manage: {}
  })

  // ===== 计算属性 =====
  
  // 是否为视图页面
  const isViewPage = computed(() => currentPage.value === 'view')
  
  // 是否为管理页面
  const isManagePage = computed(() => currentPage.value === 'manage')
  

  // ===== Actions =====

  /**
   * 切换到指定页面
   * @param page 目标页面
   */
  const switchToPage = (page: 'view' | 'manage') => {
    if (currentPage.value === page) return

    // 记录切换历史
    pageHistory.value.push({
      page: currentPage.value,
      timestamp: Date.now()
    })

    // 保持历史记录在合理范围内
    if (pageHistory.value.length > 50) {
      pageHistory.value = pageHistory.value.slice(-25)
    }

    // 更新当前页面
    const previousPage = currentPage.value
    currentPage.value = page
    lastPageSwitchTime.value = Date.now()

    console.log(`页面切换: ${previousPage} -> ${page}`)
  }

  /**
   * 设置地图初始化状态
   * @param initialized 是否已初始化
   */
  const setMapInitialized = (initialized: boolean) => {
    mapInitialized.value = initialized
    if (initialized) {
      mapInitializing.value = false
    }
  }

  /**
   * 设置地图初始化中状态
   * @param initializing 是否正在初始化
   */
  const setMapInitializing = (initializing: boolean) => {
    mapInitializing.value = initializing
  }

  /**
   * 设置页面加载状态
   * @param loading 是否正在加载
   */
  const setPageLoading = (loading: boolean) => {
    pageLoading.value = loading
  }

  /**
   * 保存页面特定状态
   * @param page 页面名称
   * @param state 状态对象
   */
  const savePageState = (page: string, state: any) => {
    pageStates.value[page] = { ...state }
  }

  /**
   * 获取页面特定状态
   * @param page 页面名称
   * @returns 页面状态
   */
  const getPageState = (page: string) => {
    return pageStates.value[page] || {}
  }

  /**
   * 清除页面特定状态
   * @param page 页面名称
   */
  const clearPageState = (page: string) => {
    pageStates.value[page] = {}
  }


  /**
   * 重置页面状态
   */
  const resetPageState = () => {
    currentPage.value = 'view'
    pageHistory.value = []
    mapInitialized.value = false
    mapInitializing.value = false
    pageLoading.value = false
    lastPageSwitchTime.value = 0
    pageStates.value = {
      view: {},
      manage: {}
    }
  }

  /**
   * 获取完整状态快照（用于持久化）
   */
  const getStateSnapshot = () => {
    return {
      currentPage: currentPage.value,
      mapInitialized: mapInitialized.value,
      lastPageSwitchTime: lastPageSwitchTime.value,
      pageStates: { ...pageStates.value }
    }
  }

  /**
   * 恢复状态快照（用于持久化恢复）
   */
  const restoreStateSnapshot = (snapshot: any) => {
    if (snapshot.currentPage) {
      currentPage.value = snapshot.currentPage
    }
    if (typeof snapshot.mapInitialized === 'boolean') {
      mapInitialized.value = snapshot.mapInitialized
    }
    if (typeof snapshot.lastPageSwitchTime === 'number') {
      lastPageSwitchTime.value = snapshot.lastPageSwitchTime
    }
    if (snapshot.pageStates) {
      pageStates.value = { ...pageStates.value, ...snapshot.pageStates }
    }
  }

  return {
    // ===== 状态 =====
    currentPage,
    pageHistory,
    mapInitialized,
    mapInitializing,
    pageLoading,
    lastPageSwitchTime,
    pageStates,

    // ===== 计算属性 =====
    isViewPage,
    isManagePage,

    // ===== 方法 =====
    switchToPage,
    setMapInitialized,
    setMapInitializing,
    setPageLoading,
    savePageState,
    getPageState,
    clearPageState,
    resetPageState,
    getStateSnapshot,
    restoreStateSnapshot
  }
})
