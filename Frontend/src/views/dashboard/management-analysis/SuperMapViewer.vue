<template>
  <div class="map-container">
    <div ref="mapContainer" class="map-view"></div>
    <!-- 图层辅助控件（左上角） -->
    <layerAssistant />
    <!-- 要素弹窗 -->
    <FeaturePopup />
    <!-- 坐标显示（左下角） -->
    <CoordinateDisplay />
    <!-- 比例尺显示（右下角） -->
    <ScaleBar />
    <!-- 鹰眼（右下角） -->
    <OverviewMap />
    <!-- 距离量算面板 -->
    <DistanceMeasurePanel />
    <!-- 面积量算面板 -->
    <AreaMeasurePanel />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import FeaturePopup from '@/components/Map/FeaturePopup.vue'
import CoordinateDisplay from '@/components/Map/CoordinateDisplay.vue'
import ScaleBar from '@/components/Map/ScaleBar.vue'
import layerAssistant from '@/components/Map/LayerAssistant.vue'
import OverviewMap from '@/components/Map/OverviewMap.vue'
import DistanceMeasurePanel from '@/components/Map/DistanceMeasurePanel.vue'
import AreaMeasurePanel from '@/components/Map/AreaMeasurePanel.vue'


// 组合式函数
const { mapContainer, initMap } = useMap()
const mapStore = useMapStore()
let resizeObserver: ResizeObserver | null = null

// 生命周期
onMounted(() => {
  // 确保外部库已加载
  if (window.ol && window.ol.supermap) {
    initMap()
  } else {
    // 如果库还未加载，等待一下再初始化
    setTimeout(initMap, 500)
  }


  // 当容器尺寸变化时，强制更新地图尺寸，避免容器初始为0导致"无地图可见"
  const el = mapContainer.value
  if (el && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      try { mapStore.map?.updateSize?.() } catch (_) {}
    })
    resizeObserver.observe(el)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    try { resizeObserver.disconnect() } catch (_) {}
    resizeObserver = null
  }
})
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 300px;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--glow);
  padding: 0.625rem;
  overflow: hidden;
}

.map-view {
  position: absolute;
  inset: 0.625rem;
}

/* 隐藏默认的 Openlayers 缩放控件 */
:deep(.custom-zoom-control) {
  display: none !important;
}
</style>
