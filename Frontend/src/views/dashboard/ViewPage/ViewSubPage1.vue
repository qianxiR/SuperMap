<template>
  <div class="view-sub-page">
    <div class="view-content">
      <!-- 子页面切换按钮组 -->
      <div class="subpage-navigation">
        <ButtonGroup
          :buttons="subPageButtons"
          :active-button="activeSubPage"
          @select="navigateToSubPage"
        />
      </div>
      
      <div class="map-container">
        <div ref="mapContainer" class="map-view"></div>
        <!-- 基础地图控件 -->
        <FeaturePopup />
        <CoordinateDisplay />
        <ScaleBar />
        <OverviewMap />
        <!-- 交通图例 -->
        <TrafficLegend />
        <!-- 水系图例 -->
        <WaterLegend />
        <!-- 统计图表 -->
        <RoadLevelChart />
        <RailwayTypeChart />
        <!-- 水系图表 -->
        <WaterSurfaceChart />
        <WaterLineChart />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMap } from '@/composables/useMap'
import { useMapStore } from '@/stores/mapStore'
import { usePageStateStore } from '@/stores/pageStateStore'
import FeaturePopup from '@/components/Map/FeaturePopup.vue'
import CoordinateDisplay from '@/components/Map/CoordinateDisplay.vue'
import ScaleBar from '@/components/Map/ScaleBar.vue'
import OverviewMap from '@/components/Map/OverviewMap.vue'
import TrafficLegend from '@/components/Map/TrafficLegend.vue'
import WaterLegend from '@/components/Map/WaterLegend.vue'
import ButtonGroup from '@/components/UI/ButtonGroup.vue'
import RoadLevelChart from '@/components/Charts/RoadLevelChart.vue'
import RailwayTypeChart from '@/components/Charts/RailwayTypeChart.vue'
import WaterSurfaceChart from '@/components/Charts/WaterSurfaceChart.vue'
import WaterLineChart from '@/components/Charts/WaterLineChart.vue'

// 组合式函数
const router = useRouter()
const route = useRoute()
const { mapContainer, initMap, cleanup } = useMap()
const mapStore = useMapStore()
const pageStateStore = usePageStateStore()

let resizeObserver: ResizeObserver | null = null

// 子页面按钮配置
const subPageButtons = [
  { id: 'home', text: '城市综合态势' },
  { id: 'livelihood-resources', text: '民生资源一张图' },
  { id: 'traffic-resources', text: '交通水系一体化' },
  { id: 'water-resources', text: '长江监测预警一体化' }
]

// 当前激活的子页面
const activeSubPage = ref('traffic-resources')

// 导航到子页面
const navigateToSubPage = async (subPageName: string) => {
  activeSubPage.value = subPageName
  if (subPageName === 'home') {
    // 直接跳转到城市综合态势并刷新
    window.location.href = '/dashboard/view/home'
  } else {
    router.push(`/dashboard/view/home/${subPageName}`)
  }
}

// 监听路由变化，同步激活状态
watch(() => route.path, (newPath) => {
  if (newPath === '/dashboard/view' || newPath === '/dashboard/view/home' || newPath.endsWith('/dashboard/view/home/')) {
    activeSubPage.value = 'home'
  } else if (newPath.includes('/traffic-resources')) {
    activeSubPage.value = 'traffic-resources'
  } else if (newPath.includes('/livelihood-resources')) {
    activeSubPage.value = 'livelihood-resources'
  } else if (newPath.includes('/water-resources')) {
    activeSubPage.value = 'water-resources'
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  // 确保外部库已加载
  if (window.ol && window.ol.supermap) {
    initMap(9, ['武汉_市级', '武汉_县级', '公路', '铁路', '水系面', '水系线']) // 交通水系一体化显示武汉_市级、武汉_县级、道路、铁路、水系面、水系线
  } else {
    // 如果库还未加载，等待一下再初始化
    setTimeout(() => initMap(9, ['武汉_市级', '武汉_县级', '公路', '铁路', '水系面', '水系线']), 500)
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
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.view-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 子页面切换按钮组区域 */
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
