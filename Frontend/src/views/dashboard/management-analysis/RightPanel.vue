<template>
  <PanelWindow 
    :visible="true" 
    :embed="true" 
    :width="'100%'" 
    :height="'100%'"
    class="right-panel-content"
  >
    <!-- 使用router-view渲染子路由 -->
    <router-view />
  </PanelWindow>
</template>

<script setup lang="ts">
import PanelWindow from '@/components/UI/PanelWindow.vue'
</script>

<style scoped>
.right-panel-content {
  padding: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0 !important;
  box-shadow: var(--glow);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
</style>
