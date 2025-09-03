import { useUserStore } from '@/stores/userStore'
import { getRequiredUserFields } from './fieldMapping'

/**
 * 用户信息同步工具
 * 保留实际使用的核心功能
 */

/**
 * 同步用户信息
 * 如果本地用户信息不完整或过期，从后端获取最新信息
 */
export async function syncUserInfo(): Promise<boolean> {
  const userStore = useUserStore()
  
  try {
    // 检查是否有token
    if (!userStore.token) {
      return false
    }
    
    // 检查本地用户信息是否完整
    const localUserInfo = userStore.userInfo
    if (!localUserInfo || !localUserInfo.id) {
      // 本地信息不完整，从后端获取
      await userStore.fetchUserInfo()
      return true
    }
    
    // 检查用户信息是否过期（这里可以根据需要设置过期时间）
    const lastUpdate = localStorage.getItem('userInfoLastUpdate')
    if (lastUpdate) {
      const lastUpdateTime = new Date(lastUpdate).getTime()
      const now = new Date().getTime()
      const oneHour = 60 * 60 * 1000 // 1小时
      
      if (now - lastUpdateTime > oneHour) {
        // 信息过期，从后端获取
        await userStore.fetchUserInfo()
        localStorage.setItem('userInfoLastUpdate', new Date().toISOString())
        return true
      }
    }
    
    return true
  } catch (error) {
    console.error('同步用户信息失败:', error)
    return false
  }
}

/**
 * 检查用户信息完整性
 */
export function isUserInfoComplete(): boolean {
  const userStore = useUserStore()
  const userInfo = userStore.userInfo
  
  if (!userInfo) {
    return false
  }
  
  // 检查必需字段是否存在且有效
  const requiredFields = getRequiredUserFields()
  for (const field of requiredFields) {
    const value = userInfo[field as keyof typeof userInfo]
    if (!value || 
        (typeof value === 'string' && value.trim() === '')) {
      return false
    }
  }
  
  return true
}
