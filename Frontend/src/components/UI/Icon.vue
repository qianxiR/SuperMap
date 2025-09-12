<template>
  <svg 
    :class="['icon', size, { 'text-success': success, 'text-muted': muted, 'text-error': error }]"
    :width="iconSize"
    :height="iconSize"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- 图层图标 -->
    <rect v-if="name === 'layers'" x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <path v-if="name === 'layers'" d="M7 7h10M7 11h10M7 15h4"/>
    
    <!-- 眼睛图标 -->
    <path v-if="name === 'eye'" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle v-if="name === 'eye'" cx="12" cy="12" r="3"/>
    
    <!-- 眼睛关闭图标 -->
    <path v-if="name === 'eye-off'" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line v-if="name === 'eye-off'" x1="1" y1="1" x2="23" y2="23"/>
    
    <!-- 分析图标 -->
    <path v-if="name === 'analysis'" d="M3 3v18h18"/>
    <path v-if="name === 'analysis'" d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
    
    <!-- 缓冲区图标 -->
    <circle v-if="name === 'buffer'" cx="12" cy="12" r="10"/>
    <circle v-if="name === 'buffer'" cx="12" cy="12" r="6"/>
    <circle v-if="name === 'buffer'" cx="12" cy="12" r="2"/>
    
    <!-- 相交图标 -->
    <rect v-if="name === 'intersect'" x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <rect v-if="name === 'intersect'" x="7" y="7" width="10" height="10" rx="1" ry="1"/>
    
    <!-- 擦除图标 -->
    <path v-if="name === 'erase'" d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
    <line v-if="name === 'erase'" x1="18" y1="9" x2="12" y2="15"/>
    <line v-if="name === 'erase'" x1="12" y1="9" x2="6" y2="15"/>
    
    <!-- 最短路径图标 -->
    <path v-if="name === 'path'" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    <path v-if="name === 'path'" d="M13 13l6 6"/>
    
    <!-- 设置图标 -->
    <circle v-if="name === 'settings'" cx="12" cy="12" r="3"/>
    <path v-if="name === 'settings'" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    
    <!-- 信息图标 -->
    <circle v-if="name === 'info'" cx="12" cy="12" r="10"/>
    <line v-if="name === 'info'" x1="12" y1="16" x2="12" y2="12"/>
    <line v-if="name === 'info'" x1="12" y1="8" x2="12.01" y2="8"/>
    
    <!-- 警告图标 -->
    <path v-if="name === 'warning'" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line v-if="name === 'warning'" x1="12" y1="9" x2="12" y2="13"/>
    <line v-if="name === 'warning'" x1="12" y1="17" x2="12.01" y2="17"/>
    
    <!-- 成功图标 -->
    <path v-if="name === 'success'" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline v-if="name === 'success'" points="22,4 12,14.01 9,11.01"/>
    
    <!-- 错误图标 -->
    <circle v-if="name === 'error'" cx="12" cy="12" r="10"/>
    <line v-if="name === 'error'" x1="15" y1="9" x2="9" y2="15"/>
    <line v-if="name === 'error'" x1="9" y1="9" x2="15" y2="15"/>
    
    <!-- 加载图标 -->
    <line v-if="name === 'loading'" x1="12" y1="2" x2="12" y2="6"/>
    <line v-if="name === 'loading'" x1="12" y1="18" x2="12" y2="22"/>
    <line v-if="name === 'loading'" x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
    <line v-if="name === 'loading'" x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line v-if="name === 'loading'" x1="2" y1="12" x2="6" y2="12"/>
    <line v-if="name === 'loading'" x1="18" y1="12" x2="22" y2="12"/>
    <line v-if="name === 'loading'" x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
    <line v-if="name === 'loading'" x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    
    <!-- 默认图标（如果找不到匹配的图标） -->
    <circle v-if="!hasIcon" cx="12" cy="12" r="10"/>
    <line v-if="!hasIcon" x1="12" y1="8" x2="12" y2="12"/>
    <line v-if="!hasIcon" x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: 'small' | 'medium' | 'large' | number
  success?: boolean
  muted?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  success: false,
  muted: false,
  error: false
})

// 计算图标尺寸
const iconSize = computed(() => {
  if (typeof props.size === 'number') {
    return props.size
  }
  
  const sizeMap = {
    small: 16,
    medium: 20,
    large: 24
  }
  
  return sizeMap[props.size] || 20
})

// 检查是否有对应的图标
const hasIcon = computed(() => {
  const iconNames = [
    'layers', 'eye', 'eye-off', 'analysis', 'buffer', 'intersect', 
    'erase', 'path', 'settings', 'info', 'warning', 'success', 
    'error', 'loading'
  ]
  return iconNames.includes(props.name)
})
</script>

<style scoped>
.icon {
  display: inline-block;
  vertical-align: middle;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 尺寸变体 */
.icon.small {
  width: 16px;
  height: 16px;
}

.icon.medium {
  width: 20px;
  height: 20px;
}

.icon.large {
  width: 24px;
  height: 24px;
}

/* 颜色变体 */
.icon.text-success {
  color: var(--success-color, #28a745);
}

.icon.text-muted {
  color: var(--text-secondary, #6c757d);
  opacity: 0.6;
}

.icon.text-error {
  color: var(--error-color, #dc3545);
}

/* 动画效果 */
.icon[name="loading"] {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
