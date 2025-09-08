<template>
  <div class="layer-assistant">
    <!-- 图层组 -->
    <BaseButton 
      variant="assistant"
      size="medium"
      icon="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
      title="放大"
      @click="zoomIn"
    />
    <BaseButton 
      variant="assistant"
      size="medium"
      icon="M19 13H5v-2h14v2z"
      title="缩小"
      @click="zoomOut"
    />
    
    <!-- 鹰眼按钮 -->
    <BaseButton 
      variant="assistant"
      size="medium"
      :icon="getEyeIcon()"
      :title="mapStore.overviewMapVisible ? '隐藏鹰眼' : '显示鹰眼'"
      :active="mapStore.overviewMapVisible"
      @click="toggleOverviewMap"
    />

    <!-- 图层管理按钮 - 仅在view页面显示 -->
    <BaseButton 
      v-if="!isManagementPage"
      variant="assistant"
      size="medium"
      icon="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
      :title="route.path === '/dashboard/view/home/layermanage' ? '关闭图层管理' : '打开图层管理'"
      :active="route.path === '/dashboard/view/home/layermanage'"
      @click="toggleLayerManager"
    />

    <!-- 编辑组分隔线 -->
    <div class="tool-separator"></div>
    
    <!-- 编辑组 -->
    <BaseButton 
      variant="assistant"
      size="medium"
      icon="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
      title="绘制点"
      :active="currentDrawType === 'Point'"
      @click="startDraw('Point')"
    />
    <BaseButton 
      variant="assistant"
      size="medium"
      icon="M3 12l6-6 6 6 6-6"
      title="绘制线"
      :active="currentDrawType === 'LineString'"
      @click="startDraw('LineString')"
    />
    <BaseButton 
      variant="assistant"
      size="medium"
      :icon="getPolygonIcon()"
      title="绘制面"
      :active="currentDrawType === 'Polygon'"
      @click="startDraw('Polygon')"
    />
    
    <BaseButton 
      variant="assistant"
      size="medium"
      icon="M3 12h18M3 8h2M3 16h2M7 8h2M7 16h2M11 8h2M11 16h2M15 8h2M15 16h2M19 8h2M19 16h2M6 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
      :title="mapStore.distanceMeasureMode ? '停止距离量算' : '开始距离量算'"
      :active="mapStore.distanceMeasureMode"
      @click="toggleDistanceMeasure"
    />
    
    <!-- 面积测量按钮 -->
    <BaseButton 
      variant="assistant"
      size="medium"
      :icon="getAreaMeasureIcon()"
      :title="mapStore.areaMeasureMode ? '停止面积量算' : '开始面积量算'"
      :active="mapStore.areaMeasureMode"
      @click="toggleAreaMeasure"
    />
    
    <!-- 清除绘制内容按钮 - 仅在绘制模式下显示 -->
    <BaseButton 
      v-if="currentDrawType && currentDrawType !== 'None'"
      variant="assistant"
      size="medium"
      icon="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      title="清除绘制内容"
      @click="clearDrawFeatures"
    />
  </div>



  
  <!-- 确认对话框 -->
  <ConfirmDialog
    :visible="layermanager.confirmDialogVisible.value"
    :title="layermanager.confirmDialogConfig.value.title"
    :message="layermanager.confirmDialogConfig.value.message"
    confirm-text="保存为图层"
    cancel-text="直接清除"
    @confirm="layermanager.handleConfirmDialogConfirm"
    @cancel="layermanager.handleConfirmDialogCancel"
    @close="layermanager.handleConfirmDialogClose"
  />

  <!-- 图层名称输入对话框 -->
  <LayerNameModal
    :visible="LayerNameModalVisible"
    title="保存绘制图层"
    placeholder="请输入图层名称"
    :hint="layerNameHint"
    :default-name="defaultlayerName"
    @confirm="handlelayerNameConfirm"
    @close="handlelayerNameClose"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { uselayermanager } from '@/composables/uselayermanager'
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue'
import LayerNameModal from '@/components/UI/LayerNameModal.vue'
import BaseButton from '@/components/UI/BaseButton.vue'
import { createLayerStyle } from '@/utils/styleUtils'
import { safeAddEventListener, createWindowEventHandler } from '@/utils/eventUtils'
import { getCurrentTheme } from '@/utils/themeUtils'

const route = useRoute()
const router = useRouter()
const mapStore = useMapStore()
const analysisStore = useAnalysisStore()
const layermanager = uselayermanager()

// 绘制相关状态
const draw = ref<any>(null)
const drawSource = ref<any>(null)
const drawlayer = ref<any>(null)
const currentDrawType = ref<string | null>('None')
let themeObserver: MutationObserver | null = null // 主题变化观察器

// 图层管理相关状态
const layerManagerVisible = ref(false)

// 判断是否在大屏界面（view页面）
const isViewPage = computed(() => {
  return route.name === 'view-home'
})

// 判断是否在管理分析页面
const isManagementPage = computed(() => {
  return route.path.includes('/dashboard/management-analysis')
})

// 图层名称输入相关状态
const LayerNameModalVisible = ref(false)
const pendingDrawSave = ref<(() => Promise<void>) | null>(null)

// 生成默认图层名称
const defaultlayerName = computed(() => {
  if (!drawSource.value) return ''
  
  const features = drawSource.value.getFeatures()
  if (features.length === 0) return ''
  
  const geometryTypes = new Set<string>()
  features.forEach((feature: any) => {
    const geometry = feature.getGeometry()
    if (geometry) {
      geometryTypes.add(geometry.getType())
    }
  })
  
  const timestamp = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/[\/\s:]/g, '')
  
  if (geometryTypes.size === 1) {
    const type = Array.from(geometryTypes)[0]
    switch (type) {
      case 'Point':
        return `绘制点_${timestamp}`
      case 'LineString':
        return `绘制线_${timestamp}`
      case 'Polygon':
        return `绘制面_${timestamp}`
      default:
        return `绘制图层_${timestamp}`
    }
  } else {
    return `绘制图层_${timestamp}`
  }
})

// 图层名称提示信息
const layerNameHint = computed(() => {
  if (!drawSource.value) return '图层名称不能为空'
  
  const features = drawSource.value.getFeatures()
  if (features.length === 0) return '图层名称不能为空'
  
  const geometryTypes = new Set<string>()
  features.forEach((feature: any) => {
    const geometry = feature.getGeometry()
    if (geometry) {
      geometryTypes.add(geometry.getType())
    }
  })
  
  const typeNames = Array.from(geometryTypes).map(type => {
    switch (type) {
      case 'Point': return '点'
      case 'LineString': return '线'
      case 'Polygon': return '面'
      default: return type
    }
  }).join('、')
  
  return `将保存 ${features.length} 个${typeNames}要素`
})

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
    // 关闭其他所有功能
    closeAllOtherFeatures()
    
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
    // 关闭其他所有功能
    closeAllOtherFeatures()
    
    // 启动面积测量
    mapStore.startAreaMeasure()
    analysisStore.setAreaMeasureMode(true)
  }
}

const toggleLayerManager = () => {
  // 在管理分析页面中不执行图层管理逻辑
  if (isManagementPage.value) {
    return
  }
  
  // 如果当前已经在图层管理路由，则返回到父路由
  if (route.path === '/dashboard/view/home/layermanage') {
    router.push('/dashboard/view/home')
  } else {
    // 否则跳转到图层管理路由
    router.push('/dashboard/view/home/layermanage')
  }
}

// 关闭所有其他功能的函数
const closeAllOtherFeatures = () => {
  // 关闭图层管理面板
  layerManagerVisible.value = false
  
  // 停止距离测量
  if (mapStore.distanceMeasureMode) {
    mapStore.stopDistanceMeasure()
    analysisStore.setDistanceMeasureMode(false)
  }
  
  // 停止面积测量
  if (mapStore.areaMeasureMode) {
    mapStore.stopAreaMeasure()
    analysisStore.setAreaMeasureMode(false)
  }
  
  // 停止绘制
  if (currentDrawType.value && currentDrawType.value !== 'None') {
    stopDraw()
  }
}

// 更新绘制图层样式的函数
const updateDrawlayerStyle = () => {
  if (!drawlayer.value) return
  
  try {
    console.log('更新绘制图层样式...')
    
    // 使用统一的样式创建工具
    const newStyle = createLayerStyle('draw')
    
    // 设置新样式
    drawlayer.value.setStyle(newStyle)
    
    // 强制重绘
    drawlayer.value.changed()
    
    console.log('绘制图层样式更新完成')
  } catch (error) {
    console.error('更新绘制图层样式失败:', error)
  }
}

// 移除主题变化监听，由useMap统一管理
// 避免多个组件重复监听主题变化导致性能问题

// 初始化绘制图层
const initDrawlayer = () => {
  console.log('开始初始化绘制图层...')
  console.log('地图实例:', mapStore.map)
  console.log('地图准备状态:', mapStore.isMapReady)
  
  if (!mapStore.map || !mapStore.isMapReady) {
    console.warn('地图实例未准备好或未就绪，延迟重试...')
    setTimeout(initDrawlayer, 1000)
    return
  }
  
  if (!window.ol) {
    console.error('Openlayers库未加载')
    return
  }
  
  try {
    // 创建绘制数据源
    drawSource.value = new ol.source.Vector({ wrapX: false })
    console.log('绘制数据源创建成功:', drawSource.value)
    
    console.log('初始化绘制图层...')
    
    // 使用统一的样式创建工具
    const drawStyle = createLayerStyle('draw')
    
    // 创建绘制图层
    drawlayer.value = new ol.layer.Vector({
      source: drawSource.value,
      style: drawStyle
    })
    
    // 设置绘制图层标识
    drawlayer.value.set('isDrawlayer', true)
    console.log('绘制图层创建成功:', drawlayer.value)
    
    // 添加到地图
    mapStore.map.addLayer(drawlayer.value)
    console.log('绘制图层已添加到地图')
    
  } catch (error) {
    console.error('初始化绘制图层失败:', error)
  }
}

// 开始绘制
const startDraw = (type: 'Point' | 'LineString' | 'Polygon') => {
  console.log('开始绘制，类型:', type)
  console.log('地图实例:', mapStore.map)
  console.log('地图准备状态:', mapStore.isMapReady)
  console.log('绘制数据源:', drawSource.value)
  
  if (!mapStore.map || !mapStore.isMapReady) {
    console.error('地图实例未准备好或未就绪')
    return
  }
  
  // 检查是否处于测量模式，如果是则不允许绘制
  if (mapStore.distanceMeasureMode || mapStore.areaMeasureMode) {
    console.warn('当前处于测量模式，无法启动绘制工具')
    return
  }
  
  if (!drawSource.value) {
    console.error('绘制数据源未初始化，重新初始化...')
    initDrawlayer()
    setTimeout(() => {
      if (drawSource.value) {
        startDraw(type)
      } else {
        console.error('绘制数据源初始化失败，无法启动绘制')
      }
    }, 500)
    return
  }
  
  // 如果点击的是当前激活的绘制类型，则停止绘制
  if (currentDrawType.value === type) {
    console.log('停止当前绘制模式')
    stopDraw()
    return
  }
  
  // 关闭其他所有功能
  closeAllOtherFeatures()
  
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
      layermanager.showConfirmDialog(
        '保存绘制内容',
        `您已绘制了 ${features.length} 个要素，是否要保存为图层？`,
        () => {
          // 用户确认保存，显示图层名称输入对话框
          console.log('用户确认保存绘制内容，显示图层名称输入对话框')
          LayerNameModalVisible.value = true
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

// 处理图层名称确认
const handlelayerNameConfirm = async (layerName: string) => {
  console.log('用户输入图层名称:', layerName)
  LayerNameModalVisible.value = false
  
  try {
    const success = await layermanager.saveDrawAslayer(layerName)
    if (success) {
      console.log('绘制内容保存成功，图层名称:', layerName)
      stopDraw()
    } else {
      console.error('绘制内容保存失败')
    }
  } catch (error) {
    console.error('保存绘制内容时发生错误:', error)
  }
}

// 处理图层名称输入取消
const handlelayerNameClose = () => {
  console.log('用户取消图层名称输入')
  LayerNameModalVisible.value = false
}

// 清理绘制图层
const cleanupDrawlayer = () => {
  console.log('清理绘制图层...')
  
  // 清除绘制交互
  clearDrawInteraction()
  
  // 清除绘制图层
  if (drawlayer.value && mapStore.map) {
    try {
      mapStore.map.removeLayer(drawlayer.value)
      drawlayer.value = null
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
  console.log('layerAssistant组件已挂载')
  
  // 等待地图准备就绪后再初始化绘制图层
  const checkMapReady = () => {
    if (mapStore.map && mapStore.isMapReady) {
      console.log('地图已准备就绪，开始初始化绘制图层')
      initDrawlayer()
    } else {
      console.log('地图未准备就绪，延迟重试...')
      setTimeout(checkMapReady, 500)
    }
  }
  
  checkMapReady()
})

// 组件卸载时清理
onUnmounted(() => {
  console.log('layerAssistant组件即将卸载')
  cleanupDrawlayer()
})

// 图标处理方法
const getEyeIcon = () => {
  return {
    paths: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zM12 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }
}

const getPolygonIcon = () => {
  return {
    paths: "M3 3h18v18H3z",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }
}

const getAreaMeasureIcon = () => {
  return {
    paths: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }
}

// 暴露状态给父组件
defineExpose({
  layerManagerVisible
})
</script>

<style scoped>
.layer-assistant {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 4px;
  min-height: fit-content;
}

.tool-separator {
  height: 1px;
  background: var(--border);
  margin: 2px 0;
  flex-shrink: 0;
}
</style>
