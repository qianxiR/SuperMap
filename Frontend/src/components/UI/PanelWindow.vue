<template>
  <div 
    v-show="visible"
    ref="panelRef"
    class="panel-window"
    :class="{ 
      'focusable': focusable,
      'panel-window--animated': animated && !embed
    }"
    :style="panelStyle"
    :data-embed="embed"
    :key="animationKey"
    @click="handleClick"
    @keydown="handleKeyDown"
    :tabindex="focusable ? 0 : undefined"
    :role="focusable ? 'dialog' : undefined"
    :aria-label="focusable ? title : undefined"
  >
    <div class="panel-title" v-if="!embed && title">
      <span>{{ title }}</span>
      <button 
        v-if="closeable"
        class="close-btn" 
        @click="handleClose"
        title="关闭"
        aria-label="关闭面板"
      >
        ×
      </button>
    </div>
    <div class="panel-content">
      <slot></slot>
    </div>
  </div>
</template>
<!-- 面板窗口 -->
<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { CSSProperties } from 'vue'
import { useModeStateStore } from '@/stores/modeStateStore'

const emit = defineEmits<{
  close: []
  focus: []
}>()

interface Props {
  visible?: boolean;
  title?: string;
  embed?: boolean;
  width?: string | number;
  height?: string | number;
  position?: 'left' | 'right' | 'absolute';
  top?: string | number;
  left?: string | number;
  resizable?: boolean;
  zIndex?: number;
  focusable?: boolean;
  closeable?: boolean;
  componentId?: string; // 可选：用于持久化布局
  animated?: boolean; // 新增：是否启用动画效果
  animationKey?: number; // 新增：动画触发器
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '',
  embed: false,
  width: 320,
  height: 'auto',
  position: 'right',
  top: 64,
  left: undefined,
  resizable: false,
  zIndex: 1300,
  focusable: false,
  closeable: false,
  componentId: undefined,
  animated: true, // 默认启用动画
  animationKey: 0 // 默认动画键值
})

const panelStyle = computed((): CSSProperties => {
  const styles: CSSProperties = {
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    top: typeof props.top === 'number' ? `${props.top}px` : props.top,
    zIndex: props.zIndex,
    position: 'absolute', // Default position
  }
  
  if (props.height !== 'auto') {
    styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  if (!props.embed) {
    if (props.position === 'right') {
      styles.right = '24px'
    } else if (props.position === 'left') {
      styles.left = '24px'
    } else if (props.position === 'absolute' && props.left !== undefined) {
      styles.left = typeof props.left === 'number' ? `${props.left}px` : props.left
      // 对于绝对定位的弹窗，确保内容可以滚动
      if (props.height !== 'auto') {
        styles.overflow = 'hidden'
      }
    }
  } else {
    styles.position = 'relative'
    styles.right = 'auto'
    styles.left = 'auto'
    styles.top = 'auto'
    styles.width = '100%'
    // 对于嵌入模式，让父容器控制高度
    if (props.height === 'auto') {
      styles.height = '100%'
    } else {
      styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height
    }
    // 确保嵌入模式下可以正常滚动
    styles.overflow = 'hidden'
  }
  
  if (props.resizable) {
    styles.resize = 'both'
    styles.overflow = 'auto'
    // 设置最小尺寸为300px
    styles.minWidth = '300px'
    styles.minHeight = '300px'
  }
  
  return styles
})

const panelRef = ref<HTMLElement | null>(null)
const modeStateStore = useModeStateStore()

// 事件处理函数
const handleClick = (event: Event) => {
  event.stopPropagation()
  if (props.focusable && panelRef.value) {
    panelRef.value.focus()
  }
  emit('focus')
}

const handleWheel = (event: Event) => {
  event.stopPropagation()
  if (props.focusable && panelRef.value) {
    panelRef.value.focus()
  }
  emit('focus')
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
  event.stopPropagation()
}

const handleClose = () => {
  emit('close')
}

// 监听可见性变化，自动设置焦点
watch(() => props.visible, async (visible) => {
  if (visible && props.focusable && panelRef.value) {
    await nextTick()
    panelRef.value.focus()
  }
}, { immediate: true })

// 持久化：保存/恢复滚动位置与尺寸（仅当提供 componentId 时）
const restoreLayout = () => {
  if (!props.componentId || !panelRef.value) return
  const layout = modeStateStore.getComponentLayout(props.componentId)
  const content = panelRef.value.querySelector('.panel-content') as HTMLElement | null
  if (content && typeof layout.scrollTop === 'number') {
    content.scrollTop = layout.scrollTop
  }
}

const saveLayout = () => {
  if (!props.componentId || !panelRef.value) return
  const content = panelRef.value.querySelector('.panel-content') as HTMLElement | null
  const layout: Record<string, any> = {}
  if (content) layout.scrollTop = content.scrollTop
  modeStateStore.saveComponentLayout(props.componentId, layout)
}

onMounted(() => {
  restoreLayout()
  const content = panelRef.value?.querySelector('.panel-content') as HTMLElement | null
  content?.addEventListener('scroll', saveLayout)
  
  // 手动添加滚轮事件监听器，明确指定 passive: false
  if (panelRef.value) {
    panelRef.value.addEventListener('wheel', handleWheel, { passive: false })
  }
})

onUnmounted(() => {
  saveLayout()
  const content = panelRef.value?.querySelector('.panel-content') as HTMLElement | null
  content?.removeEventListener('scroll', saveLayout)
  
  // 清理滚轮事件监听器
  if (panelRef.value) {
    panelRef.value.removeEventListener('wheel', handleWheel)
  }
})
</script>

<style scoped>
.panel-window {
  position: absolute;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--glow);
  padding: 12px;
  outline: none;
  display: flex;
  flex-direction: column;
  /* 启用GPU加速 */
  will-change: opacity, transform;
  transform: translateZ(0);
}

/* 动画效果 */
.panel-window--animated {
  animation: panelWindowFadeIn 0.3s ease-out;
  transition: all 0.2s ease;
}



/* 淡入动画 */
@keyframes panelWindowFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 嵌入模式下的特殊样式 */
.panel-window[data-embed="true"] {
  position: relative;
  border: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
  border-radius: 0 !important;
}

.panel-window.focusable {
  cursor: default;
}



.panel-title { 
  font-size: 14px; 
  font-weight: 600; 
  color: var(--accent); 
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 20px;
  /* 简化过渡动画 */
  transition: background-color 0.15s ease;
}

.close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  min-height: 0;
  padding-right: 4px;
}

/* 嵌入模式下的特殊处理 */
.panel-window[data-embed="true"] .panel-content {
  overflow: auto;
  min-height: 0;
  flex: 1;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
  height: 0px;
}

.panel-content::-webkit-scrollbar:horizontal {
  height: 0px;
  display: none;
}

.panel-content::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}
</style>
