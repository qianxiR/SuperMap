<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h2>用户注册</h2>
        <p>请填写您的注册信息</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input 
            id="username"
            v-model="username" 
            type="text" 
            required 
            placeholder="请输入用户名"
            :disabled="loading"
            autocomplete="off"
          />
        </div>
        
        <div class="form-group">
          <label for="email">邮箱</label>
          <input 
            id="email"
            v-model="email" 
            type="email" 
            required 
            placeholder="请输入邮箱"
            :disabled="loading"
            autocomplete="off"
          />
        </div>
        
        <div class="form-group">
          <label for="phone">手机号</label>
          <input 
            id="phone"
            v-model="phone" 
            type="tel" 
            required 
            placeholder="请输入手机号"
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
        
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input 
            id="confirmPassword"
            v-model="confirmPassword" 
            type="password" 
            required 
            placeholder="请再次输入密码"
            :disabled="loading"
            autocomplete="off"
          />
        </div>
        
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input 
              v-model="agreeTerms" 
              type="checkbox"
              :disabled="loading"
            />
            <span>我已阅读并同意服务条款</span>
          </label>
        </div>
        
        <button type="submit" :disabled="loading" class="register-btn">
          <span v-if="loading">注册中...</span>
          <span v-else>注册</span>
        </button>
      </form>
      
      <div class="register-footer">
        <p>已有账户？ <router-link to="/login" class="login-link">立即登录</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { userApiService } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)
const loading = ref(false)

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

const handleRegister = async () => {
  // 表单验证 - 检查所有必填字段
  if (!username.value || !email.value || !phone.value || !password.value || !confirmPassword.value) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '注册失败',
        message: '请填写完整的注册信息',
        type: 'error',
        duration: 3000
      }
    }))
    return
  }
  
  // 验证邮箱格式
  if (!isValidEmail(email.value)) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '注册失败',
        message: '请输入正确的邮箱格式',
        type: 'error',
        duration: 3000
      }
    }))
    return
  }
  
  // 验证手机号格式
  if (!isValidPhone(phone.value)) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '注册失败',
        message: '请输入正确的手机号格式',
        type: 'error',
        duration: 3000
      }
    }))
    return
  }
  
  // 密码确认验证
  if (password.value !== confirmPassword.value) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '注册失败',
        message: '两次输入的密码不一致',
        type: 'error',
        duration: 3000
      }
    }))
    return
  }
  
  // 服务条款验证
  if (!agreeTerms.value) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '注册失败',
        message: '请先同意服务条款',
        type: 'error',
        duration: 3000
      }
    }))
    return
  }
  
  loading.value = true
  
  try {
    // 调用后端注册API
    const registerData = {
      username: username.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
      confirm_password: confirmPassword.value
    }
    
    const response = await userApiService.register(registerData)
    
    if (response.success) {
      // 注册成功后自动登录
      const loginData = {
        login_identifier: username.value,
        password: password.value
      }
      
      const loginResponse = await userApiService.login(loginData)
      
      if (loginResponse.success && loginResponse.token) {
        const userData = {
          username: username.value,
          email: email.value,
          phone: phone.value,
          registerType: 'phone',
          role: 'user',
          registerTime: new Date().toISOString()
        }
        
        // 使用store管理登录状态
        userStore.login(userData, loginResponse.token)
        
        // 从后端获取完整的用户信息
        try {
          await userStore.fetchUserInfo()
        } catch (error) {
          console.warn('获取用户信息失败，使用本地数据:', error)
        }
        
        // 异步显示注册成功通知
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('showNotification', {
            detail: {
              title: '注册成功',
              message: `欢迎加入，${username.value}！`,
              type: 'success',
              duration: 3000
            }
          }))
        }, 100)
        
        // 跳转到地图系统
        router.push('/dashboard')
      }
    } else {
      // 注册失败
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '注册失败',
          message: response.message || '注册失败',
          type: 'error',
          duration: 3000
        }
      }))
    }
  } catch (err) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '注册失败',
        message: '注册失败，请重试',
        type: 'error',
        duration: 3000
      }
    }))
    console.error('注册错误:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg) 0%, var(--surface) 100%);
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
}

/* 深色主题背景 */
[data-theme="dark"] .register-container {
  background: linear-gradient(135deg, var(--bg) 0%, var(--surface) 100%);
}

.register-box {
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

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  margin: 0 0 8px 0;
  color: var(--text);
  font-size: 24px;
  font-weight: 600;
}

.register-header p {
  margin: 0;
  color: var(--sub);
  font-size: 14px;
}

.register-form {
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
.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="tel"] {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: var(--panel);
  color: var(--text);
}

.form-group input[type="text"]::placeholder,
.form-group input[type="email"]::placeholder,
.form-group input[type="password"]::placeholder,
.form-group input[type="tel"]::placeholder {
  color: var(--sub);
  opacity: 0.7;
}

/* 自动填充样式 */
.form-group input[type="text"]:-webkit-autofill,
.form-group input[type="email"]:-webkit-autofill,
.form-group input[type="password"]:-webkit-autofill,
.form-group input[type="tel"]:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px var(--panel) inset;
  -webkit-text-fill-color: var(--text);
}

.form-group input[type="text"]:-webkit-autofill:focus,
.form-group input[type="email"]:-webkit-autofill:focus,
.form-group input[type="password"]:-webkit-autofill:focus,
.form-group input[type="tel"]:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px var(--panel) inset;
  -webkit-text-fill-color: var(--text);
}

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus,
.form-group input[type="password"]:focus,
.form-group input[type="tel"]:focus {
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

.register-btn {
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

.register-btn:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(var(--accent-rgb), 0.3);
}

.register-btn:disabled {
  background: var(--sub);
  cursor: not-allowed;
  box-shadow: none;
}

.register-footer {
  margin-top: 20px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.register-footer p {
  margin: 0;
  color: var(--sub);
  font-size: 14px;
}

.login-link {
  color: var(--link-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.login-link:visited {
  color: var(--link-color);
}

.login-link:hover {
  color: var(--link-hover-color);
  text-decoration: underline;
}

@media (max-width: 480px) {
  .register-box {
    padding: 30px 20px;
    width: 100%;
    margin: 20px;
  }
}
</style>
