<template>
  <div class="overview-map-container no-theme-flicker" v-if="mapStore.overviewMapVisible">
    <div class="overview-map-header">
      <span class="overview-title">鹰眼</span>
    </div>
    <div 
      ref="overviewMapElement" 
      class="overview-map"
      title="点击导航到指定位置，拖拽移动视图"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useThemeStore } from '@/stores/themeStore'
import {getCurrentBaseMapUrl } from '@/utils/config'

const mapStore = useMapStore()
const themeStore = useThemeStore()

// 响应式数据
const overviewMapElement = ref<HTMLElement | null>(null)
const overviewMap = ref<any>(null)
const extentlayer = ref<any>(null) // 视口框图层
let themeObserver: MutationObserver | null = null // 主题变化观察器

// 更新视口框函数
const updateExtentBox = () => {
  if (!overviewMap.value || !mapStore.map || !extentlayer.value) return
  
  const ol = window.ol
  const mainView = mapStore.map.getView()
  const overviewView = overviewMap.value.getView()
  const extentSource = extentlayer.value.getSource()
  
  // 清除旧的视口框
  extentSource.clear()
  
  // 获取主地图的当前范围
  const mainExtent = mainView.calculateExtent(mapStore.map.getSize())
  
  // 将主地图范围转换到鹰眼坐标系
  const overviewExtent = ol.proj.transformExtent(mainExtent, mainView.getProjection(), overviewView.getProjection())
  
  // 创建视口框要素
  const extentFeature = new ol.Feature({
    geometry: new ol.geom.Polygon.fromExtent(overviewExtent)
  })
  
  extentSource.addFeature(extentFeature)
}

// 同步主地图和鹰眼的视图
const syncViews = () => {
  if (overviewMap.value && mapStore.map) {
    const mainView = mapStore.map.getView()
    const overviewView = overviewMap.value.getView()
    
    // 同步中心点和缩放级别
    overviewView.setCenter(mainView.getCenter())
    overviewView.setZoom(Math.max(2, mainView.getZoom() - 4)) // 鹰眼显示更大范围
    
    // 更新视口框
    updateExtentBox()
  }
}

// 初始化鹰眼
const initOverviewMap = async () => {
  if (!mapStore.map || !overviewMapElement.value) {
    console.warn('鹰眼初始化条件不满足，地图或容器未准备好')
    return
  }

  try {
    const ol = window.ol
    
    // 确保容器可见
    if (overviewMapElement.value.style.display === 'none') {
      overviewMapElement.value.style.display = 'block'
    }
    
    // 创建鹰眼的地图实例 - 使用与主地图相同的方法
    const currentBaseMapUrl = getCurrentBaseMapUrl(themeStore.theme)
    
    const sourceConfig: any = {
      url: currentBaseMapUrl,
      serverType: 'iserver'
    }
    
    if (themeStore.theme === 'light') {
      sourceConfig.crossOrigin = 'anonymous'
      sourceConfig.tileLoadFunction = undefined
    }
    
    const overviewlayer = new ol.layer.Tile({
      source: new ol.source.TileSuperMapRest(sourceConfig),
      visible: true,
      opacity: 0.8 // 降低透明度，让视口框更明显
    })
    
    // 创建与主地图相同的分辨率配置
    const resolutions: number[] = [];
    for (let i = 0; i < 19; i++) {
        resolutions[i] = 180 / 256 / Math.pow(2, i);
    }
    
    // 创建鹰眼视图 - 使用与主地图相同的配置
    const overviewView = new ol.View({
      projection: mapStore.mapConfig.projection,
      resolutions: resolutions, // 添加分辨率配置
      center: mapStore.mapConfig.center,
      zoom: 4, // 鹰眼显示更大范围，更符合鹰眼定义
      maxZoom: 8, // 限制最大缩放，保持鹰眼的概览特性
      minZoom: 2 // 设置最小缩放，确保能看到足够大的范围
    })
    
    // 创建鹰眼
    overviewMap.value = new ol.Map({
      target: overviewMapElement.value,
      layers: [overviewlayer],
      view: overviewView,
      controls: [], // 鹰眼不需要控件
    })
    
    // 获取视口框颜色
    const extentColor = getComputedStyle(document.documentElement).getPropertyValue('--overview-extent-color').trim() || '#000000'
    const extentRgb = getComputedStyle(document.documentElement).getPropertyValue('--overview-extent-rgb').trim() || '0, 0, 0'
    
    // 添加主地图视口框图层到鹰眼
    extentlayer.value = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: extentColor,
          width: 3, // 增加线条宽度
          lineDash: [5, 5] // 添加虚线效果，更明显
        }),
        fill: new ol.style.Fill({
          color: `rgba(${extentRgb}, 0.2)` // 增加填充透明度
        })
      })
    })
    overviewMap.value.addLayer(extentlayer.value)
    
        // 监听主地图视图变化
    mapStore.map.getView().on('change:center', syncViews)
    mapStore.map.getView().on('change:resolution', syncViews)
    
    // 监听主题变化，重新初始化鹰眼
    const handleThemeChange = () => {
      if (overviewMap.value) {
        // 重新获取视口框颜色
        const newExtentColor = getComputedStyle(document.documentElement).getPropertyValue('--overview-extent-color').trim() || '#000000'
        const newExtentRgb = getComputedStyle(document.documentElement).getPropertyValue('--overview-extent-rgb').trim() || '0, 0, 0'
        
        extentlayer.value.setStyle(new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: newExtentColor,
            width: 3,
            lineDash: [5, 5]
          }),
          fill: new ol.style.Fill({
            color: `rgba(${newExtentRgb}, 0.2)`
          })
        }))
        
        // 强制重绘
        extentlayer.value.changed()
      }
    }
    
    // 监听主题变化
    themeObserver = new MutationObserver(handleThemeChange)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    
    // 添加鹰眼点击导航功能
    overviewMap.value.on('click', (event: any) => {
      if (!mapStore.map) return
      
      const coordinate = event.coordinate
      const mainView = mapStore.map.getView()
      const overviewView = overviewMap.value.getView()
      
      // 将鹰眼坐标转换到主地图坐标系
      const mainCoordinate = ol.proj.transform(coordinate, overviewView.getProjection(), mainView.getProjection())
      
      // 导航到点击位置
      mainView.animate({
        center: mainCoordinate,
        duration: 500
      })
      
      // 显示提示信息
      console.log('鹰眼导航: 已跳转到点击位置')
    })
    
    // 添加鹰眼拖拽导航功能
    const dragPan = new ol.interaction.DragPan({
      condition: ol.events.condition.always
    })
    
    dragPan.on('panend', () => {
      if (!mapStore.map) return
      
      const overviewView = overviewMap.value.getView()
      const mainView = mapStore.map.getView()
      
      // 获取鹰眼中心点
      const overviewCenter = overviewView.getCenter()
      
      // 转换到主地图坐标系
      const mainCenter = ol.proj.transform(overviewCenter, overviewView.getProjection(), mainView.getProjection())
      
      // 导航到新位置
      mainView.animate({
        center: mainCenter,
        duration: 300
      })
    })
    
    overviewMap.value.addInteraction(dragPan)
    
    // 初始同步
    nextTick(() => {
      try {
        overviewMap.value.updateSize()
        syncViews()
        console.log('鹰眼初始化完成')
      } catch (error) {
        console.error('鹰眼初始同步失败:', error)
      }
    })
    
  } catch (error) {
    console.error('鹰眼初始化失败:', error)
  }
}

// 销毁鹰眼地图实例
const destroyOverviewMap = () => {
  if (overviewMap.value) {
    try {
      // 移除事件监听
      if (mapStore.map) {
        const mainView = mapStore.map.getView()
        mainView.un('change:center', syncViews)
        mainView.un('change:resolution', syncViews)
      }
      
      // 清理主题变化观察器
      if (themeObserver) {
        themeObserver.disconnect()
        themeObserver = null
      }
      
      // 清理地图实例
      overviewMap.value.setTarget(undefined)
      overviewMap.value = null
      
      // 清理视口框图层
      extentlayer.value = null
      
      console.log('鹰眼地图实例已销毁')
    } catch (error) {
      console.error('销毁鹰眼地图实例失败:', error)
    }
  }
}

// 监听鹰眼显示状态变化
watch(() => mapStore.overviewMapVisible, (visible) => {
  console.log('鹰眼显示状态变化:', visible)
  
  if (visible) {
    // 延迟初始化，确保DOM已更新
    setTimeout(() => {
      if (!overviewMap.value) {
        console.log('鹰眼地图实例不存在，开始初始化')
        initOverviewMap()
      } else {
        console.log('鹰眼地图实例已存在，更新尺寸')
        try { 
          overviewMap.value.updateSize() 
          // 显示后立即同步一次视口
          syncViews()
        } catch (e) {
          console.warn('鹰眼地图更新尺寸失败，重新初始化:', e)
          // 如果更新失败，重新初始化
          destroyOverviewMap()
          setTimeout(() => {
            initOverviewMap()
          }, 100)
        }
      }
    }, 50)
  } else {
    // 隐藏时清理地图实例
    console.log('隐藏鹰眼，清理地图实例')
    destroyOverviewMap()
  }
})

// 重建鹰眼图层的函数
const rebuildOverviewlayer = () => {
  if (!overviewMap.value) return
  
  try {
    const ol = window.ol
    // 使用与主地图相同的方法
    const currentBaseMapUrl = getCurrentBaseMapUrl(themeStore.theme)
    
    // 创建新的底图源 - 使用与主地图相同的方法
    const sourceConfig: any = {
      url: currentBaseMapUrl,
      serverType: 'iserver'
    }
    
    if (themeStore.theme === 'light') {
      sourceConfig.crossOrigin = 'anonymous'
      sourceConfig.tileLoadFunction = undefined
    }
    
    const newSource = new ol.source.TileSuperMapRest(sourceConfig)
    
    // 创建新图层
    const newlayer = new ol.layer.Tile({
      source: newSource,
      visible: true
    })
    
    // 获取当前图层集合
    const layers = overviewMap.value.getLayers()
    
    // 移除旧图层（保留视口框图层）
    if (layers.getLength() > 1) {
      layers.removeAt(0)
    }
    
    // 添加新图层
    layers.insertAt(0, newlayer)
    
    // 强制刷新地图
    overviewMap.value.updateSize()
    
    // 重新同步视图和视口框
    const syncViews = () => {
      if (overviewMap.value && mapStore.map) {
        const mainView = mapStore.map.getView()
        const overviewView = overviewMap.value.getView()
        
        // 同步中心点和缩放级别
        overviewView.setCenter(mainView.getCenter())
        overviewView.setZoom(Math.max(2, mainView.getZoom() - 4)) // 鹰眼显示更大范围
        
        // 更新视口框
        setTimeout(() => updateExtentBox(), 50)
      }
    }
    
    // 延迟执行同步，确保新图层已加载
    setTimeout(syncViews, 100)
    
  } catch (error) {
    console.error('重建鹰眼图层失败:', error)
  }
}

// 监听主题变化
watch(() => themeStore.theme, () => {
  if (overviewMap.value) {
    // 直接重建鹰眼图层，这是最可靠的方式
    rebuildOverviewlayer()
  }
}, { immediate: false })

// 监听地图就绪状态
watch(() => mapStore.isMapReady, (ready) => {
  if (ready && !overviewMap.value && mapStore.overviewMapVisible) {
    nextTick(() => {
      initOverviewMap()
    })
  }
})

// 生命周期
onMounted(() => {
  if (mapStore.isMapReady && mapStore.overviewMapVisible) {
    nextTick(() => {
      initOverviewMap()
    })
  }
})

onUnmounted(() => {
  destroyOverviewMap()
})
</script>

<style scoped>
.overview-map-container {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  overflow: hidden;
  /* 禁用过渡动画，防止主题切换闪烁 */
  transition: none !important;
}

/* 防闪烁类 - 禁用所有过渡和动画 */
.no-theme-flicker,
.no-theme-flicker *,
.no-theme-flicker *::before,
.no-theme-flicker *::after {
  transition: none !important;
  animation: none !important;
}

.overview-map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  min-width: 240px;
  /* 禁用过渡动画 */
  transition: none !important;
}

.overview-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  user-select: none;
}



.overview-map {
  width: 240px;
  height: 160px;
  /* 禁用过渡动画 */
  transition: none !important;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px var(--border);
  cursor: pointer;
}

.overview-map:hover {
  box-shadow: inset 0 0 0 2px var(--accent);
}

/* Openlayers 鹰眼样式覆盖 */
.overview-map :deep(.ol-viewport) {
  border-radius: 4px;
}

.overview-map :deep(.ol-canvas) {
  border-radius: 4px;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .overview-map-container {
    top: 8px;
    right: 8px;
  }
  
  .overview-map {
    width: 180px;
    height: 120px;
  }
  
  .overview-map-header {
    min-width: 180px;
    padding: 6px 10px;
  }
  
  .overview-title {
    font-size: 12px;
  }
  
  .overview-toggle-btn {
    width: 24px;
    height: 24px;
  }
}
</style>
