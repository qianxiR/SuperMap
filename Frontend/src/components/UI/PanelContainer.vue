<template>
  <div 
    class="panel-container"
    :class="{
      'panel-container--compact': compact,
      'panel-container--bordered': bordered,
      'panel-container--shadowed': shadowed,
      'panel-container--animated': animated
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  compact?: boolean;
  bordered?: boolean;
  shadowed?: boolean;
  animated?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false,
  bordered: true,
  shadowed: true,
  animated: true
});
</script>

<style scoped>
.panel-container {
  width: 100%;
  height: 100%;
  background: var(--panel);
  border-radius: 0;
  padding: 10px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-container--compact {
  padding: 8px;
}

.panel-container--bordered {
  border: 1px solid var(--border);
}

.panel-container--shadowed {
  box-shadow: var(--glow);
}

/* 动画效果 */
.panel-container--animated {
  animation: panelFadeIn 0.3s ease-out;
  transition: all 0.2s ease;
}

/* 淡入动画 */
@keyframes panelFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel-container {
    padding: 8px;
  }
}
</style>

