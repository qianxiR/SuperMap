<template>
  <div 
    v-if="isTransitioning" 
    class="theme-transition-overlay"
    :class="{ 'transitioning': isTransitioning }"
  >
    <div class="transition-spinner">
      <div class="spinner"></div>
      <div class="transition-text">主题切换中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeOptimization } from '@/composables/useThemeOptimization'

const { isTransitioning } = useThemeOptimization()
</script>

<style scoped>
.theme-transition-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(2px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.theme-transition-overlay.transitioning {
  opacity: 1;
  pointer-events: auto;
}

.transition-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top: 2px solid var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.transition-text {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 确保在主题切换过程中不闪烁 */
.theme-transition-overlay * {
  transition: none !important;
  animation: none !important;
}

.theme-transition-overlay .spinner {
  animation: spin 0.8s linear infinite !important;
}
</style>
