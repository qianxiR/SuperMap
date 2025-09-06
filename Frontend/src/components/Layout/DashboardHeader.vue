<template>
  <div class="screen-header">
    <div class="header-left">
      <img src="/628416edb5b7a1b2136a93f41b6e312b.png" alt="Logo" class="header-logo" />
      <div class="screen-title">多模态实时态势感知地理空间智能决策平台</div>
    </div>
    
          <div class="header-right">
        <!-- 临时移除LLM模式和传统模式切换按钮 -->
        <!-- <ButtonGroup
          :buttons="modeButtons"
          :active-button="activeMode"
          @select="setMode"
        /> -->
        
        <div class="right-controls">
          <div class="theme-toggle">
            <IconButton 
              @click="toggleTheme" 
              :title="theme === 'light' ? '切换到暗色主题' : '切换到浅色主题'"
            >
              <!-- 浅色主题图标 (太阳) -->
              <svg v-if="theme === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <!-- 暗色主题图标 (月亮) -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </IconButton>
          </div>
          
          <!-- 用户管理下拉菜单 -->
          <div class="user-dropdown">
            <IconButton 
              @click="toggleUserMenu" 
              :title="userInfo.username"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </IconButton>
            
            <!-- 下拉菜单 -->
            <div v-if="showUserMenu" class="user-menu">
              <div class="user-info">
                <div class="user-details">
                  <div class="username">{{ userInfo.username }}</div>
                  <div class="user-email">{{ userInfo.email }}</div>
                  <div v-if="userInfo.hasPhone" class="user-phone">{{ userInfo.phone }}</div>
                </div>
                <button class="copy-btn" @click="copyUserInfo" title="复制用户信息">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>

              <button @click="goToProfile" class="menu-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>个人中心</span>
              </button>

              <button @click="goToAIManagement" class="menu-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
                <span>Agent管理</span>
              </button>

              <button @click="handleLogout" class="menu-item logout-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16,17 21,12 16,7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ButtonGroup from '@/components/UI/ButtonGroup.vue'
import IconButton from '@/components/UI/IconButton.vue'
import { useThemeStore } from '@/stores/themeStore'
import { useUserStore } from '@/stores/userStore'
import { useModeStateStore } from '@/stores/modeStateStore'

// 主题管理
const themeStore = useThemeStore()
const { theme } = storeToRefs(themeStore)
const { toggleTheme, applySystemTheme, setupSystemThemeListener } = themeStore

// 用户管理
const router = useRouter()
const userStore = useUserStore()

// 模式状态管理
const modeStateStore = useModeStateStore()

// 用户信息计算属性
const userInfo = computed(() => {
  const info = userStore.userInfo
  
  if (!info) {
    return {
      username: '用户',
      email: 'user@example.com',
      phone: '',
      hasPhone: false
    }
  }
  
  const result = {
    username: info.username || '用户',
    email: info.email || 'user@example.com',
    phone: info.phone || '',
    hasPhone: !!(info.phone && info.phone.trim())
  }
  
  return result
})

// 用户菜单状态
const showUserMenu = ref(false)

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const copyUserInfo = async () => {
  let userInfoText = `${userInfo.value.username}\n${userInfo.value.email}`
  if (userInfo.value.hasPhone) {
    userInfoText += `\n${userInfo.value.phone}`
  }
  
  try {
    await navigator.clipboard.writeText(userInfoText)
    // 触发全局通知事件
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '复制成功',
        message: '用户信息已复制到剪贴板',
        type: 'success',
        duration: 3000
      }
    }))
  } catch (err) {
    // 触发错误通知事件
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '复制失败',
        message: '无法访问剪贴板，请手动复制',
        type: 'error',
        duration: 3000
      }
    }))
  }
}

import { useGlobalModalStore } from '@/stores/modalStore'
const globalModal = useGlobalModalStore()

const goToProfile = () => {
  showUserMenu.value = false
  globalModal.open('profile')
}

const goToAIManagement = () => {
  showUserMenu.value = false
  globalModal.open('agent')
}

const handleLogout = () => {
  // 使用store管理登出
  userStore.logout()
  
  // 跳转到登录页
  router.push('/login')
}

// 点击外部关闭菜单
const closeUserMenu = () => {
  showUserMenu.value = false
}

// 监听点击外部事件
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.user-dropdown')) {
      closeUserMenu()
    }
  })
})

// 模式管理 - 集成状态管理
const activeMode = computed(() => {
  return modeStateStore.currentMode
})

const modeButtons = [
  { id: 'llm', text: 'LLM 模式' },
  { id: 'traditional', text: '传统模式' },
];

const setMode = (modeId: 'traditional' | 'llm') => {
  // 使用状态管理进行模式切换
  modeStateStore.switchMode(modeId)
  
  // 路由导航到对应模式
  if (modeId === 'traditional') {
    // 获取传统模式的当前工具状态
    const traditionalState = modeStateStore.getTraditionalState()
    const toolPathMap: { [key: string]: string } = {
      'layer': 'layer',
      'query': 'attribute-selection',
      'bianji': 'area-selection',
      'buffer': 'buffer',
      'distance': 'distance',
    }
    const path = toolPathMap[traditionalState.activeTool] || 'layer'
    router.push(`/dashboard/traditional/${path}`)
  } else {
    router.push('/dashboard/llm')
  }
};

// 初始化主题和模式状态
onMounted(() => {
  applySystemTheme()
  setupSystemThemeListener()
  
  // 确保模式状态与当前路由同步
  const currentPath = router.currentRoute.value.path
  if (currentPath.includes('/dashboard/llm')) {
    if (modeStateStore.currentMode !== 'llm') {
      modeStateStore.switchMode('llm')
    }
  } else if (currentPath.includes('/dashboard/traditional')) {
    if (modeStateStore.currentMode !== 'traditional') {
      modeStateStore.switchMode('traditional')
    }
  }

  // 预加载传统模式相关组件与重型依赖，降低首次切换延迟
  setTimeout(() => {
    void Promise.all([
      import('@/views/dashboard/traditional/TraditionalMode.vue'),
      import('@/views/dashboard/traditional/tools/LayerManager.vue'),
      import('@/views/dashboard/traditional/tools/FeatureQueryPanel.vue'),
              import('@/views/dashboard/traditional/tools/AreaSelectionTools.vue'),
      import('@/views/dashboard/traditional/tools/BufferAnalysisPanel.vue'),
      import('@/views/dashboard/traditional/tools/ShortestPathAnalysisPanel.vue'),
      import('@/views/dashboard/traditional/tools/DataUploadPanel.vue'),
      import('ol')
    ]).catch(() => {})
  }, 0)
})

// 监听路由变化，同步模式状态
watch(() => router.currentRoute.value.path, (newPath: string) => {
  if (newPath.includes('/dashboard/llm')) {
    if (modeStateStore.currentMode !== 'llm') {
      modeStateStore.switchMode('llm')
    }
  } else if (newPath.includes('/dashboard/traditional')) {
    if (modeStateStore.currentMode !== 'traditional') {
      modeStateStore.switchMode('traditional')
    }
  }
})

</script>

<style scoped>
.screen-header {
  height: clamp(48px, 6vh, 64px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(12px, 2vw, 24px);
  letter-spacing: 0.5px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--glow);
}

.header-left {
  flex: 1;
}

.screen-title {
  font-size: clamp(16px, 1.6vw, 20px);
  font-weight: 700;
  color: var(--accent);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
  transition: color 0.2s ease;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.header-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}


.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.right-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 16px;
  border-left: 1px solid var(--border);
}

.theme-toggle {
  display: flex;
  align-items: center;
}

.user-dropdown {
  position: relative;
}


.user-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 240px;
  z-index: 2000;
  animation: slideDown 0.2s ease-out;
  overflow: hidden;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-info {
  padding: 16px;
  background: var(--surface);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.user-details {
  flex: 1;
}

.username {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
  line-height: 1.2;
}

.user-email {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.2;
}

.user-phone {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.2;
}

.copy-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.menu-divider {
  height: 1px;
  background: var(--border);
  margin: 0;
}

.menu-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  text-align: left;
}

.menu-item:hover {
  background: var(--surface-hover);
}

.menu-item span {
  flex: 1;
}

.logout-item {
  color: var(--text);
}

.logout-item:hover {
  background: var(--surface-hover);
}

.menu-item svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  flex-shrink: 0;
}

@media (max-width: 1200px) {
  .screen-header {
    padding: 0 16px;
  }
  
  .screen-title {
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .right-controls {
    gap: 8px;
    padding-left: 12px;
  }
  
  .user-menu {
    min-width: 200px;
  }
  
  .user-info {
    padding: 12px;
  }
  
  .username {
    font-size: 14px;
  }
  
  .user-email {
    font-size: 12px;
  }
  
  .menu-item {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>
