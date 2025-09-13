<template>
  <div class="traffic-water-legend">
    <div class="legend-title">图例</div>
    <div class="legend-items">
      <!-- 交通图例 -->
      <div 
        class="legend-item" 
        @click="toggleLayer('公路')" 
        :class="{ disabled: !isLayerVisible('公路') }"
      >
        <div class="legend-symbol road"></div>
        <span class="legend-label">公路</span>
      </div>
      <div 
        class="legend-item" 
        @click="toggleLayer('铁路')" 
        :class="{ disabled: !isLayerVisible('铁路') }"
      >
        <div class="legend-symbol railway"></div>
        <span class="legend-label">铁路</span>
      </div>
      <!-- 水系图例 -->
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { uselayermanager } from '@/composables/useLayerManager'
import { getLegendColors } from '@/utils/legendColorUtils'

// 交通水系一体化图例组件，显示交通和水系要素的标识
const mapStore = useMapStore()
const { togglelayerVisibility } = uselayermanager()

// 获取图层颜色配置
const layerColors = computed(() => getLegendColors())

// 图层名称映射
const layerNameMap: Record<string, string> = {
  '公路': '公路',
  '铁路': '铁路',
  '水系面': '水系面',
  '水系线': '水系线'
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
.traffic-water-legend {
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
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 交通图例样式 */
.legend-symbol.road {
  width: 20px;
  height: 4px;
  background: v-bind('layerColors.公路.stroke');
  border: none;
  border-radius: 2px;
}

.legend-symbol.railway {
  width: 20px;
  height: 4px;
  background: v-bind('layerColors.铁路.stroke');
  border: none;
  border-radius: 2px;
  position: relative;
}

.legend-symbol.railway::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ffffff;
  transform: translateY(-50%);
}

/* 水系图例样式 */
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
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
}

/* 深色主题适配 */
[data-theme="dark"] .traffic-water-legend {
  background: transparent;
  border: none;
}

[data-theme="dark"] .legend-title,
[data-theme="dark"] .legend-label {
  color: var(--text);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .traffic-water-legend {
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
  
  .legend-symbol.road,
  .legend-symbol.railway {
    width: 18px;
    height: 3px;
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
    font-size: 10px;
  }
}
</style>
