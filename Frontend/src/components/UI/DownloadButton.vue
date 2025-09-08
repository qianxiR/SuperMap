<template>
  <button 
    class="download-btn"
    :class="{ 'disabled': disabled }"
    :title="title"
    :disabled="disabled"
    @click="handleClick"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19,9H15V3H9V9H5L12,16L19,9M5,18V20H19V18H5Z"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  disabled?: boolean
}

interface Emits {
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '下载',
  disabled: false
})

const emit = defineEmits<Emits>()

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>

<style scoped>
.download-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.download-btn:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.1);
}

.download-btn:active {
  transform: scale(0.95);
}

.download-btn.disabled {
  color: var(--sub);
  cursor: not-allowed;
  transform: none;
}

.download-btn.disabled:hover {
  background: transparent;
  color: var(--sub);
  transform: none;
}

/* 在图层组头部悬停时的样式 */
.group-header:hover .download-btn {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.group-header:hover .download-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
</style>
