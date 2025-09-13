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
        <!-- 水资源图例 -->
        <WaterLegend />
        <!-- 水质监测图表 -->
        <WaterQualityChart1 />
        <WaterQualityChart2 />
        <WaterQualityChart3 />
        <WaterQualityChart4 />
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
import { getHydrologyData, getHydrologyLayerInfo } from '@/api/hydrologyData'
import { getYangtzeSurfaceData, getYangtzeLineData, getYangtzeSurfaceLayerInfo, getYangtzeLineLayerInfo } from '@/api/yangtzeData'
import FeaturePopup from '@/components/Map/FeaturePopup.vue'
import CoordinateDisplay from '@/components/Map/CoordinateDisplay.vue'
import ScaleBar from '@/components/Map/ScaleBar.vue'
import OverviewMap from '@/components/Map/OverviewMap.vue'
import WaterLegend from '@/components/Map/WaterLegend.vue'
import ButtonGroup from '@/components/UI/ButtonGroup.vue'
import WaterQualityChart1 from '@/components/Charts/WaterQualityChart1.vue'
import WaterQualityChart2 from '@/components/Charts/WaterQualityChart2.vue'
import WaterQualityChart3 from '@/components/Charts/WaterQualityChart3.vue'
import WaterQualityChart4 from '@/components/Charts/WaterQualityChart4.vue'

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
const activeSubPage = ref('water-resources')

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

// 加载水文监测点图层
const loadHydrologyLayer = async () => {
  if (!mapStore.map) return
  
  try {
    // 获取水文监测点数据
    const hydrologyData = await getHydrologyData()
    const layerInfo = getHydrologyLayerInfo()
    
    // 创建OpenLayers要素
    const ol = window.ol
    const features = new ol.format.GeoJSON().readFeatures(hydrologyData, {
      featureProjection: mapStore.map.getView().getProjection()
    })
    
    // 创建矢量图层
    const vectorSource = new ol.source.Vector({
      features: features
    })
    
    // 创建水文监测点样式函数 - 统一蓝色显示
    const css = getComputedStyle(document.documentElement)
    const hydrologyFillColor = '#1890ff' // 统一蓝色填充
    const hydrologyStrokeColor = '#0050b3' // 统一深蓝色描边
    
    // 特定监测点的名称配置（保持名称显示，但颜色统一）
    const stationNames = {
      '湖北省武汉市东西湖区吴家山': '汉口(吴家山)',
      '湖北省新洲县阳逻镇武湖泵站': '阳逻',
      '湖北省武汉市南望山': '东湖',
      '湖北省武昌县金口镇金水闸': '金口'
    }
    
    const hydrologyStyleFunction = (feature: any) => {
      const address = feature.get('地址')
      const stationName = feature.get('测站名')
      const isSpecialStation = !!stationNames[address as keyof typeof stationNames]
      
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: isSpecialStation ? 12 : 6, // 特殊监测点半径更大
          fill: new ol.style.Fill({
            color: hydrologyFillColor // 统一蓝色填充
          }),
          stroke: new ol.style.Stroke({
            color: hydrologyStrokeColor, // 统一深蓝色描边
            width: isSpecialStation ? 3 : 2 // 特殊监测点描边更粗
          })
        }),
        text: isSpecialStation ? new ol.style.Text({
          text: stationName,
          font: 'bold 12px Arial',
          fill: new ol.style.Fill({
            color: '#000000'
          }),
          stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: 2
          }),
          offsetY: -20,
          textAlign: 'center'
        }) : undefined
      })
    }
    
    const hydrologyLayer = new ol.layer.Vector({
      source: vectorSource,
      style: hydrologyStyleFunction,
      visible: true,
      zIndex: 100
    })
    
    // 添加到地图
    mapStore.map.addLayer(hydrologyLayer)
    
    // 添加到图层管理
    mapStore.vectorlayers.push({
      id: '水文监测点',
      name: '水文监测点',
      layer: hydrologyLayer,
      visible: true,
      type: 'vector',
      source: 'hydrology',
      featureCount: layerInfo.featureCount,
      bounds: layerInfo.bounds,
      fields: layerInfo.fields
    })
    
    console.log('水文监测点图层加载完成:', layerInfo.featureCount, '个监测点')
    
  } catch (error) {
    console.error('加载水文监测点图层失败:', error)
  }
}

// 加载长江面图层
const loadYangtzeSurfaceLayer = async () => {
  if (!mapStore.map) return
  
  try {
    // 获取长江面数据
    const yangtzeSurfaceData = await getYangtzeSurfaceData()
    const layerInfo = await getYangtzeSurfaceLayerInfo()
    
    // 创建OpenLayers要素
    const ol = window.ol
    const features = new ol.format.GeoJSON().readFeatures(yangtzeSurfaceData, {
      featureProjection: mapStore.map.getView().getProjection()
    })
    
    // 创建矢量图层源
    const vectorSource = new ol.source.Vector({
      features: features
    })
    
    // 创建长江面样式 - 使用蓝色主题
    const yangtzeSurfaceFillColor = 'rgba(0, 50, 115, 0.3)' // 半透明蓝色填充
    const yangtzeSurfaceStrokeColor = '#003a8c' // 深蓝色描边
    
    const yangtzeSurfaceStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: yangtzeSurfaceFillColor
      }),
      stroke: new ol.style.Stroke({
        color: yangtzeSurfaceStrokeColor,
        width: 2
      })
    })
    
    const yangtzeSurfaceLayer = new ol.layer.Vector({
      source: vectorSource,
      style: yangtzeSurfaceStyle,
      visible: true,
      zIndex: 50
    })
    
    // 添加到地图
    mapStore.map.addLayer(yangtzeSurfaceLayer)
    
    // 添加到图层管理
    mapStore.vectorlayers.push({
      id: '长江面',
      name: '长江面',
      layer: yangtzeSurfaceLayer,
      visible: true,
      type: 'vector',
      source: 'yangtze_surface',
      featureCount: layerInfo.featureCount,
      bounds: layerInfo.bounds,
      fields: layerInfo.fields
    })
    
    console.log('长江面图层加载完成:', layerInfo.featureCount, '个要素')
    
  } catch (error) {
    console.error('加载长江面图层失败:', error)
  }
}

// 加载长江线图层
const loadYangtzeLineLayer = async () => {
  if (!mapStore.map) return
  
  try {
    // 获取长江线数据
    const yangtzeLineData = await getYangtzeLineData()
    const layerInfo = await getYangtzeLineLayerInfo()
    
    // 创建OpenLayers要素
    const ol = window.ol
    const features = new ol.format.GeoJSON().readFeatures(yangtzeLineData, {
      featureProjection: mapStore.map.getView().getProjection()
    })
    
    // 创建矢量图层源
    const vectorSource = new ol.source.Vector({
      features: features
    })
    
    // 创建长江线样式 - 使用蓝色主题
    const yangtzeLineStrokeColor = '#002766' // 深蓝色描边
    
    const yangtzeLineStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: yangtzeLineStrokeColor,
        width: 3
      })
    })
    
    const yangtzeLineLayer = new ol.layer.Vector({
      source: vectorSource,
      style: yangtzeLineStyle,
      visible: true,
      zIndex: 60
    })
    
    // 添加到地图
    mapStore.map.addLayer(yangtzeLineLayer)
    
    // 添加到图层管理
    mapStore.vectorlayers.push({
      id: '长江线',
      name: '长江线',
      layer: yangtzeLineLayer,
      visible: true,
      type: 'vector',
      source: 'yangtze_line',
      featureCount: layerInfo.featureCount,
      bounds: layerInfo.bounds,
      fields: layerInfo.fields
    })
    
    console.log('长江线图层加载完成:', layerInfo.featureCount, '个要素')
    
  } catch (error) {
    console.error('加载长江线图层失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  // 确保外部库已加载
  if (window.ol && window.ol.supermap) {
    await initMap(9, ['武汉_市级', '武汉_县级']) // 长江监测预警一体化显示武汉_市级、武汉_县级
    // 加载长江数据图层
    await loadYangtzeSurfaceLayer()
    await loadYangtzeLineLayer()
    // 加载水文监测点图层
    await loadHydrologyLayer()
  } else {
    // 如果库还未加载，等待一下再初始化
    setTimeout(async () => {
      await initMap(9, ['武汉_市级', '武汉_县级'])
      await loadYangtzeSurfaceLayer()
      await loadYangtzeLineLayer()
      await loadHydrologyLayer()
    }, 500)
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
