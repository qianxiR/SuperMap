<template>
  <div class="toggle-switch">
    <div class="switch-track" :style="{ width: containerWidth }">
      <div 
        class="switch-slider"
        :style="{ 
          transform: `translateX(${sliderPosition}px)`,
          width: sliderWidth
        }"
      ></div>
      <button
        v-for="(btn, index) in buttons"
        :key="btn.id"
        class="switch-btn"
        :class="{ 'active': activeButton === btn.id }"
        @click="$emit('select', btn.id)"
        :style="{ zIndex: activeButton === btn.id ? 2 : 1 }"
      >
        {{ btn.text }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Button {
  id: string;
  text: string;
}

const props = defineProps<{
  buttons: Button[];
  activeButton: string;
}>();

defineEmits(['select']);

// 计算滑动条位置
const sliderPosition = computed(() => {
  const activeIndex = props.buttons.findIndex(btn => btn.id === props.activeButton);
  if (activeIndex === -1) return 0;
  
  // 计算每个按钮的宽度（均分整个容器）
  let buttonWidth = 100; // 默认宽度
  if (props.buttons.length === 2) buttonWidth = 100;
  else if (props.buttons.length === 3) buttonWidth = 100;
  else if (props.buttons.length === 4) buttonWidth = 150; // 4个选项时每个按钮150px
  
  return activeIndex * buttonWidth;
});

// 计算容器宽度
const containerWidth = computed(() => {
  if (props.buttons.length === 2) return '200px';
  if (props.buttons.length === 3) return '300px';
  if (props.buttons.length === 4) return '600px';
  return '300px'; // 默认值
});

// 计算滑动条宽度
const sliderWidth = computed(() => {
  if (props.buttons.length === 2) return 'calc(50% - 4px)';
  if (props.buttons.length === 3) return 'calc(33.333% - 4px)';
  if (props.buttons.length === 4) return 'calc(25% - 4px)';
  return 'calc(33.333% - 4px)'; // 默认值
});
</script>

<style scoped>
.toggle-switch {
  display: inline-block;
}

.switch-track {
  position: relative;
  display: flex;
  background-color: var(--panel);
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 4px;
  overflow: hidden;
}

.switch-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  height: calc(100% - 8px);
  background-color: var(--accent);
  border-radius: 6px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.switch-btn {
  position: relative;
  padding: 6px 16px;
  border: none;
  background-color: transparent;
  color: var(--text);
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  transition: color 0.3s ease;
  user-select: none;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  flex: 1; /* 均分宽度 */
  z-index: 2;
}

.switch-btn.active {
  color: white !important;
}

.switch-btn:not(.active):hover {
  color: var(--accent);
}

.switch-btn:active {
  transform: scale(0.98);
}
</style>
