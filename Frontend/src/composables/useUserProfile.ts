import { ref } from 'vue'
import { getUserServiceConfig } from '@/api/config'

// 接口定义
interface UserUpdateRequest {
  old_username: string
  new_username?: string
  old_email: string
  new_email?: string
  old_phone?: string
  new_phone?: string
}

interface PasswordChangeRequest {
  current_password: string
  new_password: string
  confirm_new_password: string
}

interface ApiResponse<T = any> {
  success: boolean
  message: string
  detail?: string  // 添加后端错误详情字段
  data?: T
  token?: string
}

export function useUserProfile() {
  // 响应式数据
  const loading = ref(false)

  // 更新用户资料API
  const updateProfile = async (token: string, updateData: UserUpdateRequest): Promise<ApiResponse> => {
    try {
      const baseUrl = getUserServiceConfig().baseUrl
      const response = await fetch(`${baseUrl}/user/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // 优先使用后端的 detail 字段，提供更具体的错误信息
        const errorMessage = result.detail || '更新用户资料失败'
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        ;(error as any).detail = result.detail
        throw error
      }

      return result
    } catch (error) {
      console.error('更新用户资料API调用失败:', error)
      throw error
    }
  }

  // 修改密码API
  const changePassword = async (token: string, passwordData: PasswordChangeRequest): Promise<ApiResponse> => {
    try {
      const baseUrl = getUserServiceConfig().baseUrl
      const response = await fetch(`${baseUrl}/user/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // 优先使用后端的 detail 字段，提供更具体的错误信息
        const errorMessage = result.detail || '修改密码失败'
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        ;(error as any).detail = result.detail
        throw error
      }

      return result
    } catch (error) {
      console.error('修改密码API调用失败:', error)
      throw error
    }
  }

  // 同步用户信息API
  const syncUserInfo = async (token: string): Promise<boolean> => {
    try {
      // 检查是否有token
      if (!token) {
        return false
      }
      
      // 检查本地用户信息是否完整
      const localUserInfo = localStorage.getItem('userInfo')
      if (!localUserInfo) {
        // 本地信息不完整，从后端获取
        const response = await getCurrentUser(token)
        return response.success
      }
      
      // 检查用户信息是否过期（这里可以根据需要设置过期时间）
      const lastUpdate = localStorage.getItem('userInfoLastUpdate')
      if (lastUpdate) {
        const lastUpdateTime = new Date(lastUpdate).getTime()
        const now = new Date().getTime()
        const oneHour = 60 * 60 * 1000 // 1小时
        
        if (now - lastUpdateTime > oneHour) {
          // 信息过期，从后端获取
          const response = await getCurrentUser(token)
          return response.success
        }
      }
      
      return true
    } catch (error) {
      console.error('同步用户信息失败:', error)
      return false
    }
  }

  // 获取当前用户信息API
  const getCurrentUser = async (token: string): Promise<ApiResponse> => {
    try {
      const baseUrl = getUserServiceConfig().baseUrl
      const response = await fetch(`${baseUrl}/user/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || '获取当前用户信息失败')
      }

      return result
    } catch (error) {
      console.error('获取当前用户信息API调用失败:', error)
      throw error
    }
  }

  // 检查用户信息完整性
  const isUserInfoComplete = (): boolean => {
    const userInfo = localStorage.getItem('userInfo')
    if (!userInfo) {
      return false
    }
    
    try {
      const parsedInfo = JSON.parse(userInfo)
      // 检查必需字段是否存在且有效
      const requiredFields = ['id', 'username', 'email']
      for (const field of requiredFields) {
        const value = parsedInfo[field]
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }

  return {
    loading,
    updateProfile,
    changePassword,
    syncUserInfo,
    getCurrentUser,
    isUserInfoComplete
  }
}
