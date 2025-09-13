<template>
  <div class="map-legend">
    <div class="legend-title">图例</div>
    <div class="legend-items">
      <div 
        class="legend-item" 
        @click="toggleLayer('医院')" 
        :class="{ disabled: !isLayerVisible('医院') }"
      >
        <div class="legend-symbol triangle"></div>
        <span class="legend-label">医院</span>
      </div>
      <div 
        class="legend-item" 
        @click="toggleLayer('学校')" 
        :class="{ disabled: !isLayerVisible('学校') }"
      >
        <div class="legend-symbol square"></div>
        <span class="legend-label">学校</span>
      </div>
      <div 
        class="legend-item" 
        @click="toggleLayer('居民地地名点')" 
        :class="{ disabled: !isLayerVisible('居民地地名点') }"
      >
        <div class="legend-symbol diamond"></div>
        <span class="legend-label">居民地</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { uselayermanager } from '@/composables/useLayerManager'

// 图例组件，显示地图上各种要素的标识
const mapStore = useMapStore()
const { togglelayerVisibility } = uselayermanager()

// 图层名称映射
const layerNameMap: Record<string, string> = {
  '医院': '医院',
  '学校': '学校', 
  '居民地': '居民地地名点'
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
.map-legend {
  position: absolute;
  bottom: 20px;
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
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

.legend-symbol.triangle {
  width: 16px;
  height: 16px;
  background: #e3f2fd;
  border: 2px solid #1976d2;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.legend-symbol.square {
  background: #bbdefb;
  border-color: #1565c0;
  transform: rotate(45deg);
}

.legend-symbol.diamond {
  background: #90caf9;
  border-color: #2196f3;
  transform: rotate(45deg);
}

.legend-label {
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
}

/* 深色主题适配 */
[data-theme="dark"] .map-legend {
  background: transparent;
  border: none;
}

[data-theme="dark"] .legend-title,
[data-theme="dark"] .legend-label {
  color: var(--text);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-legend {
    bottom: 15px;
    padding: 8px 12px;
    gap: 12px;
  }
  
  .legend-items {
    gap: 16px;
  }
  
  .legend-symbol {
    width: 14px;
    height: 14px;
  }
  
  .legend-symbol.triangle {
    width: 14px;
    height: 14px;
    background: #e3f2fd;
    border: 2px solid #1976d2;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  }
  
  .legend-label {
    font-size: 10px;
  }
}
</style>
