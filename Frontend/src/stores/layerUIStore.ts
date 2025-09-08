import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 图层UI状态管理Store
 * 统一管理两个页面的图层管理器UI状态
 */
export const useLayerUIStore = defineStore('layerUI', () => {
  // ===== 图层组展开/折叠状态 =====
  const expandedGroups = ref<Record<string, boolean>>({
    supermap: false,    // SuperMap服务图层组
    draw: false,        // 分析及绘制图层组
    query: false,       // 查询图层组
    upload: false,      // 上传图层组
    external: false     // 外部图层组
  })

  // ===== 选中图层状态 =====
  const selectedLayerKey = ref<string>('')
  
  // ===== 图层管理器显示状态 =====
  const layerManagerVisible = ref<boolean>(false)
  
  // ===== 删除确认对话框状态 =====
  const deleteDialog = ref({
    visible: false,
    title: '',
    message: '',
    layerId: ''
  })

  // ===== 图层搜索状态 =====
  const searchText = ref<string>('')
  const searchResults = ref<string[]>([])

  // ===== 计算属性 =====
  
  // 是否有展开的图层组
  const hasExpandedGroups = computed(() => {
    return Object.values(expandedGroups.value).some(expanded => expanded)
  })

  // 是否有选中的图层
  const hasSelectedLayer = computed(() => {
    return selectedLayerKey.value !== ''
  })

  // 搜索是否激活
  const isSearchActive = computed(() => {
    return searchText.value.trim() !== ''
  })

  // ===== Actions =====

  /**
   * 切换图层组的展开/折叠状态
   * @param groupName 图层组名称
   */
  const toggleGroupExpanded = (groupName: string) => {
    if (expandedGroups.value.hasOwnProperty(groupName)) {
      expandedGroups.value[groupName] = !expandedGroups.value[groupName]
    }
  }

  /**
   * 设置图层组的展开状态
   * @param groupName 图层组名称
   * @param expanded 是否展开
   */
  const setGroupExpanded = (groupName: string, expanded: boolean) => {
    if (expandedGroups.value.hasOwnProperty(groupName)) {
      expandedGroups.value[groupName] = expanded
    }
  }

  /**
   * 展开所有图层组
   */
  const expandAllGroups = () => {
    Object.keys(expandedGroups.value).forEach(key => {
      expandedGroups.value[key] = true
    })
  }

  /**
   * 折叠所有图层组
   */
  const collapseAllGroups = () => {
    Object.keys(expandedGroups.value).forEach(key => {
      expandedGroups.value[key] = false
    })
  }

  /**
   * 选中图层
   * @param layerKey 图层唯一标识
   */
  const selectLayer = (layerKey: string) => {
    selectedLayerKey.value = layerKey
  }

  /**
   * 清除图层选择
   */
  const clearLayerSelection = () => {
    selectedLayerKey.value = ''
  }

  /**
   * 显示图层管理器
   */
  const showLayerManager = () => {
    layerManagerVisible.value = true
  }

  /**
   * 隐藏图层管理器
   */
  const hideLayerManager = () => {
    layerManagerVisible.value = false
  }

  /**
   * 切换图层管理器显示状态
   */
  const toggleLayerManager = () => {
    layerManagerVisible.value = !layerManagerVisible.value
  }

  /**
   * 显示删除确认对话框
   * @param config 对话框配置
   */
  const showDeleteDialog = (config: {
    title: string
    message: string
    layerId: string
  }) => {
    deleteDialog.value = {
      visible: true,
      ...config
    }
  }

  /**
   * 隐藏删除确认对话框
   */
  const hideDeleteDialog = () => {
    deleteDialog.value = {
      visible: false,
      title: '',
      message: '',
      layerId: ''
    }
  }

  /**
   * 设置搜索文本
   * @param text 搜索文本
   */
  const setSearchText = (text: string) => {
    searchText.value = text
  }

  /**
   * 清除搜索
   */
  const clearSearch = () => {
    searchText.value = ''
    searchResults.value = []
  }

  /**
   * 设置搜索结果
   * @param results 搜索结果数组
   */
  const setSearchResults = (results: string[]) => {
    searchResults.value = results
  }

  /**
   * 重置所有UI状态到默认值
   * 页面切换时直接全部清理
   */
  const resetUIState = () => {
    // 重置展开状态
    Object.keys(expandedGroups.value).forEach(key => {
      expandedGroups.value[key] = false
    })
    
    // 重置选中状态
    selectedLayerKey.value = ''
    
    // 重置图层管理器显示状态
    layerManagerVisible.value = false
    
    // 重置对话框状态
    hideDeleteDialog()
    
    // 重置搜索状态
    clearSearch()
    
  }

  /**
   * 获取状态快照（用于持久化）
   */
  const getStateSnapshot = () => {
    return {
      expandedGroups: { ...expandedGroups.value },
      selectedLayerKey: selectedLayerKey.value,
      layerManagerVisible: layerManagerVisible.value,
      searchText: searchText.value
    }
  }

  /**
   * 恢复状态快照（用于持久化恢复）
   */
  const restoreStateSnapshot = (snapshot: any) => {
    if (snapshot.expandedGroups) {
      expandedGroups.value = { ...expandedGroups.value, ...snapshot.expandedGroups }
    }
    if (typeof snapshot.selectedLayerKey === 'string') {
      selectedLayerKey.value = snapshot.selectedLayerKey
    }
    if (typeof snapshot.layerManagerVisible === 'boolean') {
      layerManagerVisible.value = snapshot.layerManagerVisible
    }
    if (typeof snapshot.searchText === 'string') {
      searchText.value = snapshot.searchText
    }
  }

  return {
    // ===== 状态 =====
    expandedGroups,
    selectedLayerKey,
    layerManagerVisible,
    deleteDialog,
    searchText,
    searchResults,

    // ===== 计算属性 =====
    hasExpandedGroups,
    hasSelectedLayer,
    isSearchActive,

    // ===== 方法 =====
    toggleGroupExpanded,
    setGroupExpanded,
    expandAllGroups,
    collapseAllGroups,
    selectLayer,
    clearLayerSelection,
    showLayerManager,
    hideLayerManager,
    toggleLayerManager,
    showDeleteDialog,
    hideDeleteDialog,
    setSearchText,
    clearSearch,
    setSearchResults,
    resetUIState,
    getStateSnapshot,
    restoreStateSnapshot
  }
})
