import { getAPIConfig } from './config'

// 用户相关API接口
export interface UserRegisterRequest {
  username: string
  email: string
  phone?: string
  password: string
  confirm_password: string
}

export interface UserLoginRequest {
  login_identifier: string
  password: string
}

export interface UserUpdateRequest {
  old_username: string
  new_username?: string
  old_email: string
  new_email?: string
  old_phone?: string
  new_phone?: string
}

export interface PasswordChangeRequest {
  current_password: string
  new_password: string
  confirm_new_password: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  phone?: string
  is_active: boolean
  registered_at: string
  // 确保与后端实体字段完全一致
  is_superuser?: boolean
  created_at?: string
  updated_at?: string
  last_login?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  token?: string
}

// 用户API服务类
class UserApiService {
  private baseUrl = `${getAPIConfig().baseUrl}/user`

  // 用户注册
  async register(userData: UserRegisterRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // 创建包含HTTP状态码和详细错误信息的错误对象
        const error = new Error(result.detail || result.message || '注册失败')
        ;(error as any).status = response.status
        ;(error as any).statusText = response.statusText
        ;(error as any).response = result
        throw error
      }

      return result
    } catch (error) {
      console.error('注册API调用失败:', error)
      throw error
    }
  }

  // 用户登录
  async login(loginData: UserLoginRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // 创建包含HTTP状态码和详细错误信息的错误对象
        const error = new Error(result.detail || result.message || '登录失败')
        ;(error as any).status = response.status
        ;(error as any).statusText = response.statusText
        ;(error as any).response = result
        throw error
      }

      return result
    } catch (error) {
      console.error('登录API调用失败:', error)
      throw error
    }
  }

  // 获取用户资料
  async getProfile(token: string): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || '获取用户资料失败')
      }

      return result
    } catch (error) {
      console.error('获取用户资料API调用失败:', error)
      throw error
    }
  }

  // 获取当前用户信息
  async getCurrentUser(token: string): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
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

  // 更新用户资料
  async updateProfile(token: string, updateData: UserUpdateRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || '更新用户资料失败')
      }

      return result
    } catch (error) {
      console.error('更新用户资料API调用失败:', error)
      throw error
    }
  }

  // 修改密码
  async changePassword(token: string, passwordData: PasswordChangeRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || '修改密码失败')
      }

      return result
    } catch (error) {
      console.error('修改密码API调用失败:', error)
      throw error
    }
  }

  // 用户登出
  async logout(token: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || '登出失败')
      }

      return result
    } catch (error) {
      console.error('登出API调用失败:', error)
      throw error
    }
  }

  // 获取用户统计信息
  async getUserStats(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || '获取用户统计信息失败')
      }

      return result
    } catch (error) {
      console.error('获取用户统计信息API调用失败:', error)
      throw error
    }
  }
}

// 导出API服务实例
export const userApiService = new UserApiService()
