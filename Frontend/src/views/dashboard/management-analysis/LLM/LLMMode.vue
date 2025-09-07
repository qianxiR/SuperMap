<template>
  <PanelContainer class="llm-panel">
    <div class="chat-container">
      <!-- 使用router-view渲染子路由 -->
      <router-view :map-ready="mapStore.isMapReady" />
    </div>
  </PanelContainer>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useModeStateStore } from '@/stores/modeStateStore'
import ChatAssistant from './tools/ChatAssistant.vue'
import PanelContainer from '@/components/UI/PanelContainer.vue'

const mapStore = useMapStore()
const modeStateStore = useModeStateStore()

// 组件生命周期管理
onMounted(() => {
  // 激活LLM模式，恢复状态
  modeStateStore.restoreModeState('llm')
})

onUnmounted(() => {
  // 组件卸载时保存状态（虽然通常不会卸载，但为了安全）
  // 状态保存由ChatAssistant组件内部处理
})
</script>

<style scoped>
.llm-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>