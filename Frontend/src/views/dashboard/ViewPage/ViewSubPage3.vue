<template>
  <div class="view-sub-page">
    <DashboardViewHeader />
    <div class="view-content">
      <!-- 返回按钮 -->
      <div class="back-navigation">
        <BaseButton 
          variant="assistant"
          size="medium"
          icon="M19 12H5M12 19l-7-7 7-7"
          title="返回主页面"
          @click="goBack"
        >
          <span>返回</span>
        </BaseButton>
      </div>
      
      <div class="map-container">
        <div ref="mapContainer" class="map-view"></div>
        <!-- 基础地图控件 -->
        <FeaturePopup />
        <CoordinateDisplay />
        <ScaleBar />
        <OverviewMap />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import { usePageStateStore } from '@/stores/pageStateStore'
import DashboardViewHeader from '@/views/dashboard/ViewPage/layout/DashboardViewHeader.vue'
import FeaturePopup from '@/components/Map/FeaturePopup.vue'
import CoordinateDisplay from '@/components/Map/CoordinateDisplay.vue'
import ScaleBar from '@/components/Map/ScaleBar.vue'
import OverviewMap from '@/components/Map/OverviewMap.vue'
import BaseButton from '@/components/UI/BaseButton.vue'

// 组合式函数
const router = useRouter()
const { mapContainer, initMap, cleanup } = useMap()
const mapStore = useMapStore()
const pageStateStore = usePageStateStore()

let resizeObserver: ResizeObserver | null = null

// 返回主页面
const goBack = () => {
  router.push('/dashboard/view/home')
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

  // 设置当前页面为视图页面
  pageStateStore.switchToPage('view')

  // 当容器尺寸变化时，强制更新地图尺寸
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
  
  // 清理地图生命周期资源
  cleanup()
})
</script>

<style scoped>
.view-sub-page {
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

/* 返回按钮区域 */
.back-navigation {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 4px;
  min-height: fit-content;
}

.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
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
