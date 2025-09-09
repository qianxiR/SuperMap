<template>
  <div class="chat-assistant">
    <!-- 功能按钮固定在聊天容器外部 -->
    <div class="fixed-buttons">
      <!-- 新对话按钮 -->
      <SecondaryButton
        class="new-chat-button"
        variant="secondary"
        @click="startNewConversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span class="button-text">新对话</span>
      </SecondaryButton>
      
      <!-- 历史记录按钮 -->
      <SecondaryButton
        class="history-button"
        variant="secondary"
        @click="showChatHistory"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="button-text">历史记录</span>
      </SecondaryButton>
    </div>
    
    <!-- 聊天记录显示区域 -->
    <ChatMessagesPanel
      ref="messagesPanelRef"
      :messages="messages"
      :auto-scroll="true"
      :scroll-threshold="100"
    />
    
    <!-- 输入区域 -->
    <LLMInputWindow
      v-model="newMessage"
      placeholder="请输入您的需求..."
      :rows="3"
      @send="sendMessage"
    />
  </div>
</template>//

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore } from '@/stores/themeStore';
import { useModeStateStore } from '@/stores/modeStateStore';
import LLMInputWindow from '@/components/Agent/LLMInputWindow.vue';
import ChatMessagesPanel from '@/components/Agent/ChatMessagesPanel.vue';
import SecondaryButton from '@/components/UI/SecondaryButton.vue';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'system';
}

useThemeStore();
const modeStateStore = useModeStateStore();
const router = useRouter();

const props = defineProps<{
  mapReady: boolean;
}>();
const messages = ref<Message[]>([]);
const newMessage = ref('');
const hasAnnounced = ref(false);
const messagesPanelRef = ref<InstanceType<typeof ChatMessagesPanel> | null>(null);

// 智能滚动相关状态现在由ChatMessagesPanel组件内部处理



const maybeAnnounceInitiallayers = () => {
  // 不再显示初始提示语，直接开始对话
  if (!hasAnnounced.value) {
    hasAnnounced.value = true;
  }
}

// 恢复历史对话的方法
const restoreHistoryMessages = (historyMessages: any[]) => {
  if (historyMessages && historyMessages.length > 0) {
    messages.value = [...historyMessages]
    hasAnnounced.value = true
    
    // 清空输入框
    newMessage.value = ''
    
    // 滚动到底部
    nextTick(() => {
      messagesPanelRef.value?.scrollToBottom()
    })
  }
}

// 监听历史记录恢复事件
const handleChatHistoryRestored = (event: CustomEvent) => {
  const { messages: historyMessages } = event.detail
  restoreHistoryMessages(historyMessages)
}

onMounted(() => {
  // 恢复LLM模式状态
  const llmState = modeStateStore.getLLMState()
  if (llmState.messages.length > 0) {
    messages.value = [...llmState.messages]
    hasAnnounced.value = true
  }
  if (llmState.inputText) {
    newMessage.value = llmState.inputText
  }
  
  // 如果没有恢复的状态，则显示初始消息
  if (messages.value.length === 0) {
    maybeAnnounceInitiallayers();
  }
  
  // 使用nextTick处理DOM更新
  nextTick(() => {
    // 初始化滚动位置检测
    // 滚动位置检测现在由ChatMessagesPanel组件内部处理
    
    // 恢复滚动位置
    if (llmState.scrollPosition > 0) {
      setTimeout(() => {
        messagesPanelRef.value?.scrollToPosition(llmState.scrollPosition);
      }, 100);
    } else {
      // 如果没有保存的滚动位置，滚动到底部
      messagesPanelRef.value?.scrollToBottom();
    }
  });
  
  // 监听历史记录恢复事件
  window.addEventListener('chatHistoryRestored', handleChatHistoryRestored as EventListener)
});

// 保存LLM模式状态
const saveLLMState = () => {
  const scrollPosition = messagesPanelRef.value?.getScrollPosition() || 0;
  modeStateStore.saveLLMState({
    messages: messages.value,
    inputText: newMessage.value,
    scrollPosition
  });
};

// 组件卸载时保存状态和清理事件监听器
onUnmounted(() => {
  saveLLMState();
  // 清理事件监听器
  window.removeEventListener('chatHistoryRestored', handleChatHistoryRestored as EventListener)
});

// 监听状态变化，自动保存
watch([messages, newMessage], () => {
  saveLLMState();
}, { deep: true });

// 地图就绪与否均可发送消息，保留监听但不做限制
watch(() => props.mapReady, () => {
  maybeAnnounceInitiallayers();
});

watch(messages, async () => {
  await nextTick();
  // 智能滚动逻辑现在由ChatMessagesPanel组件内部处理
}, { deep: true });

// 发送消息
const sendMessage = () => {
  const message = newMessage.value.trim();
  if (!message) return;

  // 添加用户消息
  messages.value.push({
    id: Date.now(),
    text: message,
    sender: 'user'
  });

  // 处理用户输入并生成AI响应
  
  let aiResponse = `我理解您的需求：正在处理中...`;
  
  // 添加AI响应
  messages.value.push({
    id: Date.now() + 1,
    text: aiResponse,
    sender: 'system'
  });

  newMessage.value = '';
  
  // 智能滚动逻辑现在由ChatMessagesPanel组件内部处理
};

// 跳转到历史聊天记录页面
const showChatHistory = () => {
  router.push('/dashboard/management-analysis/llm/chat-history');
};

// 新增：开启新对话功能
const startNewConversation = () => {
  // 保存当前对话到历史记录
  if (messages.value.length > 0) {
    const savedChatHistory = localStorage.getItem('chatHistory') || '[]';
    const chatHistory = JSON.parse(savedChatHistory);
    
    const currentChat = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      messages: [...messages.value],
      messageCount: messages.value.length
    };
    
    chatHistory.push(currentChat);
    
    // 限制历史记录数量，最多保存20条
    if (chatHistory.length > 20) {
      chatHistory.splice(0, chatHistory.length - 20);
    }
    
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }
  
  // 清空消息历史
  messages.value = [];
  // 清空输入框
  newMessage.value = '';
  // 重置状态
  hasAnnounced.value = false;
  
  // 重新初始化状态
  maybeAnnounceInitiallayers();
  
  // 清空保存的状态
  modeStateStore.saveLLMState({
    messages: [],
    inputText: '',
    scrollPosition: 0
  });
  
  // 滚动到顶部
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom();
  });
};
</script>



<style scoped>
.chat-assistant {
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  /* 设置相对定位，为固定按钮提供定位上下文 */
  position: relative;
}

.fixed-buttons {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
  /* 确保按钮完全脱离文档流，不占用空间 */
  pointer-events: auto;
  display: flex;
  gap: 8px;
  flex-direction: column;
}



.history-button,
.new-chat-button {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 12px !important;
  width: auto !important;
  height: auto !important;
  /* 浮动按钮效果 - 确保完全浮动 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  backdrop-filter: blur(8px) !important;
  background: var(--fixed-btn-bg) !important;
  border: 1px solid var(--fixed-btn-border) !important;
  border-radius: 8px !important;
  /* 限制过渡属性，避免主题切换时边界闪烁 */
  transition: transform 0.2s ease, box-shadow 0.2s ease !important;
  animation: none !important;
  will-change: transform, box-shadow;
}

.history-button:hover,
.new-chat-button:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  /* 避免在主题切换瞬间对背景/边框做动画 */
  background: var(--fixed-btn-bg-hover) !important;
  /* 移除黑色边框效果 */
}

.history-button:active,
.new-chat-button:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

.history-button .button-text,
.new-chat-button .button-text {
  font-size: 12px !important;
  font-weight: 500 !important;
  color: var(--text) !important;
  margin-left: 2px !important;
  white-space: nowrap !important;
}

.history-button svg,
.new-chat-button svg {
  flex-shrink: 0 !important;
  width: 14px !important;
  height: 14px !important;
  color: var(--text) !important;
  stroke-width: 2 !important;
}









/* 保留fadeIn动画定义但不使用 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}

.user-message {
  background: var(--accent);
  color: white;
  margin-left: 20%;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}

.assistant-message {
  background: var(--surface);
  border: 1px solid var(--border);
  margin-right: 20%;
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}


</style>
