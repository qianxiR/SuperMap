<template>
  <div class="view-home">
    <DashboardViewHeader />
    <div class="view-content">
      <div class="map-container">
        <div ref="mapContainer" class="map-view"></div>
        <!-- 图层辅助控件（左上角） -->
        <LayerAssistant />
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
    </div>

    <!-- 全局窗口：个人中心 / Agent 管理 -->
    <UserProfile v-if="globalModal.visible && globalModal.type === 'profile'" />
    <AIManagement v-if="globalModal.visible && globalModal.type === 'agent'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import { useGlobalModalStore } from '@/stores/modalStore'
import DashboardViewHeader from '@/views/dashboard/ViewPage/layout/DashboardViewHeader.vue'
import UserProfile from '@/views/dashboard/management-analysis/profile/UserProfile.vue'
import AIManagement from '@/views/dashboard/management-analysis/management/AIManagement.vue'
import FeaturePopup from '@/components/Map/FeaturePopup.vue'
import CoordinateDisplay from '@/components/Map/CoordinateDisplay.vue'
import ScaleBar from '@/components/Map/ScaleBar.vue'
import LayerAssistant from '@/components/Map/LayerAssistant.vue'
import OverviewMap from '@/components/Map/OverviewMap.vue'
import DistanceMeasurePanel from '@/components/Map/DistanceMeasurePanel.vue'
import AreaMeasurePanel from '@/components/Map/AreaMeasurePanel.vue'

// 组合式函数
const { mapContainer, initMap } = useMap()
const mapStore = useMapStore()
const globalModal = useGlobalModalStore()
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
.view-home {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.view-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px; /* 兜底，防止父级高度为0时地图不可见 */
}

.map-view {
  position: absolute;
  inset: 0;
  border-radius: 8px;
}

/* 隐藏默认的 Openlayers 缩放控件 */
:deep(.custom-zoom-control) {
  display: none !important;
}
</style>
