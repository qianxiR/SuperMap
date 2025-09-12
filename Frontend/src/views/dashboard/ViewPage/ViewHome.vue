<template>
  <div class="view-home">
    <DashboardViewHeader />
    <div class="view-content">
      <!-- 子页面导航按钮区域 -->
      <div class="subpage-navigation">
        <BaseButton 
          variant="assistant"
          size="medium"
          :icon="'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'"
          title="城市总览"
          @click="navigateToSubPage('subpage1')"
        >
          <span class="button-text">城市总览</span>
        </BaseButton>
        <BaseButton 
          variant="assistant"
          size="medium"
          :icon="'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'"
          title="民生设施"
          @click="navigateToSubPage('subpage2')"
        >
          <span class="button-text">民生设施</span>
        </BaseButton>
        <BaseButton 
          variant="assistant"
          size="medium"
          :icon="'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'"
          title="生态资源"
          @click="navigateToSubPage('subpage3')"
        >
          <span class="button-text">生态资源</span>
        </BaseButton>
      </div>
      
      <div class="map-container">
        <div ref="mapContainer" class="map-view"></div>
        <!-- 图层辅助控件（左上角） -->
        <LayerAssistant ref="layerAssistant" />
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

    <!-- 子路由视图 -->
    <router-view />

    <!-- 全局窗口：个人中心 / Agent 管理 -->
    <UserProfile v-if="globalModal.visible && globalModal.type === 'profile'" />
    <AIManagement v-if="globalModal.visible && globalModal.type === 'agent'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import { useGlobalModalStore } from '@/stores/modalStore'
import { usePageStateStore } from '@/stores/pageStateStore'
import { safeAddEventListener, createWindowEventHandler } from '@/utils/eventUtils'
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
import BaseButton from '@/components/UI/BaseButton.vue'

// 组合式函数
const router = useRouter()
const { mapContainer, initMap, cleanup } = useMap()
const mapStore = useMapStore()
const globalModal = useGlobalModalStore()
const pageStateStore = usePageStateStore()

let resizeObserver: ResizeObserver | null = null
let eventCleanup: (() => void) | null = null

// 图层辅助控件引用
const layerAssistant = ref()

// 导航到子页面
const navigateToSubPage = (subPageName: string) => {
  router.push(`/dashboard/view/home/${subPageName}`)
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
  display: flex;
  flex-direction: column;
}

/* 子页面导航按钮区域 */
.subpage-navigation {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: row;
  gap: 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 12px 16px;
  min-height: fit-content;
}

.button-text {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: var(--accent);
  white-space: nowrap;
}

.map-container {
  position: relative;
  flex: 1;
  width: 100%;
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
