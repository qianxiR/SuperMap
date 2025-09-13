<template>
  <div class="water-legend">
    <div class="legend-title">图例</div>
    <div class="legend-items">
      <div 
        class="legend-item" 
        @click="toggleLayer('水系面')" 
        :class="{ disabled: !isLayerVisible('水系面') }"
      >
        <div class="legend-symbol water-area"></div>
        <span class="legend-label">水系面</span>
      </div>
      <div 
        class="legend-item" 
        @click="toggleLayer('水系线')" 
        :class="{ disabled: !isLayerVisible('水系线') }"
      >
        <div class="legend-symbol water-line"></div>
        <span class="legend-label">水系线</span>
      </div>
      <div 
        class="legend-item" 
        @click="toggleLayer('水文监测点')" 
        :class="{ disabled: !isLayerVisible('水文监测点') }"
      >
        <div class="legend-symbol hydrology-point"></div>
        <span class="legend-label">水文监测点</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { uselayermanager } from '@/composables/useLayerManager'
import { getLegendColors } from '@/utils/legendColorUtils'

// 水资源图例组件，显示一般水系要素的标识
const mapStore = useMapStore()
const { togglelayerVisibility } = uselayermanager()

// 获取图层颜色配置，只包含一般水系图层
const layerColors = computed(() => getLegendColors())

// 图层名称映射
const layerNameMap: Record<string, string> = {
  '水系面': '水系面',
  '水系线': '水系线',
  '水文监测点': '水文监测点'
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
.water-legend {
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
  justify-content: center;
  gap: 12px;
  width: auto;
}

.legend-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-right: 8px;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 12px;
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



.legend-symbol.hydrology-point {
  width: 18px;
  height: 18px;
  background: v-bind('layerColors.水文监测点.fill');
  border: 3px solid v-bind('layerColors.水文监测点.stroke');
  border-radius: 50%;
}

.legend-symbol.water-area {
  width: 16px;
  height: 12px;
  background: v-bind('layerColors.水系面.fill');
  border: 2px solid v-bind('layerColors.水系面.stroke');
  border-radius: 2px;
}

.legend-symbol.water-line {
  width: 20px;
  height: 2px;
  background: v-bind('layerColors.水系线.stroke');
  border: none;
  border-radius: 1px;
}



.legend-label {
  font-size: 13px;
  color: var(--text);
  white-space: nowrap;
}

/* 深色主题适配 */
[data-theme="dark"] .water-legend {
  background: transparent;
  border: none;
}

[data-theme="dark"] .legend-title,
[data-theme="dark"] .legend-label {
  color: var(--text);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .water-legend {
    bottom: 15px;
    padding: 8px 12px;
    gap: 12px;
  }
  
  .legend-items {
    gap: 10px;
  }
  
  .legend-symbol {
    width: 16px;
    height: 16px;
  }
  
  .legend-symbol.hydrology-point {
    width: 16px;
    height: 16px;
  }
  
  .legend-symbol.water-area {
    width: 14px;
    height: 10px;
  }
  
  .legend-symbol.water-line {
    width: 18px;
    height: 2px;
  }
  
  .legend-label {
    font-size: 12px;
  }
}
</style>
