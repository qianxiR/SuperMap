import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApiService } from '@/api/user'

export interface UserInfo {
  id: number
  username: string
  email: string
  phone?: string
  is_active: boolean
  registered_at: string
  role?: string
  accountType?: string
  loginTime?: string
  // 添加后端可能返回的其他字段
  is_superuser?: boolean
  created_at?: string
  updated_at?: string
  last_login?: string
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('authToken'))
  const userInfo = ref<UserInfo | null>(null)
  const isLoggedIn = computed(() => !!token.value)

  // 初始化用户信息
  const initUserInfo = () => {
    const storedUserInfo = localStorage.getItem('userInfo')
    if (storedUserInfo) {
      userInfo.value = JSON.parse(storedUserInfo)
    }
  }

  // 登录
  const login = (userData: any, authToken: string) => {
    token.value = authToken
    userInfo.value = userData
    
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('userInfo', JSON.stringify(userData))
  }

  // 从后端获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) {
      throw new Error('用户未登录')
    }

    try {
      const response = await userApiService.getCurrentUser(token.value)
      if (response.success && response.data) {
        userInfo.value = response.data
        localStorage.setItem('userInfo', JSON.stringify(response.data))
        return response.data
      } else {
        throw new Error(response.message || '获取用户信息失败')
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  // 更新用户信息
  const updateUserInfo = (newUserInfo: Partial<UserInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...newUserInfo }
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    }
  }

  // 登出
  const logout = () => {
    token.value = null
    userInfo.value = null
    
    localStorage.removeItem('authToken')
    localStorage.removeItem('userInfo')
  }

  // 检查登录状态
  const checkAuth = () => {
    const storedToken = localStorage.getItem('authToken')
    if (storedToken) {
      token.value = storedToken
      initUserInfo()
      return true
    }
    return false
  }

  // 初始化
  initUserInfo()

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout,
    checkAuth,
    initUserInfo,
    fetchUserInfo,
    updateUserInfo
  }
})
