import { computed } from 'vue'
import { useFeatureQueryStore } from '@/stores/featureQueryStore'

export function useFeatureQuery() {
  const store = useFeatureQueryStore()
  
  return {
    // 状态（computed 形式，保持与原 API 兼容）
    selectedlayerId: computed({ get: () => store.selectedlayerId, set: v => (store.selectedlayerId = v) }),
    queryResults: computed(() => store.queryResults),
    layerFields: computed(() => store.layerFields),
    queryConfig: computed(() => store.queryConfig),
    isQuerying: computed(() => store.isQuerying),
    lastExecutedQuery: computed(() => store.lastExecutedQuery),
    selectedFeatureIndex: computed({ get: () => store.selectedFeatureIndex, set: v => (store.selectedFeatureIndex = v) }),
    highlightedFeature: computed(() => store.highlightedFeature),
    
    // 查询执行
    executeQuery: store.executeQuery,
    getlayerFields: store.getlayerFields,
    highlightQueryResults: store.highlightQueryResults,
    
    // 要素选择功能
    handleSelectFeature: store.handleSelectFeature,
    highlightFeatureOnMap: store.highlightFeatureOnMap,
    triggerMapFeatureHighlight: store.triggerMapFeatureHighlight,
    removeHighlightFeature: store.removeHighlightFeature,
    isSameFeature: store.isSameFeature,
    
    // 图层管理
    clearSelectedlayer: store.clearSelectedlayer,
    invertSelectedlayer: store.invertSelectedlayer,
    getlayerOptions: store.getlayerOptions,
    getSelectedlayerName: store.getSelectedlayerName,
    getlayerFeatureCount: store.getlayerFeatureCount
  }
}
