import { getAgentApiBaseUrl, getLLMApiConfig } from '@/utils/config'

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'system';
}

/**
 * 向LLM发送分析结果消息
 * @param analysisType 分析类型
 * @param resultMessage 结果消息
 * @param additionalData 额外数据
 */
export const sendAnalysisResultToLLM = async (
  analysisType: string,
  resultMessage: string,
  additionalData?: any
): Promise<void> => {
  try {
    // 获取当前聊天历史记录
    const currentMessages = getCurrentChatMessages()
    
    // 构造分析结果消息
    const analysisResultMessage = `[${analysisType}分析完成] ${resultMessage}`
    
    // 将分析结果添加到消息历史中
    const newMessage: Message = {
      id: Date.now(),
      text: analysisResultMessage,
      sender: 'system'
    }
    
    // 更新本地消息历史
    updateLocalChatMessages(newMessage)
    
    // 获取会话ID
    const convId = sessionStorage.getItem('agent_conv_id') || (() => {
      const v = `conv-${Date.now()}`
      sessionStorage.setItem('agent_conv_id', v)
      return v
    })()
    
    // 构造发送给LLM的完整消息历史
    const messagesToSend = [...currentMessages, newMessage]
    
    // 构造LLM请求数据
    const apiBase = getAgentApiBaseUrl()
    const llm = getLLMApiConfig()
    
    const payload = {
      model: 'qwen-max',
      temperature: typeof llm.temperature === 'number' ? llm.temperature : 0.7,
      prompt: analysisResultMessage,
      stream: false,
      conversation_id: convId,
      // 包含完整的聊天历史
      chat_history: messagesToSend.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      // 包含分析结果数据
      analysis_result: {
        type: analysisType,
        message: resultMessage,
        data: additionalData,
        timestamp: new Date().toISOString()
      }
    }
    
    console.log('[LLM通知] 发送分析结果到LLM:', {
      analysisType,
      resultMessage,
      messageCount: messagesToSend.length,
      conversationId: convId
    })
    
    // 发送请求到LLM
    const response = await fetch(`${apiBase}/agent/tool-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[LLM通知] 发送失败:', errorText)
      throw new Error(`LLM请求失败(${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    console.log('[LLM通知] LLM响应:', data)
    
    // 处理LLM响应
    if (data?.data?.final_answer) {
      const llmResponse: Message = {
        id: Date.now() + 1,
        text: data.data.final_answer,
        sender: 'system'
      }
      
      // 更新本地消息历史
      updateLocalChatMessages(llmResponse)
      
      // 触发UI更新事件
      window.dispatchEvent(new CustomEvent('llm:analysisResultReceived', {
        detail: {
          analysisType,
          resultMessage,
          llmResponse: data.data.final_answer,
          additionalData
        }
      }))
    }
    
  } catch (error) {
    console.error('[LLM通知] 发送分析结果到LLM时出错:', error)
    
    // 发送错误通知
    window.dispatchEvent(new CustomEvent('llm:analysisResultError', {
      detail: {
        analysisType,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }))
  }
}

/**
 * 获取当前聊天消息历史
 */
const getCurrentChatMessages = (): Message[] => {
  try {
    // 从modeStateStore获取当前消息
    const llmState = JSON.parse(localStorage.getItem('llm_state') || '{}')
    const messages = llmState.messages || []
    
    console.log('[LLM通知] 获取聊天历史:', {
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.text?.substring(0, 50) + '...'
    })
    
    return messages
  } catch (error) {
    console.error('[LLM通知] 获取聊天历史失败:', error)
    return []
  }
}

/**
 * 更新本地聊天消息历史
 */
const updateLocalChatMessages = (newMessage: Message): void => {
  try {
    // 获取当前状态
    const llmState = JSON.parse(localStorage.getItem('llm_state') || '{}')
    const currentMessages = llmState.messages || []
    
    // 添加新消息
    const updatedMessages = [...currentMessages, newMessage]
    
    // 更新状态
    const updatedState = {
      ...llmState,
      messages: updatedMessages,
      lastUpdated: new Date().toISOString()
    }
    
    localStorage.setItem('llm_state', JSON.stringify(updatedState))
    
    console.log('[LLM通知] 更新本地聊天历史:', {
      messageId: newMessage.id,
      totalMessages: updatedMessages.length
    })
    
  } catch (error) {
    console.error('[LLM通知] 更新本地聊天历史失败:', error)
  }
}

/**
 * 发送相交分析结果到LLM
 */
export const sendIntersectionResultToLLM = async (
  resultMessage: string,
  featureCount: number,
  additionalData?: any
): Promise<void> => {
  await sendAnalysisResultToLLM(
    '相交分析',
    resultMessage,
    {
      featureCount,
      analysisType: 'intersection',
      ...additionalData
    }
  )
}

/**
 * 发送缓冲区分析结果到LLM
 */
export const sendBufferResultToLLM = async (
  resultMessage: string,
  featureCount: number,
  additionalData?: any
): Promise<void> => {
  await sendAnalysisResultToLLM(
    '缓冲区分析',
    resultMessage,
    {
      featureCount,
      analysisType: 'buffer',
      ...additionalData
    }
  )
}

/**
 * 发送擦除分析结果到LLM
 */
export const sendEraseResultToLLM = async (
  resultMessage: string,
  featureCount: number,
  additionalData?: any
): Promise<void> => {
  await sendAnalysisResultToLLM(
    '擦除分析',
    resultMessage,
    {
      featureCount,
      analysisType: 'erase',
      ...additionalData
    }
  )
}

/**
 * 发送最短路径分析结果到LLM
 */
export const sendShortestPathResultToLLM = async (
  resultMessage: string,
  pathLength?: number,
  additionalData?: any
): Promise<void> => {
  await sendAnalysisResultToLLM(
    '最短路径分析',
    resultMessage,
    {
      pathLength,
      analysisType: 'shortest_path',
      ...additionalData
    }
  )
}
