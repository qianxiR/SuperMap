import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { getUserServiceConfig } from '@/api/config'

// 接口定义
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

export function useLogin() {
  const router = useRouter()
  const userStore = useUserStore()
  
  // 响应式数据
  const loading = ref(false)
  const account = ref('')
  const password = ref('')
  const rememberPassword = ref(false)
  
  // 获取账户类型
  const getAccountType = (value: string): 'username' | 'email' | 'phone' => {
    if (value.includes('@')) {
      return 'email'
    } else if (/^1[3-9]\d{9}$/.test(value)) {
      return 'phone'
    } else {
      return 'username'
    }
  }
  
  // 登录API实现
  const login = async (loginData: UserLoginRequest): Promise<ApiResponse> => {
    try {
      const baseUrl = getUserServiceConfig().baseUrl
      const response = await fetch(`${baseUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // 优先使用后端的 detail 字段，然后是 message 字段
        const errorMessage = result.detail || result.message || '登录失败'
        const error = new Error(errorMessage)
        ;(error as any).status = response.status
        ;(error as any).statusText = response.statusText
        ;(error as any).response = result
        ;(error as any).detail = result.detail  // 保存后端的详细错误信息
        throw error
      }

      return result
    } catch (error) {
      console.error('登录API调用失败:', error)
      throw error
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

  // 同步用户信息API
  const syncUserInfoAfterLogin = async (token: string, userData?: any): Promise<boolean> => {
    try {
      // 先保存本地数据到localStorage
      if (userData) {
        localStorage.setItem('userInfo', JSON.stringify(userData))
        localStorage.setItem('authToken', token)
      }
      
      // 从后端获取完整的用户信息
      const response = await getCurrentUser(token)
      if (response.success && response.data) {
        // 更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(response.data))
        localStorage.setItem('userInfoLastUpdate', new Date().toISOString())
      }
      return response.success
    } catch (error) {
      console.warn('获取用户信息失败，使用本地数据:', error)
      return false
    }
  }

  // 处理登录
  const handleLogin = async (): Promise<boolean> => {
    loading.value = true
    
    try {
      // 表单验证 - 检查必填字段
      if (!account.value || !password.value) {
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '登录失败',
            message: '请填写完整的登录信息',
            type: 'error',
            duration: 3000
          }
        }))
        return false
      }
      
      // 调用后端登录API
      const loginData = {
        login_identifier: account.value,
        password: password.value
      }
      
      const response = await login(loginData)
      
      if (response.success && response.token) {
        // 登录成功
        const accountType = getAccountType(account.value)
        
        // 根据登录方式设置用户数据
        let userPhone = ''
        if (accountType === 'phone') {
          userPhone = account.value
        } else {
          // 用户名或邮箱登录时，使用默认手机号
          userPhone = '13800138000'
        }
        
        const userData = {
          username: accountType === 'username' ? account.value : 'admin',
          email: accountType === 'email' ? account.value : 'admin@example.com',
          phone: userPhone,
          accountType: accountType,
          role: 'admin',
          loginTime: new Date().toISOString()
        }
        
        // 使用store管理登录状态
        userStore.login(userData, response.token)
        
        // 从后端获取完整的用户信息
        try {
          await syncUserInfoAfterLogin(response.token, userData)
          // 更新store状态
          userStore.syncUserInfoFromStorage()
        } catch (error) {
          console.warn('获取用户信息失败，使用本地数据:', error)
        }
        
        // 记住密码功能
        if (rememberPassword.value) {
          // 保存用户名和密码到本地存储
          localStorage.setItem('rememberedUser', account.value)
          localStorage.setItem('rememberedPassword', password.value)
          
          // 保存登录历史记录
          const loginHistory = JSON.parse(localStorage.getItem('loginHistory') || '[]')
          const loginRecord = {
            account: account.value,
            accountType: accountType,
            loginTime: new Date().toISOString(),
            rememberPassword: true
          }
          
          // 避免重复记录，如果相同账号已存在则更新
          const existingIndex = loginHistory.findIndex((record: any) => record.account === account.value)
          if (existingIndex !== -1) {
            loginHistory[existingIndex] = loginRecord
          } else {
            loginHistory.push(loginRecord)
          }
          
          // 限制历史记录数量，最多保存10条
          if (loginHistory.length > 10) {
            loginHistory.splice(0, loginHistory.length - 10)
          }
          
          localStorage.setItem('loginHistory', JSON.stringify(loginHistory))
        } else {
          // 清除记住的密码信息
          localStorage.removeItem('rememberedUser')
          localStorage.removeItem('rememberedPassword')
        }
        
        // 设置默认模式为LLM模式
        localStorage.setItem('currentMode', 'llm')
        
        // 异步显示登录成功通知（不阻挡页面切换）
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('showNotification', {
            detail: {
              title: '登录成功',
              message: `欢迎回来，${userData.username}！`,
              type: 'success',
              duration: 3000
            }
          }))
        }, 100)
        
        // 跳转到LLM模式
        router.push('/dashboard/management-analysis/llm')
        return true
      } else {
        // 处理登录失败 - 显示后端返回的具体错误信息
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '登录失败',
            message: response.detail || response.message || '登录失败，请检查用户名和密码',
            type: 'error',
            duration: 3000
          }
        }))
        return false
      }
    } catch (error: any) {
      // 处理网络错误或其他异常
      let errorMessage = '登录失败，请稍后重试'
      let errorTitle = '登录失败'
      
      // 优先使用后端返回的详细错误信息
      if (error.detail) {
        errorMessage = error.detail
        // 根据后端返回的具体错误信息判断错误类型
        if (error.detail.includes('用户名') || error.detail.includes('用户不存在') || 
            error.detail.includes('登录标识') || error.detail.includes('至少2个字符')) {
          errorTitle = '用户名错误'
        } else if (error.detail.includes('密码') || error.detail.includes('密码错误') || 
                   error.detail.includes('不能为空')) {
          errorTitle = '密码错误'
        } else if (error.detail.includes('邮箱') || error.detail.includes('邮箱格式')) {
          errorTitle = '邮箱格式错误'
        } else if (error.detail.includes('手机号') || error.detail.includes('手机号格式')) {
          errorTitle = '手机号格式错误'
        }
      } else if (error.message) {
        errorMessage = error.message
        // 同样根据错误信息内容判断错误类型
        if (error.message.includes('用户名') || error.message.includes('用户不存在') || 
            error.message.includes('登录标识') || error.message.includes('至少2个字符')) {
          errorTitle = '用户名错误'
        } else if (error.message.includes('密码') || error.message.includes('密码错误') || 
                   error.message.includes('不能为空')) {
          errorTitle = '密码错误'
        } else if (error.message.includes('邮箱') || error.message.includes('邮箱格式')) {
          errorTitle = '邮箱格式错误'
        } else if (error.message.includes('手机号') || error.message.includes('手机号格式')) {
          errorTitle = '手机号格式错误'
        }
      } else if (error.status === 401) {
        // 401 状态码，尝试从响应内容判断具体错误
        if (error.response?.detail) {
          errorMessage = error.response.detail
          if (error.response.detail.includes('用户名') || error.response.detail.includes('用户不存在') || 
              error.response.detail.includes('登录标识') || error.response.detail.includes('至少2个字符')) {
            errorTitle = '用户名错误'
          } else if (error.response.detail.includes('密码') || error.response.detail.includes('密码错误') || 
                     error.response.detail.includes('不能为空')) {
            errorTitle = '密码错误'
          } else if (error.response.detail.includes('邮箱') || error.response.detail.includes('邮箱格式')) {
            errorTitle = '邮箱格式错误'
          } else if (error.response.detail.includes('手机号') || error.response.detail.includes('手机号格式')) {
            errorTitle = '手机号格式错误'
          }
        } else {
          errorMessage = '用户名或密码错误'
        }
      } else if (error.status === 400) {
        errorMessage = '请求参数错误'
      } else if (error.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      }
      
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: errorTitle,
          message: errorMessage,
          type: 'error',
          duration: 3000
        }
      }))
      
      console.error('登录失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }
  
  // 加载记住的密码
  const loadRememberedPassword = () => {
    const rememberedUser = localStorage.getItem('rememberedUser')
    const rememberedPassword = localStorage.getItem('rememberedPassword')
    
    if (rememberedUser && rememberedPassword) {
      account.value = rememberedUser
      password.value = rememberedPassword
      rememberPassword.value = true
    }
  }
  
  // 加载登录历史
  const loadLoginHistory = () => {
    const loginHistory = JSON.parse(localStorage.getItem('loginHistory') || '[]')
    return loginHistory
  }
  
  // 清除登录历史
  const clearLoginHistory = () => {
    localStorage.removeItem('loginHistory')
  }
  
  // 重置表单
  const resetForm = () => {
    account.value = ''
    password.value = ''
    rememberPassword.value = false
  }
  
  return {
    // 响应式数据
    loading,
    account,
    password,
    rememberPassword,
    
    // 方法
    handleLogin,
    loadRememberedPassword,
    loadLoginHistory,
    clearLoginHistory,
    resetForm,
    getAccountType
  }
}
