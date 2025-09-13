<template>
  <div class="view-home">
    <DashboardViewHeader />
    <div class="view-content">
      <!-- 子页面导航切换按钮组 -->
      <div class="subpage-navigation">
        <ButtonGroup
          :buttons="subPageButtons"
          :active-button="activeSubPage"
          @select="navigateToSubPage"
        />
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
        <!-- 区域面积分布图表 -->
        <RegionAreaChart />
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
import { useRouter, useRoute } from 'vue-router'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import { useGlobalModalStore } from '@/stores/modalStore'
import { usePageStateStore } from '@/stores/pageStateStore'
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
import RegionAreaChart from '@/components/Charts/RegionAreaChart.vue'
import ButtonGroup from '@/components/UI/ButtonGroup.vue'

// 组合式函数
const router = useRouter()
const route = useRoute()
const { mapContainer, initMap, cleanup } = useMap()
const mapStore = useMapStore()
const globalModal = useGlobalModalStore()
const pageStateStore = usePageStateStore()

let resizeObserver: ResizeObserver | null = null
let eventCleanup: (() => void) | null = null

// 图层辅助控件引用
const layerAssistant = ref()

// 子页面按钮配置
const subPageButtons = [
  { id: 'home', text: '城市总览' },
  { id: 'subpage2', text: '民生资源' },
  { id: 'subpage1', text: '交通资源' },
  { id: 'subpage3', text: '水资源监测' }
]

// 当前激活的子页面
const activeSubPage = ref('home')

// 导航到子页面
const navigateToSubPage = async (subPageName: string) => {
  activeSubPage.value = subPageName
  if (subPageName === 'home') {
    // 先跳转路由
    await router.push('/dashboard/view')
    // 等待路由跳转完成后再刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 100)
  } else {
    router.push(`/dashboard/view/home/${subPageName}`)
  }
}

// 监听路由变化，同步激活状态
watch(() => route.path, (newPath) => {
  if (newPath === '/dashboard/view' || newPath === '/dashboard/view/home' || newPath.endsWith('/dashboard/view/home/')) {
    activeSubPage.value = 'home'
  } else if (newPath.includes('/subpage1')) {
    activeSubPage.value = 'subpage1'
  } else if (newPath.includes('/subpage2')) {
    activeSubPage.value = 'subpage2'
  } else if (newPath.includes('/subpage3')) {
    activeSubPage.value = 'subpage3'
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  // 确保外部库已加载
  if (window.ol && window.ol.supermap) {
    initMap(8) // 城市概况使用缩放等级8，显示城市全貌
  } else {
    // 如果库还未加载，等待一下再初始化
    setTimeout(() => initMap(8), 500)
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

/* 子页面导航切换按钮组区域 */
.subpage-navigation {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
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
