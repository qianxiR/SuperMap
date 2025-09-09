<template>
  <div class="chat-messages-panel">
    <div class="messages-container" ref="messagesContainer" @scroll="handleScroll">
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
}

const props = withDefaults(defineProps<Props>(), {
  messages: () => [],
  autoScroll: true,
  scrollThreshold: 100
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
  padding: 8px 6px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: none; /* 禁用动画，防止主题切换闪烁 */
  min-height: 120px;
  margin-bottom: 2px;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  /* 添加平滑滚动 */
  scroll-behavior: smooth;
  /* 优化滚动性能 */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
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
  gap: 6px;
  margin: 0;
  animation: none; /* 禁用动画，防止主题切换闪烁 */
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
  border-radius: 16px;
  padding: 6px 10px;
  margin: 0;
  word-wrap: break-word;
  max-width: 95%;
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
  background: var(--accent);
  color: white;
  box-shadow: 0 3px 12px rgba(var(--accent-rgb), 0.4);
}

.message-wrapper.system .message-bubble {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
}

.message-content {
  font-size: 13px;
  line-height: 1.3;
  margin: 0;
  color: inherit;
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
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
