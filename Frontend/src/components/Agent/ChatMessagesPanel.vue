<template>
  <div class="chat-messages-panel">
    <div class="messages-container" ref="messagesContainer" @scroll="handleScroll">
      <div v-if="messages.length === 0" class="initial-hint">
        <div class="initial-hint-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="8" width="16" height="12" rx="2" ry="2"></rect>
            <rect x="6" y="4" width="12" height="6" rx="1" ry="1"></rect>
            <circle cx="9" cy="7" r="1"></circle>
            <circle cx="15" cy="7" r="1"></circle>
          </svg>
        </div>
        <div class="initial-hint-content">{{ introText }}</div>
      </div>
      <!-- 消息列表 -->
      <div v-for="msg in messages" :key="msg.id" class="message-wrapper" :class="msg.sender">
        <div class="avatar" v-if="msg.sender === 'system'">
          <!-- AI机器人图标 -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="8" width="16" height="12" rx="2" ry="2"></rect>
            <rect x="6" y="4" width="12" height="6" rx="1" ry="1"></rect>
            <circle cx="9" cy="7" r="1"></circle>
            <circle cx="15" cy="7" r="1"></circle>
            <path d="M8 12h8"></path>
            <path d="M8 15h8"></path>
            <path d="M8 18h8"></path>
            <path d="M10 20h4"></path>
          </svg>
        </div>
        <div class="message-bubble">
          <div v-if="msg.sender === 'system'" class="message-content" v-html="renderMarkdown(msg.text)"></div>
          <div v-else class="message-content">{{ msg.text }}</div>
        </div>
        <div class="avatar" v-if="msg.sender === 'user'">
          <!-- 用户图标 -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
            <path d="M12 11v4"></path>
            <path d="M9 15h6"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'system';
}

interface Props {
  messages: Message[];
  autoScroll?: boolean;
  scrollThreshold?: number;
  introText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  messages: () => [],
  autoScroll: true,
  scrollThreshold: 100,
  introText: '我是您的GIS空间分析助手，能够协助您进行地图图层管理、属性查询、空间分析（如缓冲、相交、擦除、最短路径）以及结果导出等操作。请告诉我您需要执行的任务，我将为您提供高效、精准的支持！'
});

const emit = defineEmits<{
  'scroll-position-change': [isNearBottom: boolean];
  'scroll': [event: Event];
}>();

const messagesContainer = ref<HTMLElement | null>(null);

// 智能滚动相关状态
const isNearBottom = ref(true);
const isUserScrolling = ref(false);
const scrollTimeout = ref<number | null>(null);

// 检测滚动位置
const checkScrollPosition = () => {
  const el = messagesContainer.value;
  if (!el) return;
  
  const { scrollTop, scrollHeight, clientHeight } = el;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  isNearBottom.value = distanceFromBottom <= props.scrollThreshold;
  
  emit('scroll-position-change', isNearBottom.value);
};

// 判断是否应该自动滚动
const shouldAutoScroll = (): boolean => {
  return isNearBottom.value && !isUserScrolling.value && props.autoScroll;
};

// 平滑滚动到底部
const smoothScrollToBottom = () => {
  const el = messagesContainer.value;
  if (!el) return;
  
  const lastMessage = el.lastElementChild;
  if (lastMessage) {
    lastMessage.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  }
};

// 处理滚动事件
const handleScroll = (event: Event) => {
  checkScrollPosition();
  
  // 清除之前的定时器
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value);
  }
  
  // 设置用户正在滚动的状态
  isUserScrolling.value = true;
  
  // 500ms 后重置滚动状态
  scrollTimeout.value = window.setTimeout(() => {
    isUserScrolling.value = false;
  }, 500);
  
  emit('scroll', event);
};

// Markdown渲染函数
const renderMarkdown = (md: string): string => {
  const lines = md.split('\n');
  const htmlParts: string[] = [];
  let inList = false;
  let isFirstLine = true;
  
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      const item = line.slice(2)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1<\/strong>');
      htmlParts.push(`<li>${item}<\/li>`);
    } else if (line.length === 0) {
      if (inList) {
        htmlParts.push('<\/ul>');
        inList = false;
      }
    } else {
      if (inList) {
        htmlParts.push('<\/ul>');
        inList = false;
      }
      const paragraph = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1<\/strong>');
      if (isFirstLine) {
        htmlParts.push(paragraph);
        isFirstLine = false;
      } else {
        htmlParts.push(`<p>${paragraph}<\/p>`);
      }
    }
  }
  if (inList) {
    htmlParts.push('<\/ul>');
  }
  return htmlParts.join('');
};

// 监听消息变化，自动滚动
watch(() => props.messages, async () => {
  await nextTick();
  if (shouldAutoScroll()) {
    smoothScrollToBottom();
  }
  checkScrollPosition();
}, { deep: true });

// 暴露方法给父组件
defineExpose({
  scrollToBottom: smoothScrollToBottom,
  scrollToTop: () => {
    const el = messagesContainer.value;
    if (el) {
      el.scrollTop = 0;
      checkScrollPosition();
    }
  },
  scrollToPosition: (position: number) => {
    const el = messagesContainer.value;
    if (el) {
      el.scrollTop = position;
      checkScrollPosition();
    }
  },
  getScrollPosition: () => {
    return messagesContainer.value?.scrollTop || 0;
  },
  isNearBottom: () => isNearBottom.value
});

onMounted(() => {
  nextTick(() => {
    checkScrollPosition();
    if (props.autoScroll) {
      smoothScrollToBottom();
    }
  });
});

onUnmounted(() => {
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value);
  }
});
</script>

<style scoped>
.chat-messages-panel {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: none;
  min-height: 120px;
  margin-bottom: 2px;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.initial-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 0;
  margin-bottom: 8px;
  background: transparent;
  border: none;
}

.initial-hint-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sub);
}

.initial-hint-content {
  font-size: 14px;
  line-height: 1.4;
  color: var(--sub);
}

/* 自定义滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 3px;
  height: 1.5px;
}

.messages-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track, rgba(200, 200, 200, 0.1));
  border-radius: 1.5px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, rgba(150, 150, 150, 0.3));
  border-radius: 1.5px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(150, 150, 150, 0.5));
}

.message-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  animation: none;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.message-wrapper.user {
  flex-direction: row;
  gap: 4px;
  justify-content: flex-end;
  align-items: flex-end;
}

.message-bubble {
  border-radius: var(--radius);
  padding: 8px 12px;
  margin: 0;
  word-wrap: break-word;
  max-width: 100%;
  background: transparent;
  border: none;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 2px solid var(--border);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

/* AI机器人头像样式 */
.message-wrapper.system .avatar {
  background: var(--avatar-ai-bg);
  border-color: var(--avatar-ai-bg);
}

/* 用户头像样式 */
.message-wrapper.user .avatar {
  background: var(--avatar-user-bg);
  border-color: var(--avatar-user-bg);
}

.avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.avatar svg {
  width: 18px;
  height: 18px;
}

.message-wrapper.user .message-bubble {
  background: transparent;
  color: var(--text);
  box-shadow: none;
}

.message-wrapper.system .message-bubble {
  background: transparent;
  color: var(--text);
  border: none;
}

.message-content {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  color: inherit;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  cursor: text;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-wrapper.system .message-content ul {
  margin: 2px 0;
  padding-left: 16px;
}

.message-wrapper.system .message-content p {
  margin: 1px 0;
}
</style>
