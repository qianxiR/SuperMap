<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>系统登录</h2>
        <p>请输入您的账户信息</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="account">用户名/邮箱/手机号</label>
          <input 
            id="account"
            v-model="account" 
            type="text" 
            required 
            placeholder="请输入用户名/邮箱/手机号"
            :disabled="loading"
            autocomplete="off"
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input 
            id="password"
            v-model="password" 
            type="password" 
            required 
            placeholder="请输入密码"
            :disabled="loading"
            autocomplete="off"
          />
        </div>
        
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input 
              v-model="rememberPassword" 
              type="checkbox"
              :disabled="loading"
            />
            <span>记住密码</span>
          </label>
        </div>
        
        <button type="submit" :disabled="loading" class="login-btn">
          <span v-if="loading">登录中...</span>
          <span v-else>登录</span>
        </button>
      </form>
      
      <div class="login-footer">
        <p>默认账户：admin / admin@example.com / 13800138000 / 123456</p>
        <p>还没有账户？ <router-link to="/register" class="register-link">立即注册</router-link></p>
        <p v-if="hasLoginHistory" class="history-link">
          <a href="#" @click.prevent="showLoginHistory" class="history-text">查看登录历史</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { userApiService } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()

const account = ref('')
const password = ref('')
const rememberPassword = ref(false)
const loading = ref(false)
const hasLoginHistory = ref(false)

// 验证是否为邮箱格式
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证是否为手机号格式
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 获取账号类型
const getAccountType = (account: string): 'username' | 'email' | 'phone' => {
  if (isValidEmail(account)) {
    return 'email'
  } else if (isValidPhone(account)) {
    return 'phone'
  } else {
    return 'username'
  }
}

onMounted(() => {
  // 如果之前记住了密码，自动填充
  const rememberedUser = localStorage.getItem('rememberedUser')
  const rememberedPassword = localStorage.getItem('rememberedPassword')
  if (rememberedUser) {
    account.value = rememberedUser
    rememberPassword.value = true
    // 如果之前保存了密码，自动填充密码
    if (rememberedPassword) {
      password.value = rememberedPassword
    }
  }
  
  // 检查是否有登录历史记录
  const loginHistory = JSON.parse(localStorage.getItem('loginHistory') || '[]')
  hasLoginHistory.value = loginHistory.length > 0
})

// 显示登录历史记录
const showLoginHistory = () => {
  const loginHistory = JSON.parse(localStorage.getItem('loginHistory') || '[]')
  
  if (loginHistory.length === 0) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '登录历史',
        message: '暂无登录历史记录',
        type: 'info',
        duration: 3000
      }
    }))
    return
  }
  
  // 格式化历史记录显示
  const historyText = loginHistory.map((record: any, index: number) => {
    const date = new Date(record.loginTime).toLocaleString('zh-CN')
    return `${index + 1}. ${record.account} (${record.accountType}) - ${date}`
  }).join('\n')
  
  // 显示历史记录
  window.dispatchEvent(new CustomEvent('showNotification', {
    detail: {
      title: '登录历史记录',
      message: historyText,
      type: 'info',
      duration: 5000
    }
  }))
}

const handleLogin = async () => {
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
      return
    }
    
    // 调用后端登录API
    const loginData = {
      login_identifier: account.value,
      password: password.value
    }
    
    const response = await userApiService.login(loginData)
    
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
        await userStore.fetchUserInfo()
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
      router.push('/dashboard/llm')
    } else {
      // 处理登录失败 - 显示后端返回的具体错误信息
      const errorMessage = response.message || '登录失败'
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '登录失败',
          message: errorMessage,
          type: 'error',
          duration: 5000
        }
      }))
    }
  } catch (err: any) {
    // 智能错误处理 - 解析不同类型的错误
    let errorTitle = '登录失败'
    let errorMessage = '登录失败，请重试'
    
    if (err instanceof Error) {
      // 处理标准Error对象
      errorMessage = err.message
      
      // 根据错误消息判断错误类型
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorTitle = '网络连接失败'
        errorMessage = '无法连接到服务器，请检查网络连接'
      } else if (err.message.includes('timeout')) {
        errorTitle = '请求超时'
        errorMessage = '服务器响应超时，请稍后重试'
      } else if (err.message.includes('detail')) {
        // 尝试提取后端返回的详细错误信息
        try {
          const errorDetail = JSON.parse(err.message)
          if (errorDetail.detail) {
            errorMessage = errorDetail.detail
          }
        } catch {
          // 如果解析失败，使用原始消息
          errorMessage = err.message
        }
      }
    } else if (typeof err === 'object' && err !== null) {
      // 处理其他类型的错误对象
      if ('detail' in err) {
        errorMessage = String(err.detail)
      } else if ('message' in err) {
        errorMessage = String(err.message)
      } else if ('status' in err) {
        // 处理HTTP状态码
        const status = err.status
        if (status === 401) {
          errorTitle = '认证失败'
          errorMessage = '用户名或密码错误'
        } else if (status === 403) {
          errorTitle = '账户被禁用'
          errorMessage = '您的账户已被禁用，请联系管理员'
        } else if (status === 404) {
          errorTitle = '用户不存在'
          errorMessage = '找不到该用户，请检查用户名/邮箱/手机号'
        } else if (status === 429) {
          errorTitle = '登录尝试过多'
          errorMessage = '登录尝试次数过多，请稍后再试'
        } else if (status >= 500) {
          errorTitle = '服务器错误'
          errorMessage = '服务器内部错误，请稍后重试'
        }
      }
    }
    
    // 显示具体的错误信息
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: errorTitle,
        message: errorMessage,
        type: 'error',
        duration: 5000
      }
    }))
    
    console.error('登录错误详情:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg) 0%, var(--surface) 100%);
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
}

/* 深色主题背景 */
[data-theme="dark"] .login-container {
  background: linear-gradient(135deg, var(--bg) 0%, var(--surface) 100%);
}

.login-box {
  background: var(--panel);
  padding: 40px;
  border-radius: 16px;
  box-shadow: var(--glow);
  width: 400px;
  max-width: 90vw;
  border: 1px solid var(--border);
  min-height: 600px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 0 0 8px 0;
  color: var(--text);
  font-size: 24px;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  color: var(--sub);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}



.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="email"] {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: var(--panel);
  color: var(--text);
}

.form-group input[type="text"]::placeholder,
.form-group input[type="password"]::placeholder,
.form-group input[type="email"]::placeholder {
  color: var(--sub);
  opacity: 0.7;
}

/* 自动填充样式 */
.form-group input[type="text"]:-webkit-autofill,
.form-group input[type="password"]:-webkit-autofill,
.form-group input[type="email"]:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px var(--panel) inset;
  -webkit-text-fill-color: var(--text);
}

.form-group input[type="text"]:-webkit-autofill:focus,
.form-group input[type="password"]:-webkit-autofill:focus,
.form-group input[type="email"]:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px var(--panel) inset;
  -webkit-text-fill-color: var(--text);
}

.form-group input[type="text"]:focus,
.form-group input[type="password"]:focus,
.form-group input[type="email"]:focus {
  outline: none;
  border-color: var(--accent);
}

.form-group input:disabled {
  background: var(--surface);
  cursor: not-allowed;
  opacity: 0.6;
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--sub);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent);
  background: var(--panel);
  border: 2px solid var(--border);
  border-radius: 4px;
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-label input[type="checkbox"]:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.checkbox-label input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid var(--btn-primary-color);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label input[type="checkbox"]:hover {
  border-color: var(--accent);
}

.login-btn {
  padding: 14px;
  background: linear-gradient(135deg, var(--accent) 0%, rgba(var(--accent-rgb), 0.9) 100%);
  color: var(--btn-primary-color);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(var(--accent-rgb), 0.3);
}

.login-btn:disabled {
  background: var(--sub);
  cursor: not-allowed;
  box-shadow: none;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.login-footer p {
  margin: 0 0 8px 0;
  color: var(--sub);
  font-size: 12px;
}

.login-footer p:last-child {
  margin-bottom: 0;
}

.register-link {
  color: var(--link-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.register-link:hover {
  color: var(--link-hover-color);
  text-decoration: underline;
}

.history-link {
  margin-top: 8px;
}

.history-text {
  color: var(--sub);
  text-decoration: none;
  font-size: 12px;
  transition: color 0.2s ease;
}

.history-text:hover {
  color: var(--link-color);
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-box {
    padding: 30px 20px;
    width: 100%;
    margin: 20px;
  }
}
</style>
