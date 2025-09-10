<template>
  <div class="llm-input-window" ref="rootEl">
    <div class="input-container">
      <LLMInputGroup
        v-model="inputValue"
        :placeholder="placeholder"
        as="textarea"
        :rows="rows"
        :disabled="disabled"
        @enter="handleSend"
        @update:modelValue="handleInputChange"
      />
      <div v-if="isOpen" class="mentions-dropdown" :class="{ 'show': isOpen }">
        <div class="dropdown-header">
          <svg class="header-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
            <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
            <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
            <rect x="7" y="7" width="10" height="10" rx="1"></rect>
          </svg>
          <span class="header-text">选择图层</span>
          <span class="header-count">{{ filtered.length }}</span>
        </div>
        <div
          v-for="(item, idx) in filtered"
          :key="item.id"
          class="mention-item"
          :class="{ active: idx === activeIndex }"
          @mousedown.prevent="selectMention(item.name)"
          @mouseenter="activeIndex = idx"
        >
          <div class="item-icon">
            <svg v-if="item.opened && item.visible" class="layer-icon visible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg v-else-if="item.opened && !item.visible" class="layer-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
            <svg v-else class="layer-icon unopened" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
          </div>
          <div class="item-content">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-status" :class="getStatusClass(item)">
              {{ item.opened ? (item.visible ? '已显示' : '已隐藏') : '未打开' }}
            </span>
          </div>
          <div class="item-action">
            <svg class="action-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </div>
        </div>
        <div v-if="filtered.length === 0" class="empty-state">
          <svg class="empty-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
          <span class="empty-text">未找到匹配的图层</span>
        </div>
      </div>
      <button 
        class="action-button" 
        @click="handleSend" 
        :disabled="!inputValue.trim() || disabled"
        :title="sendButtonTitle"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import LLMInputGroup from '@/components/UI/LLMInputGroup.vue';
import { useLayerMentions } from '@/composables/useLayerMentions'
import type { MentionItem } from '@/composables/useLayerMentions'
import { uselayermanager } from '@/composables/uselayermanager'
import { useMapStore } from '@/stores/mapStore'

interface Props {
  modelValue?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  sendButtonTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入您的需求...',
  rows: 3,
  disabled: false,
  sendButtonTitle: '发送消息'
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'send': [message: string];
  'input-change': [value: string];
}>();

const inputValue = ref(props.modelValue);
const activeIndex = ref(0)
const mention = useLayerMentions()
const filtered = computed<MentionItem[]>(() => mention.filtered.value)
const isOpen = computed<boolean>(() => mention.isOpen.value)
const layerManager = uselayermanager()
const mapStore = useMapStore()
const pendingDeletion = ref<{ start: number; end: number; name: string } | null>(null)
const suppressMentions = ref(false)
const rootEl = ref<HTMLElement | null>(null)

// 监听外部modelValue变化
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue;
});

// 监听内部inputValue变化，同步到外部
watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue);
});

const handleInputChange = (value: string) => {
  inputValue.value = value;
  emit('input-change', value);
  const caret = getCaret()
  if (suppressMentions.value) {
    mention.close()
    suppressMentions.value = false
  } else {
    mention.parseForMention(inputValue.value, caret)
  }
  pendingDeletion.value = null
};

const handleSend = () => {
  const message = inputValue.value.trim();
  if (message && !props.disabled) {
    emit('send', message);
    inputValue.value = '';
    mention.close()
  }
};

const getCaret = (): number => {
  const el = document.activeElement as HTMLTextAreaElement | null
  if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
    return el.selectionStart || 0
  }
  return inputValue.value.length
}

const selectMention = (name: string) => {
  const caret = getCaret()
  const { nextText, nextCaret } = mention.buildReplace(inputValue.value, caret, name)
  inputValue.value = nextText
  nextTickSetCaret(nextCaret)
  mention.close()
}

const onKeyDown = (e: KeyboardEvent) => {
  if (!mention.isOpen.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % Math.max(filtered.value.length, 1)
    scrollToActiveItem()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + Math.max(filtered.value.length, 1)) % Math.max(filtered.value.length, 1)
    scrollToActiveItem()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filtered.value[activeIndex.value]
    if (item) selectMention(item.name)
  } else if (e.key === 'Escape') {
    mention.close()
  }
}

const scrollToActiveItem = () => {
  requestAnimationFrame(() => {
    const dropdown = document.querySelector('.mentions-dropdown')
    const activeItem = document.querySelector('.mention-item.active')
    if (dropdown && activeItem) {
      const dropdownRect = dropdown.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()
      const dropdownScrollTop = dropdown.scrollTop
      
      if (itemRect.bottom > dropdownRect.bottom) {
        dropdown.scrollTop = dropdownScrollTop + (itemRect.bottom - dropdownRect.bottom) + 4
      } else if (itemRect.top < dropdownRect.top) {
        dropdown.scrollTop = dropdownScrollTop - (dropdownRect.top - itemRect.top) - 4
      }
    }
  })
}

const onKeyDownGlobal = (e: KeyboardEvent) => {
  if (e.key !== 'Backspace') return
  const active = document.activeElement as HTMLElement | null
  if (!active || (active.tagName !== 'TEXTAREA' && active.tagName !== 'INPUT')) return
  if (rootEl.value && !rootEl.value.contains(active)) return
  const caret = getCaret()
  if (pendingDeletion.value) {
    e.preventDefault()
    e.stopPropagation()
    suppressMentions.value = true
    const head = inputValue.value.slice(0, pendingDeletion.value.start)
    const tail = inputValue.value.slice(pendingDeletion.value.end)
    inputValue.value = head + tail
    nextTickSetCaret(head.length)
    const name = pendingDeletion.value.name
    const layer = mapStore.vectorlayers.find(l => l.name === name)
    if (layer) {
      layerManager.removeLayer(layer.id)
    }
    pendingDeletion.value = null
    return
  }
  const token = findMentionTokenBeforeCaret(inputValue.value, caret)
  if (token) {
    e.preventDefault()
    e.stopPropagation()
    suppressMentions.value = true
    pendingDeletion.value = token
    selectRange(token.start, token.end)
  }
}

const selectRange = (start: number, end: number) => {
  requestAnimationFrame(() => {
    const el = document.activeElement as HTMLTextAreaElement | null
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      el.setSelectionRange(start, end)
    }
  })
}

const findMentionTokenBeforeCaret = (text: string, caret: number): { start: number; end: number; name: string } | null => {
  const upto = text.slice(0, caret)
  const at = upto.lastIndexOf('@')
  if (at === -1) return null
  const space = upto.slice(at).search(/\s/)
  const end = space === -1 ? caret : at + space
  const name = text.slice(at + 1, end)
  if (!name) return null
  return { start: at, end, name }
}

const getStatusClass = (item: MentionItem) => {
  if (!item.opened) return 'status-unopened'
  return item.visible ? 'status-visible' : 'status-hidden'
}

const nextTickSetCaret = (pos: number) => {
  requestAnimationFrame(() => {
    const el = document.activeElement as HTMLTextAreaElement | null
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      el.setSelectionRange(pos, pos)
    }
  })
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keydown', onKeyDownGlobal)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keydown', onKeyDownGlobal)
})

// 暴露方法给父组件
defineExpose({
  clear: () => {
    inputValue.value = '';
  },
  focus: () => {
    // 可以通过ref访问LLMInputGroup的focus方法
  },
  setValue: (value: string) => {
    inputValue.value = value;
  }
});
</script>

<style scoped>
.llm-input-window {
  width: 100%;
}

.input-container {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  position: relative;
  z-index: 1;
  animation: none; /* 禁用动画，防止主题切换闪烁 */
  margin-top: 2px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  position: absolute;
  bottom: 12px;
  right: 8px;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.3);
}

.action-button:hover:not(:disabled) {
  background: var(--accent);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.4);
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(var(--accent-rgb), 0.3);
}

.action-button:disabled {
  background: rgba(var(--accent-rgb), 0.3);
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

.mentions-dropdown {
  position: absolute;
  left: 8px;
  bottom: 100%;
  margin-bottom: 4px;
  max-height: 200px;
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06);
  width: 260px;
  z-index: 20;
  opacity: 0;
  transform: translateY(2px);
  transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1);
}

.mentions-dropdown.show {
  opacity: 1;
  transform: translateY(0);
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid var(--border);
  background: var(--surface, rgba(127,127,127,0.03));
}

.header-icon {
  color: var(--sub);
  flex-shrink: 0;
  width: 12px;
  height: 12px;
}

.header-text {
  color: var(--sub);
  font-size: 11px;
  font-weight: 500;
  flex: 1;
}

.header-count {
  color: var(--sub);
  font-size: 10px;
  background: var(--border);
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
  line-height: 1.2;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.08s ease;
  position: relative;
}

.mention-item:hover {
  background: var(--surface, rgba(127,127,127,0.06));
}

.mention-item.active {
  background: var(--accent);
  color: white;
}

.mention-item.active .item-name,
.mention-item.active .item-status {
  color: white;
}

.mention-item.active .layer-icon {
  color: white;
}

.item-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.layer-icon.visible {
  color: var(--accent);
}

.layer-icon.hidden {
  color: var(--sub);
}

.layer-icon.unopened {
  color: var(--border);
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-status {
  font-size: 10px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-visible {
  color: var(--accent);
}

.status-hidden {
  color: var(--sub);
}

.status-unopened {
  color: var(--border);
}

.item-action {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s ease;
}

.mention-item:hover .item-action,
.mention-item.active .item-action {
  opacity: 1;
}

.action-icon {
  color: currentColor;
  opacity: 0.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  text-align: center;
  gap: 6px;
}

.empty-icon {
  color: var(--border);
}

.empty-text {
  color: var(--sub);
  font-size: 12px;
}

/* 滚动条优化 */
.mentions-dropdown::-webkit-scrollbar {
  width: 4px;
}

.mentions-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.mentions-dropdown::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.mentions-dropdown::-webkit-scrollbar-thumb:hover {
  background: var(--sub);
}
</style>
