<template>
  <div class="chat-assistant">
    <!-- 顶部头部区域：为按钮预留高度，避免遮挡内容 -->
    <div class="chat-header">
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
    
    <!-- 工具调用提示区域（当AI调用了工具时显示） -->
    <div v-if="toolCallInfo" class="tool-call-banner">
      <div class="tool-call-left">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
        <div class="tool-meta">
          <div class="tool-name">工具调用：{{ toolCallInfo.name }}</div>
          <div class="tool-args" v-if="toolCallInfo.argsStr">参数：{{ toolCallInfo.argsStr }}</div>
        </div>
      </div>
      <div class="tool-result" v-if="toolCallInfo.resultStr">结果：{{ toolCallInfo.resultStr }}</div>
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
import { getAgentApiBaseUrl, getLLMApiConfig } from '@/utils/config'

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
const toolCallInfo = ref<{ name: string; argsStr: string; resultStr: string } | null>(null);
const nextAssistantOverride = ref<string | null>(null);

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
const sendMessage = async () => {
  const message = newMessage.value.trim()
  if (!message) return

  messages.value.push({ id: Date.now(), text: message, sender: 'user' })

  const apiBase = getAgentApiBaseUrl()
  // 使用路由路径+时间戳派生一个稳定会话ID（同页会话期间不变）
  const convId = sessionStorage.getItem('agent_conv_id') || (() => {
    const v = `conv-${Date.now()}`
    sessionStorage.setItem('agent_conv_id', v)
    return v
  })()
  const userMsg = { role: 'user', content: message }

  try {
    const llm = getLLMApiConfig()
    const payload = {
      model: 'qwen-max',
      temperature: typeof llm.temperature === 'number' ? llm.temperature : 0.7,
      prompt: message,
      stream: false,
      conversation_id: convId
    }
    const resp = await fetch(`${apiBase}/agent/tool-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      const errText = await resp.text()
      messages.value.push({ id: Date.now() + 1, text: `LLM请求失败(${resp.status}): ${errText}`, sender: 'system' })
    } else {
      const data = await resp.json()
      const firstCall = data?.data?.first_call
      const toolCalls = firstCall?.tool_calls || []
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        const call = toolCalls[0]
        const name = call?.name || 'unknown'
        const argsStr = call?.args ? JSON.stringify(call.args) : ''
        const resultStr = data?.data?.tool_result != null ? String(data.data.tool_result) : ''
        toolCallInfo.value = { name, argsStr, resultStr }
        // 如果是切换图层可见性的工具，则在前端本地执行具体动作
        if (name === 'toggle_layer_visibility') {
          try {
            const parsed = call?.args || {}
            // 支持 layer_id 或 layer_name 入参
            let layerId = parsed.layer_id || parsed.layerId
            let layerName = parsed.layer_name || parsed.layerName
            const action = parsed.action
            // 兼容模型仅提供一个字段的情况：互为回填
            if (!layerName && layerId) layerName = layerId
            if (!layerId && layerName) layerId = layerName
            if ((layerId || layerName) && action) {
              const ev = new CustomEvent('agent:toggleLayerVisibility', { detail: { layerId, layerName, action } })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:toggleLayerVisibility', { layerId, layerName, action })
            }
          } catch {}
        }
      } else {
        toolCallInfo.value = null
      }
      const content = nextAssistantOverride.value || data?.data?.final_answer || '[空响应]'
      messages.value.push({ id: Date.now() + 1, text: content, sender: 'system' })
      nextAssistantOverride.value = null
    }
  } catch (e: any) {
    messages.value.push({ id: Date.now() + 2, text: `LLM请求异常: ${e?.message || e}`, sender: 'system' })
  }

  newMessage.value = ''
}

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
  background: var(--bg);
}

.chat-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 2px 6px;
  min-height: 26px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

/* 工具调用提示样式 */
.tool-call-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px dashed var(--border);
  background: var(--surface);
}
.tool-call-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}
.tool-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tool-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.tool-args,
.tool-result {
  font-size: 12px;
  color: var(--sub);
  word-break: break-all;
}


.history-button,
.new-chat-button {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 4px 10px !important;
  width: auto !important;
  height: auto !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  transition: all 0.2s ease !important;
  animation: none !important;
}

.history-button:hover,
.new-chat-button:hover {
  transform: none !important;
  box-shadow: none !important;
  background: var(--surface-hover) !important;
  border-color: var(--accent) !important;
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
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  margin-left: 20%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}

.assistant-message {
  background: var(--surface);
  border: 1px solid var(--border);
  margin-right: 20%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  /* 禁用动画，防止主题切换闪烁 */
  animation: none !important;
}


</style>

