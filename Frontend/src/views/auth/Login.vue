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
          <a href="#" @click.prevent="showLoginHistoryRecords" class="history-text">查看登录历史</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLogin } from '@/composables/useLogin'

// 使用登录composable
const {
  loading,
  account,
  password,
  rememberPassword,
  handleLogin: handleLoginComposable,
  loadRememberedPassword,
  loadLoginHistory,
  clearLoginHistory,
  resetForm
} = useLogin()

// 本地状态
const hasLoginHistory = ref(false)

onMounted(() => {
  // 加载记住的密码
  loadRememberedPassword()
  
  // 检查是否有登录历史记录
  const loginHistory = loadLoginHistory()
  hasLoginHistory.value = loginHistory.length > 0
})

// 显示登录历史记录
const showLoginHistoryRecords = () => {
  const loginHistory = loadLoginHistory()
  
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

// 处理登录
const handleLogin = async () => {
  const success = await handleLoginComposable()
  if (success) {
    // 登录成功后检查是否有登录历史记录
    const loginHistory = loadLoginHistory()
    hasLoginHistory.value = loginHistory.length > 0
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
