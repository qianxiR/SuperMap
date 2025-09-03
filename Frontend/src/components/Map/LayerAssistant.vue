<template>
  <div class="layer-assistant">
    <button 
      class="assistant-btn zoom-in" 
      @click="zoomIn"
      title="放大"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>
    <button 
      class="assistant-btn zoom-out" 
      @click="zoomOut"
      title="缩小"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 13H5v-2h14v2z"/>
      </svg>
    </button>
    
    <!-- 鹰眼按钮 -->
    <button 
      @click="toggleOverviewMap" 
      :class="['assistant-btn overview-btn', { active: mapStore.overviewMapVisible }]"
      :title="mapStore.overviewMapVisible ? '隐藏鹰眼' : '显示鹰眼'"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>
    </button>
    
    <button 
      @click="toggleDistanceMeasure" 
      :class="['assistant-btn measure-btn', { active: mapStore.distanceMeasureMode }]"
      :title="mapStore.distanceMeasureMode ? '停止距离量算' : '开始距离量算'"
    >
      <svg class="measure-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18"/>
        <path d="M3 8h2"/>
        <path d="M3 16h2"/>
        <path d="M7 8h2"/>
        <path d="M7 16h2"/>
        <path d="M11 8h2"/>
        <path d="M11 16h2"/>
        <path d="M15 8h2"/>
        <path d="M15 16h2"/>
        <path d="M19 8h2"/>
        <path d="M19 16h2"/>
        <circle cx="6" cy="12" r="1" fill="currentColor"/>
        <circle cx="18" cy="12" r="1" fill="currentColor"/>
      </svg>
    </button>
    
    <!-- 面积测量按钮 -->
    <button 
      @click="toggleAreaMeasure" 
      :class="['assistant-btn area-measure-btn', { active: mapStore.areaMeasureMode }]"
      :title="mapStore.areaMeasureMode ? '停止面积量算' : '开始面积量算'"
    >
      <svg class="area-measure-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h18v18H3z"/>
        <path d="M6 6h12v12H6z" fill="currentColor" opacity="0.2"/>
        <path d="M6 6h12"/>
        <path d="M6 12h12"/>
        <path d="M6 18h12"/>
        <path d="M6 6v12"/>
        <path d="M12 6v12"/>
        <path d="M18 6v12"/>
        <circle cx="9" cy="9" r="1" fill="currentColor"/>
        <circle cx="15" cy="15" r="1" fill="currentColor"/>
      </svg>
    </button>
    
    <!-- 绘制工具分隔线 -->
    <div class="tool-separator"></div>
    
    <!-- 绘制工具按钮 -->
    <button 
      @click="startDraw('Point')" 
      :class="['assistant-btn draw-btn', { active: currentDrawType === 'Point' }]"
      title="绘制点"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
    <button 
      @click="startDraw('LineString')" 
      :class="['assistant-btn draw-btn', { active: currentDrawType === 'LineString' }]"
      title="绘制线"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12l6-6 6 6 6-6"/>
      </svg>
    </button>
    <button 
      @click="startDraw('Polygon')" 
      :class="['assistant-btn draw-btn', { active: currentDrawType === 'Polygon' }]"
      title="绘制面"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3z"/>
      </svg>
    </button>

    <button 
      @click="clearDrawFeatures" 
      class="assistant-btn clear-btn"
      title="清除绘制内容"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  </div>
  
  <!-- 确认对话框 -->
  <ConfirmDialog
    :visible="layerManager.confirmDialogVisible.value"
    :title="layerManager.confirmDialogConfig.value.title"
    :message="layerManager.confirmDialogConfig.value.message"
    confirm-text="保存为图层"
    cancel-text="直接清除"
    @confirm="layerManager.handleConfirmDialogConfirm"
    @cancel="layerManager.handleConfirmDialogCancel"
    @close="layerManager.handleConfirmDialogClose"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'

const mapStore = useMapStore()
const analysisStore = useAnalysisStore()
const layerManager = useLayerManager()

// 绘制相关状态
const draw = ref<any>(null)
const drawSource = ref<any>(null)
const drawLayer = ref<any>(null)
const currentDrawType = ref<string | null>('None')
let themeObserver: MutationObserver | null = null // 主题变化观察器

const ol = window.ol

const zoomIn = () => {
  if (mapStore.map) {
    const view = mapStore.map.getView()
    const zoom = view.getZoom()
    view.animate({
      zoom: zoom + 1,
      duration: 250
    })
  }
}

const zoomOut = () => {
  if (mapStore.map) {
    const view = mapStore.map.getView()
    const zoom = view.getZoom()
    view.animate({
      zoom: zoom - 1,
      duration: 250
    })
  }
}

const toggleDistanceMeasure = () => {
  if (mapStore.distanceMeasureMode) {
    // 停止距离测量
    mapStore.stopDistanceMeasure()
    analysisStore.setDistanceMeasureMode(false)
  } else {
    // 如果面积测量正在运行，先停止它
    if (mapStore.areaMeasureMode) {
      mapStore.stopAreaMeasure()
      analysisStore.setAreaMeasureMode(false)
    }
    // 启动距离测量
    mapStore.startDistanceMeasure()
    analysisStore.setDistanceMeasureMode(true)
  }
}

const toggleOverviewMap = () => {
  mapStore.toggleOverviewMap()
}

const toggleAreaMeasure = () => {
  if (mapStore.areaMeasureMode) {
    // 停止面积测量
    mapStore.stopAreaMeasure()
    analysisStore.setAreaMeasureMode(false)
  } else {
    // 如果距离测量正在运行，先停止它
    if (mapStore.distanceMeasureMode) {
      mapStore.stopDistanceMeasure()
      analysisStore.setDistanceMeasureMode(false)
    }
    // 启动面积测量
    mapStore.startAreaMeasure()
    analysisStore.setAreaMeasureMode(true)
  }
}

// 更新绘制图层样式的函数
const updateDrawLayerStyle = () => {
  if (!drawLayer.value) return
  
  try {
    const ol = window.ol
    
    // 重新获取绘制线条颜色 - 使用专门的绘制颜色变量
    const drawColor = getComputedStyle(document.documentElement).getPropertyValue('--draw-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000')
    const drawRgb = getComputedStyle(document.documentElement).getPropertyValue('--draw-rgb').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '255, 255, 255' : '0, 0, 0')
    
    console.log('更新绘制图层样式，颜色:', drawColor, 'RGB:', drawRgb)
    
    // 创建新样式
    const newStyle = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: drawColor,
        width: 3,
        lineCap: 'round',
        lineJoin: 'round'
      }),
      fill: new ol.style.Fill({
        color: `rgba(${drawRgb}, 0.1)`
      }),
              image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({
            color: drawColor
          }),
          stroke: new ol.style.Stroke({
            color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
            width: 2
          })
        })
    })
    
    // 设置新样式
    drawLayer.value.setStyle(newStyle)
    
    // 强制重绘
    drawLayer.value.changed()
    
    console.log('绘制图层样式更新完成')
  } catch (error) {
    console.error('更新绘制图层样式失败:', error)
  }
}

// 监听主题变化的函数
const handleThemeChange = () => {
  console.log('检测到主题变化，更新绘制图层样式')
  updateDrawLayerStyle()
}

// 初始化主题变化监听
const initThemeObserver = () => {
  if (themeObserver) {
    themeObserver.disconnect()
  }
  
  themeObserver = new MutationObserver(handleThemeChange)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
  
  console.log('主题变化监听器已初始化')
}

// 清理主题变化监听
const cleanupThemeObserver = () => {
  if (themeObserver) {
    themeObserver.disconnect()
    themeObserver = null
    console.log('主题变化监听器已清理')
  }
}

// 初始化绘制图层
const initDrawLayer = () => {
  console.log('开始初始化绘制图层...')
  console.log('地图实例:', mapStore.map)
  
  if (!mapStore.map) {
    console.warn('地图实例未准备好，延迟重试...')
    setTimeout(initDrawLayer, 1000)
    return
  }
  
  if (!window.ol) {
    console.error('OpenLayers库未加载')
    return
  }
  
  try {
    // 创建绘制数据源
    drawSource.value = new ol.source.Vector({ wrapX: false })
    console.log('绘制数据源创建成功:', drawSource.value)
    
    // 获取绘制线条颜色 - 使用专门的绘制颜色变量
    const drawColor = getComputedStyle(document.documentElement).getPropertyValue('--draw-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000')
    const drawRgb = getComputedStyle(document.documentElement).getPropertyValue('--draw-rgb').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '255, 255, 255' : '0, 0, 0')
    
    console.log('初始化绘制图层，颜色:', drawColor, 'RGB:', drawRgb)
    
    // 创建绘制图层
    drawLayer.value = new ol.layer.Vector({
      source: drawSource.value,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: drawColor,
          width: 3,
          lineCap: 'round',
          lineJoin: 'round'
        }),
        fill: new ol.style.Fill({
          color: `rgba(${drawRgb}, 0.1)`
        }),
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({
            color: drawColor
          }),
          stroke: new ol.style.Stroke({
            color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
            width: 2
          })
        })
      })
    })
    
    // 设置绘制图层标识
    drawLayer.value.set('isDrawLayer', true)
    console.log('绘制图层创建成功:', drawLayer.value)
    
    // 添加到地图
    mapStore.map.addLayer(drawLayer.value)
    console.log('绘制图层已添加到地图')
    
    // 初始化主题变化监听
    initThemeObserver()
    
  } catch (error) {
    console.error('初始化绘制图层失败:', error)
  }
}

// 开始绘制
const startDraw = (type: 'Point' | 'LineString' | 'Polygon') => {
  console.log('开始绘制，类型:', type)
  console.log('地图实例:', mapStore.map)
  console.log('绘制数据源:', drawSource.value)
  
  if (!mapStore.map) {
    console.error('地图实例未准备好')
    return
  }
  
  // 检查是否处于测量模式，如果是则不允许绘制
  if (mapStore.distanceMeasureMode || mapStore.areaMeasureMode) {
    console.warn('当前处于测量模式，无法启动绘制工具')
    return
  }
  
  if (!drawSource.value) {
    console.error('绘制数据源未初始化，重新初始化...')
    initDrawLayer()
    setTimeout(() => startDraw(type), 100)
    return
  }
  
  // 如果点击的是当前激活的绘制类型，则停止绘制
  if (currentDrawType.value === type) {
    console.log('停止当前绘制模式')
    stopDraw()
    return
  }
  
  // 清除现有绘制交互
  clearDrawInteraction()
  
  try {
    // 创建新的绘制交互
    draw.value = new ol.interaction.Draw({
      source: drawSource.value,
      type: type,
      snapTolerance: 20
    })
    console.log('绘制交互创建成功:', draw.value)
    
    // 添加到地图
    mapStore.map.addInteraction(draw.value)
    console.log('绘制交互已添加到地图')
    
    // 更新当前绘制类型
    currentDrawType.value = type
    
    // 同步绘制模式状态到 analysisStore
    analysisStore.setDrawMode(type)
    
    // 更新鼠标样式
    const targetElement = mapStore.map.getTargetElement()
    targetElement.style.cursor = 'crosshair'
    
    console.log('绘制模式已激活:', type)
    
  } catch (error) {
    console.error('创建绘制交互失败:', error)
  }
}

// 停止绘制
const stopDraw = () => {
  clearDrawInteraction()
  currentDrawType.value = 'None'
  
  // 同步绘制模式状态到 analysisStore
  analysisStore.setDrawMode('')
  
  // 恢复鼠标样式
  if (mapStore.map) {
    const targetElement = mapStore.map.getTargetElement()
    targetElement.style.cursor = 'default'
  }
}

// 清除绘制交互
const clearDrawInteraction = () => {
  if (draw.value && mapStore.map) {
    mapStore.map.removeInteraction(draw.value)
    draw.value = null
  }
}

// 清除绘制内容
const clearDrawFeatures = () => {
  if (drawSource.value) {
    const features = drawSource.value.getFeatures()
    
    // 检查是否有绘制内容
    if (features.length > 0) {
      // 显示确认对话框询问是否保存
      layerManager.showConfirmDialog(
        '保存绘制内容',
        `您已绘制了 ${features.length} 个要素，是否要保存为图层？`,
        async () => {
          // 用户确认保存
          console.log('用户确认保存绘制内容')
          const success = await layerManager.saveDrawAsLayer()
          if (success) {
            console.log('绘制内容保存成功')
            stopDraw()
          }
        },
        () => {
          // 用户取消，直接清除
          console.log('用户取消保存，直接清除绘制内容')
          drawSource.value.clear()
          stopDraw()
        }
      )
    } else {
      // 没有绘制内容，直接清除
      drawSource.value.clear()
      stopDraw()
    }
  } else {
    stopDraw()
  }
}

// 清理绘制图层
const cleanupDrawLayer = () => {
  console.log('清理绘制图层...')
  
  // 清理主题变化监听
  cleanupThemeObserver()
  
  // 清除绘制交互
  clearDrawInteraction()
  
  // 清除绘制图层
  if (drawLayer.value && mapStore.map) {
    try {
      mapStore.map.removeLayer(drawLayer.value)
      drawLayer.value = null
      console.log('绘制图层已移除')
    } catch (error) {
      console.error('移除绘制图层失败:', error)
    }
  }
  
  // 清除绘制数据源
  if (drawSource.value) {
    try {
      drawSource.value.clear()
      drawSource.value = null
      console.log('绘制数据源已清理')
    } catch (error) {
      console.error('清理绘制数据源失败:', error)
    }
  }
  
  // 重置当前绘制类型
  currentDrawType.value = null
  
  console.log('绘制图层清理完成')
}

// 组件挂载时初始化
onMounted(() => {
  console.log('LayerAssistant组件已挂载')
  
  // 延迟初始化，确保地图已准备好
  setTimeout(() => {
    if (mapStore.isMapReady) {
      initDrawLayer()
    }
  }, 1000)
})

// 组件卸载时清理
onUnmounted(() => {
  console.log('LayerAssistant组件即将卸载')
  cleanupDrawLayer()
})
</script>

<style scoped>
.layer-assistant {
  position: absolute;
  top: 16px;
  left: 16px;
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

.assistant-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--panel);
  color: var(--text);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.assistant-btn:hover {
  background: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.assistant-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.assistant-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.assistant-btn:disabled:hover {
  background: var(--panel);
  color: var(--text);
  box-shadow: none;
}

.measure-btn.active {
  background: var(--accent);
  color: white;
}

.draw-btn.active {
  background: var(--accent);
  color: white;
}

.overview-btn.active {
  background: var(--accent);
  color: white;
}

.area-measure-btn.active {
  background: var(--accent);
  color: white;
}

.clear-btn:hover {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
}

.tool-separator {
  height: 1px;
  background: var(--border);
  margin: 2px 0;
  flex-shrink: 0;
}

.measure-icon {
  width: 16px;
  height: 16px;
}

.area-measure-icon {
  width: 16px;
  height: 16px;
}
</style>
