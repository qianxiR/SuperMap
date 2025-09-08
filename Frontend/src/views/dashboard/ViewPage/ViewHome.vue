<template>
  <div class="view-home">
    <DashboardViewHeader />
    <div class="view-content">
      <div class="map-container">
        <div ref="mapContainer" class="map-view"></div>
        <!-- 图层辅助控件（左上角） -->
        <LayerAssistant ref="layerAssistant" />
        <!-- 图层管理器（右上角） -->
        <ViewLayerManager 
          :visible="layerManagerVisible" 
          @close="handleLayerManagerClose"
        />
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
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import { useGlobalModalStore } from '@/stores/modalStore'
import { useLayerUIStore } from '@/stores/layerUIStore'
import { usePageStateStore } from '@/stores/pageStateStore'
import DashboardViewHeader from '@/views/dashboard/ViewPage/layout/DashboardViewHeader.vue'
import UserProfile from '@/views/dashboard/management-analysis/profile/UserProfile.vue'
import AIManagement from '@/views/dashboard/management-analysis/management/AIManagement.vue'
import FeaturePopup from '@/components/Map/FeaturePopup.vue'
import CoordinateDisplay from '@/components/Map/CoordinateDisplay.vue'
import ScaleBar from '@/components/Map/ScaleBar.vue'
import LayerAssistant from '@/components/Map/LayerAssistant.vue'
import ViewLayerManager from '@/components/Map/ViewLayerManager.vue'
import OverviewMap from '@/components/Map/OverviewMap.vue'
import DistanceMeasurePanel from '@/components/Map/DistanceMeasurePanel.vue'
import AreaMeasurePanel from '@/components/Map/AreaMeasurePanel.vue'

// 组合式函数
const { mapContainer, initMap, cleanup } = useMap()
const mapStore = useMapStore()
const globalModal = useGlobalModalStore()
const layerUIStore = useLayerUIStore()
const pageStateStore = usePageStateStore()

let resizeObserver: ResizeObserver | null = null
let openLayerManagerHandler: (() => void) | null = null

// 图层管理相关状态 - 使用Pinia管理
const layerAssistant = ref()
const layerManagerVisible = computed(() => layerUIStore.layerManagerVisible)

// 监听LayerAssistant的图层管理按钮状态
watch(() => layerAssistant.value?.layerManagerVisible, (newVal) => {
  if (newVal !== undefined) {
    layerUIStore.layerManagerVisible = newVal
  }
}, { deep: true })

// 处理图层管理器关闭
const handleLayerManagerClose = () => {
  layerUIStore.hideLayerManager()
  if (layerAssistant.value) {
    layerAssistant.value.layerManagerVisible = false
  }
}

// 生命周期
onMounted(() => {
  // 确保外部库已加载
  if (window.ol && window.ol.supermap) {
    initMap()
  } else {
    // 如果库还未加载，等待一下再初始化
    setTimeout(initMap, 500)
  }

  // 监听来自Header的打开图层管理事件
  openLayerManagerHandler = () => {
    layerUIStore.showLayerManager()
    if (layerAssistant.value) {
      layerAssistant.value.layerManagerVisible = true
    }
  }
  
  // 设置当前页面为视图页面
  pageStateStore.switchToPage('view')
  
  window.addEventListener('openLayerManager', openLayerManagerHandler)

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
  // 清理事件监听器
  if (openLayerManagerHandler) {
    window.removeEventListener('openLayerManager', openLayerManagerHandler)
    openLayerManagerHandler = null
  }
  
  if (resizeObserver) {
    try { resizeObserver.disconnect() } catch (_) {}
    resizeObserver = null
  }
  
  // 清理地图生命周期资源
  cleanup()
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
