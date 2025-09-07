<template>
  <PanelContainer class="traditional-panel">
    <!-- 功能按钮容器 -->
    <div class="function-buttons-container">
      <div class="buttons-grid">
        <div class="button-row">
        
          <PrimaryButton text="图层管理" :active="isLayerOpen" @click="toggleLayerManager" />
          <PrimaryButton text="数据上传" :active="isUploadOpen" @click="toggleUpload" />
          <PrimaryButton text="按属性选择要素" :active="isQueryOpen" @click="toggleQuery" />
          <PrimaryButton text="按区域选择要素" :active="isAreaSelection" @click="toggleAreaSelection" />
        </div>
        <div class="button-row">
          <PrimaryButton text="缓冲区分析" :active="isBufferOpen" @click="toggleBuffer" />
          <PrimaryButton text="最短路径分析" :active="isDistanceOpen" @click="toggleDistance" />
          <PrimaryButton text="相交分析" :active="isIntersectOpen" @click="toggleIntersect" />
          <PrimaryButton text="擦除分析" :active="isEraseOpen" @click="toggleErase" />
        </div>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="content-section">
      <!-- 保持现有条件渲染逻辑 -->
      <FeatureQueryPanel v-if="analysisStore.toolPanel.activeTool === 'attribute-selection'" />
              <AreaSelectionTools v-if="analysisStore.toolPanel.activeTool === 'area-selection'" />
<ShortestPathAnalysisPanel v-if="analysisStore.toolPanel.activeTool === 'distance'" />
      <BufferAnalysisPanel v-if="analysisStore.toolPanel.activeTool === 'buffer'" />
      <IntersectionAnalysisPanel v-if="analysisStore.toolPanel.activeTool === 'intersect'" />
      <EraseAnalysisPanel v-if="analysisStore.toolPanel.activeTool === 'erase'" />
      <DataUploadPanel v-if="analysisStore.toolPanel.activeTool === 'upload'" />
      
      <LayerManager v-if="analysisStore.toolPanel.activeTool === 'layer'" />
      
      <!-- 新增：路由视图（不影响现有逻辑） -->
      <router-view v-if="isRouteMode" />
      
      <div v-if="!analysisStore.toolPanel.visible" class="default-content">
        <div class="welcome-message">
          <p>请从上方工具栏选择功能开始使用</p>
        </div>
      </div>
    </div>
  </PanelContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useModeStateStore } from '@/stores/modeStateStore'
import FeatureQueryPanel from '@/views/dashboard/management-analysis/traditional/tools/FeatureQueryPanel.vue'
import AreaSelectionTools from '@/views/dashboard/management-analysis/traditional/tools/AreaSelectionTools.vue'
import ShortestPathAnalysisPanel from '@/views/dashboard/management-analysis/traditional/tools/ShortestPathAnalysisPanel.vue'
import BufferAnalysisPanel from '@/views/dashboard/management-analysis/traditional/tools/BufferAnalysisPanel.vue'
import IntersectionAnalysisPanel from '@/views/dashboard/management-analysis/traditional/tools/IntersectionAnalysisPanel.vue'
import EraseAnalysisPanel from '@/views/dashboard/management-analysis/traditional/tools/EraseAnalysisPanel.vue'
import DataUploadPanel from '@/views/dashboard/management-analysis/traditional/tools/DataUploadPanel.vue'
import LayerManager from '@/views/dashboard/management-analysis/traditional/tools/LayerManager.vue'
import PrimaryButton from '@/components/UI/PrimaryButton.vue'
import PanelContainer from '@/components/UI/PanelContainer.vue'

const router = useRouter()
const route = useRoute()
const analysisStore = useAnalysisStore()
const modeStateStore = useModeStateStore()

// 工具配置对象
const toolConfigs = {
  layer: { id: 'layer', title: '图层管理', path: 'layer' },
  upload: { id: 'upload', title: '数据上传', path: 'upload' },
  'attribute-selection': { id: 'attribute-selection', title: '按属性选择要素', path: 'attribute-selection' },
  'area-selection': { id: 'area-selection', title: '按区域选择要素', path: 'area-selection' },
  buffer: { id: 'buffer', title: '缓冲区分析', path: 'buffer' },
  distance: { id: 'distance', title: '最短路径分析', path: 'distance' },
  intersect: { id: 'intersect', title: '相交分析', path: 'intersect' },
  erase: { id: 'erase', title: '擦除分析', path: 'erase' },
} as const

// 判断是否为路由模式
const isRouteMode = computed(() => {
  return route.path.includes('/traditional/') && route.path !== '/dashboard/management-analysis/traditional'
})

// 状态检查变量 - 修复：当在路由模式下，按钮状态应该基于当前路由路径判断
const isBufferOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/buffer')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'buffer'
})
const isLayerOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/layer')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'layer'
})
const isAreaSelection = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/area-selection')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'area-selection'
})
const isDistanceOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/distance')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'distance'
})
const isUploadOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/upload')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'upload'
})
const isQueryOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/attribute-selection')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'attribute-selection'
})
const isIntersectOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/intersect')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'intersect'
})
const isEraseOpen = computed(() => {
  if (isRouteMode.value) {
    return route.path.includes('/traditional/erase')
  }
  return analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'erase'
})

// 路由导航函数
const navigateToTool = (toolKey: keyof typeof toolConfigs) => {
  const config = toolConfigs[toolKey]
  const targetPath = `/dashboard/management-analysis/traditional/${config.path}`
  
  // 路由跳转
  router.push(targetPath)
  
  // 保持状态同步（向后兼容）
  analysisStore.openTool(config.id, config.title)
}

// 通用切换函数 - 改造为路由导航
const toggleTool = (toolKey: keyof typeof toolConfigs) => {
  const config = toolConfigs[toolKey]
  const isCurrentlyActive = analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === config.id
  
  if (isCurrentlyActive) {
    // 如果当前激活，关闭工具
    analysisStore.closeTool()
    router.push('/dashboard/management-analysis/traditional')
  } else {
    // 否则导航到对应工具，使用 switchTool 确保状态清理
    const prevTool = analysisStore.toolPanel.activeTool
    analysisStore.switchTool(config.id as any, prevTool)
    navigateToTool(toolKey)
  }
}

// 简化的切换函数
const toggleAreaSelection = () => toggleTool('area-selection')
const toggleBuffer = () => toggleTool('buffer')
const toggleLayerManager = () => toggleTool('layer')
const toggleDistance = () => toggleTool('distance')
const toggleUpload = () => toggleTool('upload')
const toggleQuery = () => toggleTool('attribute-selection')
const toggleIntersect = () => toggleTool('intersect')
const toggleErase = () => toggleTool('erase')

// 监听路由变化，同步到状态管理
watch(() => route.path, (newPath) => {
  const toolMatch = newPath.match(/\/traditional\/(\w+)/)
  if (toolMatch) {
    const pathSegment = toolMatch[1]
    // 根据路径找到对应的工具key
    const toolKey = Object.entries(toolConfigs).find(([, config]) => config.path === pathSegment)?.[0] as keyof typeof toolConfigs
    if (toolKey) {
      const config = toolConfigs[toolKey]
      const prevTool = analysisStore.toolPanel.activeTool
      // 使用 openTool 确保面板可见状态正确设置
      analysisStore.openTool(config.id, config.title)
      
      // 同步到模式状态管理
      modeStateStore.saveTraditionalState({
        activeTool: config.id
      })
    }
  }
}, { immediate: true })

// 监听状态变化，同步到路由
watch(() => analysisStore.toolPanel.activeTool, (newTool, oldTool) => {
  if (newTool && !isRouteMode.value) {
    const toolKey = Object.entries(toolConfigs).find(([, config]) => config.id === newTool)?.[0] as keyof typeof toolConfigs
    if (toolKey) {
      router.push(`/dashboard/management-analysis/traditional/${toolConfigs[toolKey].path}`)
      
      // 同步到模式状态管理
      modeStateStore.saveTraditionalState({
        activeTool: newTool
      })
    }
  }
})

// 当进入传统模式时，恢复状态
onMounted(() => {
  // 恢复传统模式状态
  modeStateStore.restoreModeState('traditional')
  
  // 延迟执行，确保组件已完全渲染
  setTimeout(() => {
    // 检查是否在传统模式路径下且没有激活的工具面板
    if (!analysisStore.toolPanel.visible && route.path.includes('/dashboard/management-analysis/traditional')) {
      // 默认打开图层管理
      const activeTool = 'layer'
      const toolTitle = '图层管理'
      
      // 打开图层管理工具
      analysisStore.openTool(activeTool as any, toolTitle)
      
      // 同步到模式状态管理
      modeStateStore.saveTraditionalState({
        activeTool: activeTool
      })
    }
  }, 100)
})
</script>

<style scoped>
.traditional-panel {
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.function-buttons-container {
  padding: 15px;
  background: var(--panel);
}

.buttons-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.button-row {
  display: flex;
  gap: 10px;
  justify-content: space-around;
}



.content-section {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.default-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.welcome-message {
  text-align: center;
  padding: 20px;
}

.welcome-message p {
  margin: 0;
  font-size: 14px;
  opacity: 0.7;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-section > * {
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}
</style>