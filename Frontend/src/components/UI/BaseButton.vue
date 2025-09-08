<template>
  <button 
    class="base-btn"
    :class="[
      variant,
      size,
      { 
        active: isActive, 
        loading: loading, 
        'icon-only': iconOnly,
        disabled: disabled
      }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
    :title="title"
  >
    <span v-if="loading" class="loading-spinner"></span>
    <svg 
      v-if="icon && !loading" 
      class="btn-icon" 
      :class="{ 'icon-left': slotContent, 'icon-right': iconPosition === 'right' }"
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      :fill="getIconFill()"
      :stroke="getIconStroke()"
      :stroke-width="getIconStrokeWidth()"
      v-html="getIconPaths(getIconPathString())"
    ></svg>
    <slot>{{ text }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

const slots = useSlots()

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'secondary',
    validator: (value: string) => ['primary', 'secondary', 'danger', 'assistant'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  },
  active: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: [String, Object],
    default: ''
  },
  iconPosition: {
    type: String,
    default: 'left',
    validator: (value: string) => ['left', 'right'].includes(value)
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const isActive = props.active

// 检查是否有插槽内容
const slotContent = computed(() => {
  return slots.default && slots.default().length > 0
})

// 检查是否为纯图标按钮
const iconOnly = computed(() => {
  return props.icon && !slotContent.value && !props.text
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// 处理图标路径，支持多个路径
const getIconPaths = (iconString: string) => {
  if (!iconString) return ''
  
  // 如果包含多个路径（用M开头分割），则创建多个path元素
  const paths = iconString.split(/(?=M)/).filter(path => path.trim())
  
  if (paths.length === 1) {
    // 单个路径，直接返回
    return `<path d="${paths[0]}"/>`
  } else {
    // 多个路径，创建多个path元素
    return paths.map(path => `<path d="${path}"/>`).join('')
  }
}

// 获取图标填充样式
const getIconFill = () => {
  // 如果icon是对象，使用对象的fill
  if (typeof props.icon === 'object' && props.icon !== null) {
    return props.icon.fill || 'currentColor'
  }
  // 如果是面积测量图标（圆形），使用透明填充
  if (props.icon && props.icon.includes('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z')) {
    return 'none'
  }
  return 'currentColor'
}

// 获取图标描边样式
const getIconStroke = () => {
  // 如果icon是对象，使用对象的stroke
  if (typeof props.icon === 'object' && props.icon !== null) {
    return props.icon.stroke || 'none'
  }
  // 如果是面积测量图标（圆形），使用描边
  if (props.icon && props.icon.includes('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z')) {
    return 'currentColor'
  }
  return 'none'
}

// 获取图标描边宽度
const getIconStrokeWidth = () => {
  // 如果icon是对象，使用对象的strokeWidth
  if (typeof props.icon === 'object' && props.icon !== null) {
    return props.icon.strokeWidth || '0'
  }
  // 如果是面积测量图标（圆形），使用描边宽度
  if (props.icon && props.icon.includes('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z')) {
    return '2'
  }
  return '0'
}

// 获取图标路径字符串
const getIconPathString = () => {
  if (typeof props.icon === 'object' && props.icon !== null) {
    return props.icon.paths || ''
  }
  return props.icon || ''
}
</script>

<style scoped>
.base-btn {
  border: none;
  background: var(--panel);
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-family: inherit;
  font-weight: 500;
  outline: none;
  gap: 6px;
}

/* 尺寸变体 */
.base-btn.small {
  width: 24px;
  height: 24px;
  padding: 4px;
  font-size: 12px;
}

.base-btn.medium {
  width: 32px;
  height: 32px;
  padding: 6px 8px;
  font-size: 12px;
}

.base-btn.large {
  width: 40px;
  height: 40px;
  padding: 8px 12px;
  font-size: 14px;
}

/* 悬停效果 */
.base-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 点击效果 */
.base-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* 禁用状态 */
.base-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.base-btn:disabled:hover {
  background: var(--panel);
  color: var(--text);
  box-shadow: none;
}

/* 激活状态 */
.base-btn.active {
  background: var(--accent);
  color: white;
}

/* 变体样式 */
.base-btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
}

.base-btn.primary:hover:not(:disabled) {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
}

.base-btn.secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
}

.base-btn.secondary:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}

.base-btn.danger {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-color);
}

.base-btn.danger:hover:not(:disabled) {
  background: var(--btn-danger-hover-bg);
  color: var(--btn-danger-hover-color);
}

.base-btn.assistant {
  background: var(--panel);
  color: var(--text);
  border: none;
}

.base-btn.assistant:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  border: none;
}

.base-btn.assistant.active {
  background: var(--accent);
  color: white;
  border: none;
}

/* 图标样式 */
.btn-icon {
  flex-shrink: 0;
}

.btn-icon.icon-left {
  margin-right: 4px;
}

.btn-icon.icon-right {
  margin-left: 4px;
}

/* 纯图标按钮 */
.base-btn.icon-only {
  padding: 4px;
}

.base-btn.icon-only.small {
  padding: 2px;
}

.base-btn.icon-only.medium {
  padding: 4px;
}

.base-btn.icon-only.large {
  padding: 6px;
}

/* 加载动画 */
.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.base-btn.loading {
  cursor: wait;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .base-btn.medium {
    width: 28px;
    height: 28px;
    padding: 4px 6px;
  }
  
  .base-btn.large {
    width: 36px;
    height: 36px;
    padding: 6px 10px;
  }
}
</style>
