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

// 监听查询结果事件
const handleQueryResult = (event: CustomEvent) => {
  const { success, message, layerName, field, operator, value, count, error } = event.detail
  
  // 构造查询结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `查询完成：${message}`
  } else {
    resultMessage = `查询失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
}

// 监听保存结果事件
const handleSaveResult = (event: CustomEvent) => {
  const { success, message, layerName, count, error } = event.detail
  
  // 构造保存结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `保存完成：${message}`
  } else {
    resultMessage = `保存失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
}

// 监听导出结果事件
const handleExportResult = (event: CustomEvent) => {
  const { success, message, fileName, count, error } = event.detail
  
  // 构造导出结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `导出完成：${message}`
  } else {
    resultMessage = `导出失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
}

// 监听缓冲区分析结果事件
const handleBufferAnalysisResult = (event: CustomEvent) => {
  const { success, message, layerName, radius, unit, error } = event.detail
  
  // 构造缓冲区分析结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `缓冲区分析完成：${message}`
  } else {
    resultMessage = `缓冲区分析失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
  
  // 隐式发送消息到LLM
  if (success) {
    sendImplicitMessageToLLM(resultMessage)
  }
}

// 监听相交分析结果事件
const handleIntersectionAnalysisResult = (event: CustomEvent) => {
  const { success, message, targetLayerName, maskLayerName, error } = event.detail
  
  // 构造相交分析结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `相交分析完成：${message}`
  } else {
    resultMessage = `相交分析失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
  
  // 注意：相交分析的LLM通知现在由useIntersectionAnalysis.ts中的sendIntersectionResultToLLM处理
  // 这里不再调用sendImplicitMessageToLLM，避免重复发送
}

// 监听擦除分析结果事件
const handleEraseAnalysisResult = (event: CustomEvent) => {
  const { success, message, targetLayerName, eraseLayerName, error } = event.detail
  
  // 构造擦除分析结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `擦除分析完成：${message}`
  } else {
    resultMessage = `擦除分析失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
  
  // 隐式发送消息到LLM
  if (success) {
    sendImplicitMessageToLLM(resultMessage)
  }
}

// 监听最短路径分析结果事件
const handlePathAnalysisResult = (event: CustomEvent) => {
  const { success, message, startLayerName, endLayerName, error } = event.detail
  
  // 构造最短路径分析结果消息
  let resultMessage = ''
  if (success) {
    resultMessage = `最短路径分析完成：${message}`
  } else {
    resultMessage = `最短路径分析失败：${error || '未知错误'}`
  }
  
  // 将结果添加到聊天记录中
  messages.value.push({ 
    id: Date.now(), 
    text: resultMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
  
  // 隐式发送消息到LLM
  if (success) {
    sendImplicitMessageToLLM(resultMessage)
  }
}

// 监听LLM分析结果接收事件
const handleLLMAnalysisResultReceived = (event: CustomEvent) => {
  const { analysisType, resultMessage, llmResponse, additionalData } = event.detail
  
  console.log('[ChatAssistant] 收到LLM分析结果:', {
    analysisType,
    resultMessage,
    llmResponse: llmResponse?.substring(0, 100) + '...',
    additionalData
  })
  
  // 将LLM响应添加到聊天记录中
  if (llmResponse) {
    messages.value.push({ 
      id: Date.now(), 
      text: llmResponse, 
      sender: 'system' 
    })
    
    // 滚动到底部显示新消息
    nextTick(() => {
      messagesPanelRef.value?.scrollToBottom()
    })
  }
}

// 监听LLM分析结果错误事件
const handleLLMAnalysisResultError = (event: CustomEvent) => {
  const { analysisType, error } = event.detail
  
  console.error('[ChatAssistant] LLM分析结果处理错误:', {
    analysisType,
    error
  })
  
  // 将错误消息添加到聊天记录中
  const errorMessage = `[${analysisType}] LLM处理失败：${error}`
  messages.value.push({ 
    id: Date.now(), 
    text: errorMessage, 
    sender: 'system' 
  })
  
  // 滚动到底部显示新消息
  nextTick(() => {
    messagesPanelRef.value?.scrollToBottom()
  })
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
  
  // 监听查询结果事件 - 只注册一次
  if (!(window as any).__queryResultListenerRegistered) {
    (window as any).__queryResultListenerRegistered = true
    window.addEventListener('agent:queryResult', handleQueryResult as EventListener)
    window.addEventListener('agent:saveResult', handleSaveResult as EventListener)
    window.addEventListener('agent:exportResult', handleExportResult as EventListener)
    window.addEventListener('agent:bufferAnalysisResult', handleBufferAnalysisResult as EventListener)
    window.addEventListener('agent:intersectionAnalysisResult', handleIntersectionAnalysisResult as EventListener)
    window.addEventListener('llm:analysisResultReceived', handleLLMAnalysisResultReceived as EventListener)
    window.addEventListener('llm:analysisResultError', handleLLMAnalysisResultError as EventListener)
    window.addEventListener('agent:eraseAnalysisResult', handleEraseAnalysisResult as EventListener)
    window.addEventListener('agent:pathAnalysisResult', handlePathAnalysisResult as EventListener)
  }
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
  if ((window as any).__queryResultListenerRegistered) {
    window.removeEventListener('agent:queryResult', handleQueryResult as EventListener)
    window.removeEventListener('agent:saveResult', handleSaveResult as EventListener)
    window.removeEventListener('agent:exportResult', handleExportResult as EventListener)
    window.removeEventListener('agent:bufferAnalysisResult', handleBufferAnalysisResult as EventListener)
    window.removeEventListener('agent:intersectionAnalysisResult', handleIntersectionAnalysisResult as EventListener)
    window.removeEventListener('agent:eraseAnalysisResult', handleEraseAnalysisResult as EventListener)
    window.removeEventListener('agent:pathAnalysisResult', handlePathAnalysisResult as EventListener)
    window.removeEventListener('llm:analysisResultReceived', handleLLMAnalysisResultReceived as EventListener)
    window.removeEventListener('llm:analysisResultError', handleLLMAnalysisResultError as EventListener)
    ;(window as any).__queryResultListenerRegistered = false
  }
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

// 隐式发送消息到LLM（用于分析结果反馈）
const sendImplicitMessageToLLM = async (resultMessage: string) => {
  try {
    const apiBase = getAgentApiBaseUrl()
    // 使用相同的会话ID
    const convId = sessionStorage.getItem('agent_conv_id') || (() => {
      const v = `conv-${Date.now()}`
      sessionStorage.setItem('agent_conv_id', v)
      return v
    })()
    
    // 构造包含历史记录的完整prompt
    let conversationContext = ''
    if (messages.value.length > 0) {
      conversationContext = '对话历史：\n'
      messages.value.forEach(msg => {
        const role = msg.sender === 'user' ? '用户' : '助手'
        conversationContext += `${role}: ${msg.text}\n`
      })
      conversationContext += '\n'
    }
    
    // 构造完整的prompt
    const fullPrompt = `${conversationContext}分析结果反馈：${resultMessage}。请根据这个结果给出适当的回应或建议。`
    
    const llm = getLLMApiConfig()
    const payload = {
      model: 'qwen-max',
      temperature: typeof llm.temperature === 'number' ? llm.temperature : 0.7,
      prompt: fullPrompt,
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

    if (resp.ok) {
      const data = await resp.json()
      const content = data?.data?.final_answer || '[空响应]'
      
      // 将LLM的回应添加到聊天记录中
      messages.value.push({ 
        id: Date.now() + 1, 
        text: content, 
        sender: 'system' 
      })
      
      // 滚动到底部显示新消息
      nextTick(() => {
        messagesPanelRef.value?.scrollToBottom()
      })
    } else {
      console.error('隐式LLM请求失败:', resp.status, await resp.text())
    }
  } catch (e: any) {
    console.error('隐式LLM请求异常:', e?.message || e)
  }
}

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
        
        // 调试：打印AI实际调用的工具名称
        // 如果是切换图层可见性的工具，则在前端本地执行具体动作
        if (name === 'toggle_layer_visibility') {
          try {
            const parsed = call?.args || {}
            // 仅使用 layer_name 参数
            const layerName = parsed.layer_name || parsed.layerName
            const action = parsed.action
            if (layerName && action) {
              const ev = new CustomEvent('agent:toggleLayerVisibility', { detail: { layerName, action } })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:toggleLayerVisibility', { layerName, action })
            }
          } catch {}
        }
        
        // 如果是按属性查询要素的工具，则在前端本地执行具体动作
        if (name === 'query_features_by_attribute') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            const field = parsed.field
            const operator = parsed.operator
            const value = parsed.value
            
            if (layerName && field && operator && value !== undefined) {
              const eventDetail = { layerName, field, operator, value }
              const ev = new CustomEvent('agent:queryFeaturesByAttribute', { 
                detail: eventDetail 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:queryFeaturesByAttribute', eventDetail)
            }
          } catch (error) {
            console.error('[Agent] 处理属性查询工具调用时出错:', error)
          }
        }
        
        // 如果是保存查询结果为图层的工具
        if (name === 'save_query_results_as_layer') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            
            if (layerName) {
              const ev = new CustomEvent('agent:saveQueryResultsAsLayer', { 
                detail: { layerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:saveQueryResultsAsLayer', { layerName })
            }
          } catch (error) {
            console.error('[Agent] 处理保存查询结果工具调用时出错:', error)
          }
        }
        
        // 如果是导出查询结果为JSON的工具
        if (name === 'export_query_results_as_json') {
          try {
            const parsed = call?.args || {}
            const fileName = parsed.file_name || parsed.fileName
            
            if (fileName) {
              const ev = new CustomEvent('agent:exportQueryResultsAsJson', { 
                detail: { fileName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:exportQueryResultsAsJson', { fileName })
            }
          } catch (error) {
            console.error('[Agent] 处理导出查询结果工具调用时出错:', error)
          }
        }
        
        // 如果是缓冲区分析工具
        if (name === 'execute_buffer_analysis') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            const radius = parsed.radius
            const unit = parsed.unit || 'meters'
            
            if (layerName && radius !== undefined) {
              const ev = new CustomEvent('agent:executeBufferAnalysis', { 
                detail: { layerName, radius, unit } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:executeBufferAnalysis', { layerName, radius, unit })
            }
          } catch (error) {
            console.error('[Agent] 处理缓冲区分析工具调用时出错:', error)
          }
        }
        
        // 如果是相交分析工具
        if (name === 'execute_intersection_analysis') {
          try {
            const parsed = call?.args || {}
            const targetLayerName = parsed.target_layer_name || parsed.targetLayerName
            const maskLayerName = parsed.mask_layer_name || parsed.maskLayerName
            
            if (targetLayerName && maskLayerName) {
              const ev = new CustomEvent('agent:executeIntersectionAnalysis', { 
                detail: { targetLayerName, maskLayerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:executeIntersectionAnalysis', { targetLayerName, maskLayerName })
            }
          } catch (error) {
            console.error('[Agent] 处理相交分析工具调用时出错:', error)
          }
        }
        
        // 如果是保存相交分析结果为图层的工具
        if (name === 'save_intersection_results_as_layer') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            
            if (layerName) {
              const ev = new CustomEvent('agent:saveIntersectionResultsAsLayer', { 
                detail: { layerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:saveIntersectionResultsAsLayer', { layerName })
            }
          } catch (error) {
            console.error('[Agent] 处理保存相交分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是导出相交分析结果为JSON的工具
        if (name === 'export_intersection_results_as_json') {
          try {
            const parsed = call?.args || {}
            const fileName = parsed.file_name || parsed.fileName
            
            if (fileName) {
              const ev = new CustomEvent('agent:exportIntersectionResultsAsJson', { 
                detail: { fileName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:exportIntersectionResultsAsJson', { fileName })
            }
          } catch (error) {
            console.error('[Agent] 处理导出相交分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是擦除分析工具
        if (name === 'execute_erase_analysis') {
          try {
            const parsed = call?.args || {}
            const targetLayerName = parsed.target_layer_name || parsed.targetLayerName
            const eraseLayerName = parsed.erase_layer_name || parsed.eraseLayerName
            
            if (targetLayerName && eraseLayerName) {
              const ev = new CustomEvent('agent:executeEraseAnalysis', { 
                detail: { targetLayerName, eraseLayerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:executeEraseAnalysis', { targetLayerName, eraseLayerName })
            }
          } catch (error) {
            console.error('[Agent] 处理擦除分析工具调用时出错:', error)
          }
        }
        
        // 如果是最短路径分析工具
        if (name === 'execute_shortest_path_analysis') {
          try {
            const parsed = call?.args || {}
            const startLayerName = parsed.start_layer_name || parsed.startLayerName
            const endLayerName = parsed.end_layer_name || parsed.endLayerName
            const obstacleLayerName = parsed.obstacle_layer_name || parsed.obstacleLayerName || ''
            
            if (startLayerName && endLayerName) {
              const ev = new CustomEvent('agent:executeShortestPathAnalysis', { 
                detail: { startLayerName, endLayerName, obstacleLayerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:executeShortestPathAnalysis', { startLayerName, endLayerName, obstacleLayerName })
            }
          } catch (error) {
            console.error('[Agent] 处理最短路径分析工具调用时出错:', error)
          }
        }
        
        // 如果是保存缓冲区分析结果为图层的工具
        if (name === 'save_buffer_results_as_layer') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            
            console.log('[Agent] 准备分发保存缓冲区分析结果事件:', { layerName, parsed })
            
            if (layerName) {
              const ev = new CustomEvent('agent:saveBufferResultsAsLayer', { 
                detail: { layerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:saveBufferResultsAsLayer', { layerName })
              
              // 测试事件是否被正确分发
              setTimeout(() => {
                console.log('[Agent] 事件分发后检查 - 3秒后')
              }, 3000)
            } else {
              console.warn('[Agent] 保存缓冲区分析结果事件分发失败 - 缺少layerName:', { layerName, parsed })
            }
          } catch (error) {
            console.error('[Agent] 处理保存缓冲区分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是导出缓冲区分析结果为JSON的工具
        if (name === 'export_buffer_results_as_json') {
          try {
            const parsed = call?.args || {}
            const fileName = parsed.file_name || parsed.fileName
            
            if (fileName) {
              const ev = new CustomEvent('agent:exportBufferResultsAsJson', { 
                detail: { fileName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:exportBufferResultsAsJson', { fileName })
            }
          } catch (error) {
            console.error('[Agent] 处理导出缓冲区分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是保存擦除分析结果为图层的工具
        if (name === 'save_erase_results_as_layer') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            
            if (layerName) {
              const ev = new CustomEvent('agent:saveEraseResultsAsLayer', { 
                detail: { layerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:saveEraseResultsAsLayer', { layerName })
            }
          } catch (error) {
            console.error('[Agent] 处理保存擦除分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是导出擦除分析结果为JSON的工具
        if (name === 'export_erase_results_as_json') {
          try {
            const parsed = call?.args || {}
            const fileName = parsed.file_name || parsed.fileName
            
            if (fileName) {
              const ev = new CustomEvent('agent:exportEraseResultsAsJson', { 
                detail: { fileName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:exportEraseResultsAsJson', { fileName })
            }
          } catch (error) {
            console.error('[Agent] 处理导出擦除分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是保存最短路径分析结果为图层的工具
        if (name === 'save_path_results_as_layer') {
          try {
            const parsed = call?.args || {}
            const layerName = parsed.layer_name || parsed.layerName
            
            if (layerName) {
              const ev = new CustomEvent('agent:savePathResultsAsLayer', { 
                detail: { layerName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:savePathResultsAsLayer', { layerName })
            }
          } catch (error) {
            console.error('[Agent] 处理保存最短路径分析结果工具调用时出错:', error)
          }
        }
        
        // 如果是导出最短路径分析结果为JSON的工具
        if (name === 'export_path_results_as_json') {
          try {
            const parsed = call?.args || {}
            const fileName = parsed.file_name || parsed.fileName
            
            if (fileName) {
              const ev = new CustomEvent('agent:exportPathResultsAsJson', { 
                detail: { fileName } 
              })
              window.dispatchEvent(ev)
              console.log('[Agent] dispatched event: agent:exportPathResultsAsJson', { fileName })
            }
          } catch (error) {
            console.error('[Agent] 处理导出最短路径分析结果工具调用时出错:', error)
          }
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

// 暴露方法给父组件
defineExpose({
  startNewConversation,
  showChatHistory
});
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

