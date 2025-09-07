import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'

const useAreaSelectionStore = defineStore('areaSelection', () => {
  const mapStore = useMapStore()
  const selectedFeatures = ref<any[]>([])
  const selectedFeatureIndex = ref<number>(-1)
  const highlightedFeature = ref<any>(null)

  const hasSelected = computed(() => selectedFeatures.value.length > 0)
  const current = computed(() => {
    if (selectedFeatureIndex.value >= 0 && selectedFeatureIndex.value < selectedFeatures.value.length) {
      return selectedFeatures.value[selectedFeatureIndex.value]
    }
    return null
  })

  function setSelectedFeatures(features: any[]) {
    selectedFeatures.value = features
  }

  function setSelectedFeatureIndex(index: number) {
    selectedFeatureIndex.value = index
  }

  function setHighlightedFeature(feature: any) {
    highlightedFeature.value = feature
  }

  // 清除区域选择：只清除sourceTag为'area'的要素
  function clear() {
    // 清除地图上的区域选择高亮
    if (mapStore.selectlayer && mapStore.selectlayer.getSource()) {
      const source = mapStore.selectlayer.getSource()
      const features = source.getFeatures()
      features.forEach((f: any) => {
        if (f?.get && f.get('sourceTag') === 'area') {
          source.removeFeature(f)
        }
      })
      mapStore.selectlayer.changed()
    }
    
    // 清除本地状态
    selectedFeatures.value = []
    selectedFeatureIndex.value = -1
    highlightedFeature.value = null
  }

  return {
    selectedFeatures,
    selectedFeatureIndex,
    highlightedFeature,
    hasSelected,
    current,
    setSelectedFeatures,
    setSelectedFeatureIndex,
    setHighlightedFeature,
    clear
  }
})

export { useAreaSelectionStore }
export default useAreaSelectionStore


