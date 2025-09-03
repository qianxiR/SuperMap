import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { getAPIConfig } from '@/api/config'

// 接口定义
interface UserRegisterRequest {
  username: string
  email: string
  phone?: string
  password: string
  confirm_password: string
}

interface UserLoginRequest {
  login_identifier: string
  password: string
}

interface ApiResponse<T = any> {
  success: boolean
  message: string
  detail?: string  // 添加后端错误详情字段
  data?: T
  token?: string
}

export function useRegister() {
  const router = useRouter()
  const userStore = useUserStore()
  
  // 响应式数据
  const loading = ref(false)
  const username = ref('')
  const email = ref('')
  const phone = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  
  // 表单验证
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // 用户名验证
    if (!username.value.trim()) {
      errors.push('用户名不能为空')
    } else if (username.value.trim().length < 3) {
      errors.push('用户名至少3个字符')
    } else if (username.value.trim().length > 50) {
      errors.push('用户名不能超过50个字符')
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.value.trim())) {
      errors.push('用户名只能包含字母、数字和下划线')
    }
    
    // 邮箱验证
    if (!email.value.trim()) {
      errors.push('邮箱不能为空')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      errors.push('邮箱格式不正确')
    }
    
    // 手机号验证（可选）
    if (phone.value.trim() && !/^1[3-9]\d{9}$/.test(phone.value.trim())) {
      errors.push('手机号格式不正确')
    }
    
    // 密码验证
    if (!password.value) {
      errors.push('密码不能为空')
    } else if (password.value.length < 6) {
      errors.push('密码至少6个字符')
    } else if (password.value.length > 100) {
      errors.push('密码不能超过100个字符')
    }
    
    // 确认密码验证
    if (!confirmPassword.value) {
      errors.push('确认密码不能为空')
    } else if (password.value !== confirmPassword.value) {
      errors.push('密码和确认密码不匹配')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // 注册API实现
  const register = async (userData: UserRegisterRequest): Promise<ApiResponse> => {
    try {
      const baseUrl = `${getAPIConfig().baseUrl}/user`
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // 优先使用后端的 detail 字段，然后是 message 字段
        const errorMessage = result.detail || result.message || '注册失败'
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        ;(error as any).statusText = response.statusText
        ;(error as any).response = result
        ;(error as any).detail = result.detail  // 保存后端的详细错误信息
        throw error
      }

      return result
    } catch (error) {
      console.error('注册API调用失败:', error)
      throw error
    }
  }

  // 登录API实现
  const login = async (loginData: UserLoginRequest): Promise<ApiResponse> => {
    try {
      const baseUrl = `${getAPIConfig().baseUrl}/user`
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      const result = await response.json()
      
      if (!response.ok) {
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

  // 同步用户信息API
  const syncUserInfoAfterRegister = async (token: string, userData?: any): Promise<boolean> => {
    try {
      // 先保存本地数据到localStorage
      if (userData) {
        localStorage.setItem('userInfo', JSON.stringify(userData))
        localStorage.setItem('authToken', token)
      }
      
      // 从后端获取完整的用户信息
      const baseUrl = `${getAPIConfig().baseUrl}/user`
      const response = await fetch(`${baseUrl}/me`, {
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

      if (result.success && result.data) {
        // 更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(result.data))
        localStorage.setItem('userInfoLastUpdate', new Date().toISOString())
      }
      return result.success
    } catch (error) {
      console.warn('获取用户信息失败，使用本地数据:', error)
      return false
    }
  }

  // 处理注册
  const handleRegister = async (): Promise<boolean> => {
    loading.value = true
    
    try {
      // 表单验证
      const validation = validateForm()
      if (!validation.isValid) {
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '注册失败',
            message: validation.errors.join('、'),
            type: 'error',
            duration: 5000
          }
        }))
        return false
      }
      
      // 调用后端注册API
      const registerData = {
        username: username.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || undefined,
        password: password.value,
        confirm_password: confirmPassword.value
      }
      
      const response = await register(registerData)
      
      if (response.success) {
        // 注册成功后自动登录
        const loginData = {
          login_identifier: username.value.trim(),
          password: password.value
        }
        
        const loginResponse = await login(loginData)
        
        if (loginResponse.success && loginResponse.token) {
          const userData = {
            username: username.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            registerType: 'phone',
            role: 'user',
            registerTime: new Date().toISOString()
          }
          
          // 使用store管理登录状态
          userStore.login(userData, loginResponse.token)
          
          // 从后端获取完整的用户信息
          try {
            await syncUserInfoAfterRegister(loginResponse.token, userData)
            // 更新store状态
            userStore.syncUserInfoFromStorage()
          } catch (error) {
            console.warn('获取用户信息失败，使用本地数据:', error)
          }
          
          // 异步显示注册成功通知
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('showNotification', {
              detail: {
                title: '注册成功',
                message: `欢迎加入，${username.value.trim()}！`,
                type: 'success',
                duration: 3000
              }
            }))
          }, 100)
          
          // 跳转到地图系统
          router.push('/dashboard')
          return true
        } else {
          // 注册成功但自动登录失败
          window.dispatchEvent(new CustomEvent('showNotification', {
            detail: {
              title: '注册成功',
              message: '注册成功，但自动登录失败，请手动登录',
              type: 'warning',
              duration: 5000
            }
          }))
          
          // 跳转到登录页
          router.push('/login')
          return false
        }
      } else {
        // 处理注册失败 - 显示后端返回的具体错误信息
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '注册失败',
            message: response.detail || response.message || '注册失败，请稍后重试',
            type: 'error',
            duration: 5000
          }
        }))
        return false
      }
    } catch (error: any) {
      // 处理网络错误或其他异常
      let errorMessage = '注册失败，请稍后重试'
      let errorTitle = '注册失败'
      
      // 优先使用后端返回的详细错误信息
      if (error.detail) {
        errorMessage = error.detail
        // 根据后端返回的具体错误信息判断错误类型
        if (error.detail.includes('用户名') || error.detail.includes('已存在') || 
            error.detail.includes('至少2个字符') || error.detail.includes('不能超过50个字符') ||
            error.detail.includes('只能包含字母、数字和下划线')) {
          errorTitle = '用户名错误'
        } else if (error.detail.includes('邮箱') || error.detail.includes('邮箱已存在') || 
                   error.detail.includes('邮箱格式不正确') || error.detail.includes('@')) {
          errorTitle = '邮箱错误'
        } else if (error.detail.includes('手机号') || error.detail.includes('手机号已存在') || 
                   error.detail.includes('手机号格式')) {
          errorTitle = '手机号错误'
        } else if (error.detail.includes('密码') || error.detail.includes('至少6个字符') || 
                   error.detail.includes('不能超过100个字符') || error.detail.includes('不匹配')) {
          errorTitle = '密码错误'
        } else if (error.detail.includes('确认密码') || error.detail.includes('不匹配')) {
          errorTitle = '确认密码错误'
        }
      } else if (error.message) {
        errorMessage = error.message
        // 同样根据错误信息内容判断错误类型
        if (error.message.includes('用户名') || error.message.includes('已存在') || 
            error.message.includes('至少2个字符') || error.message.includes('不能超过50个字符') ||
            error.message.includes('只能包含字母、数字和下划线')) {
          errorTitle = '用户名错误'
        } else if (error.message.includes('邮箱') || error.message.includes('邮箱已存在') || 
                   error.message.includes('邮箱格式不正确') || error.message.includes('@')) {
          errorTitle = '邮箱错误'
        } else if (error.message.includes('手机号') || error.message.includes('手机号已存在') || 
                   error.message.includes('手机号格式')) {
          errorTitle = '手机号错误'
        } else if (error.message.includes('密码') || error.message.includes('至少6个字符') || 
                   error.message.includes('不能超过100个字符') || error.message.includes('不匹配')) {
          errorTitle = '密码错误'
        } else if (error.message.includes('确认密码') || error.message.includes('不匹配')) {
          errorTitle = '确认密码错误'
        }
      } else if (error.status === 400) {
        errorMessage = '请求参数错误'
      } else if (error.status === 409) {
        errorMessage = '用户名或邮箱已存在'
        errorTitle = '用户已存在'
      } else if (error.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      }
      
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: errorTitle,
          message: errorMessage,
          type: 'error',
          duration: 5000
        }
      }))
      
      console.error('注册失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }
  
  // 重置表单
  const resetForm = () => {
    username.value = ''
    email.value = ''
    phone.value = ''
    password.value = ''
    confirmPassword.value = ''
  }
  
  // 检查用户名是否可用
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      // 这里可以调用后端API检查用户名是否可用
      // 暂时返回true，表示可用
      return true
    } catch (error) {
      console.error('检查用户名可用性失败:', error)
      return false
    }
  }
  
  // 检查邮箱是否可用
  const checkEmailAvailability = async (email: string): Promise<boolean> => {
    try {
      // 这里可以调用后端API检查邮箱是否可用
      // 暂时返回true，表示可用
      return true
    } catch (error) {
      console.error('检查邮箱可用性失败:', error)
      return false
    }
  }
  
  // 检查手机号是否可用
  const checkPhoneAvailability = async (phone: string): Promise<boolean> => {
    try {
      // 这里可以调用后端API检查手机号是否可用
      // 暂时返回true，表示可用
      return true
    } catch (error) {
      console.error('检查手机号可用性失败:', error)
      return false
    }
  }
  
  return {
    // 响应式数据
    loading,
    username,
    email,
    phone,
    password,
    confirmPassword,
    
    // 方法
    handleRegister,
    validateForm,
    resetForm,
    checkUsernameAvailability,
    checkEmailAvailability,
    checkPhoneAvailability
  }
}
