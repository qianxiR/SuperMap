<template>
  <div class="admin-legend">
    <div class="legend-title">图例</div>
    <div class="legend-items">
      <div 
        class="legend-item" 
        @click="toggleLayer('市级行政区')" 
        :class="{ disabled: !isLayerVisible('市级行政区') }"
      >
        <div class="legend-symbol admin-municipal"></div>
        <span class="legend-label">市级行政区</span>
      </div>
      <div 
        class="legend-item" 
        @click="toggleLayer('县级行政区')" 
        :class="{ disabled: !isLayerVisible('县级行政区') }"
      >
        <div class="legend-symbol admin-county"></div>
        <span class="legend-label">县级行政区</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { uselayermanager } from '@/composables/useLayerManager'
import { getLegendColors } from '@/utils/legendColorUtils'

// 行政区划图例组件，显示武汉市市级和县级行政区
const mapStore = useMapStore()
const { togglelayerVisibility } = uselayermanager()

// 获取图层颜色配置，确保与地图图层颜色一致
const layerColors = computed(() => getLegendColors())

// 图层名称映射
const layerNameMap: Record<string, string> = {
  '市级行政区': '武汉_市级',
  '县级行政区': '武汉_县级'
}

// 切换图层显示/隐藏
const toggleLayer = (displayName: string) => {
  const layerName = layerNameMap[displayName] || displayName
  
  // 查找对应的图层ID - 使用图层名称匹配
  const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName)
  if (layerInfo) {
    togglelayerVisibility(layerInfo.id)
  } else {
    // 如果直接匹配失败，尝试通过ID匹配
    const layerInfoById = mapStore.vectorlayers.find(l => l.id.includes(layerName))
    if (layerInfoById) {
      togglelayerVisibility(layerInfoById.id)
    }
  }
}

// 检查图层是否可见
const isLayerVisible = (displayName: string) => {
  const layerName = layerNameMap[displayName] || displayName
  
  // 首先尝试通过图层名称匹配
  let layerInfo = mapStore.vectorlayers.find(l => l.name === layerName)
  
  // 如果直接匹配失败，尝试通过ID匹配
  if (!layerInfo) {
    layerInfo = mapStore.vectorlayers.find(l => l.id.includes(layerName))
  }
  
  return layerInfo ? layerInfo.layer.getVisible() : false
}
</script>

<style scoped>
.admin-legend {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: transparent;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: none;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-right: 8px;
}


.legend-items {
  display: flex;
  align-items: center;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.legend-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.legend-item.disabled {
  opacity: 0.5;
}

.legend-item.disabled:hover {
  background: rgba(255, 255, 255, 0.05);
}

.legend-symbol {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.legend-symbol.admin-municipal {
  background: v-bind('layerColors.武汉_市级?.fill || "rgba(0, 120, 212, 0.08)"');
  border: 3px solid v-bind('layerColors.武汉_市级?.stroke || "#0078D4"');
}

.legend-symbol.admin-county {
  background: v-bind('layerColors.武汉_县级?.fill || "rgba(0, 120, 212, 0.1)"');
  border-color: v-bind('layerColors.武汉_县级?.stroke || "#0078D4"');
}

.legend-label {
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .admin-legend {
    bottom: 10px;
    padding: 8px 12px;
  }
  
  .legend-title {
    font-size: 11px;
  }
  
  .legend-items {
    gap: 16px;
  }
  
  .legend-item {
    gap: 6px;
  }
  
  .legend-symbol {
    width: 14px;
    height: 14px;
  }
  
  .legend-symbol.admin-municipal {
    border-width: 2px;
  }
  
  .legend-label {
    font-size: 10px;
  }
}
</style>
