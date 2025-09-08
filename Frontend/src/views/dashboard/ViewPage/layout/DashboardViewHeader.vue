<template>
  <div class="screen-header">
    <div class="header-left">
      <img 
        src="/logoContent.png" 
        alt="Logo" 
        class="header-logo" 
      />
      <div class="screen-title">基于LLM-Agent的多模态实时态势感知地理空间智能可视化平台</div>
    </div>
    
    <div class="header-right">
      <div class="right-controls">
        <!-- 上传按钮 -->
        <div class="upload-control">
          <button 
            class="upload-btn"
            title="上传GeoJSON数据到上传图层组"
            @click="handleQuickUpload"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="transform: rotate(180deg);">
              <path d="M19,9H15V3H9V9H5L12,16L19,9M5,18V20H19V18H5Z"/>
            </svg>
          </button>
        </div>
        
        <!-- 地球按钮 -->
        <div class="earth-toggle">
          <button 
            class="earth-logo" 
            @click="goToManagement"
            title="切换到管理分析系统页面"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </button>
        </div>
        
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
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import IconButton from '@/components/UI/IconButton.vue'
import { useThemeStore } from '@/stores/themeStore'
import { useUserStore } from '@/stores/userStore'
import { useGlobalModalStore } from '@/stores/modalStore'
import { useMapStore } from '@/stores/mapStore'
import { safeAddEventListener } from '@/utils/eventUtils'
import { toggleTheme as toggleThemeUtil, dispatchThemeChangeEvent } from '@/utils/themeUtils'
import { uselayermanager } from '@/composables/uselayermanager'

// 主题管理
const themeStore = useThemeStore()
const { theme } = storeToRefs(themeStore)
const { applySystemTheme, setupSystemThemeListener } = themeStore

// 使用统一的主题工具
const toggleTheme = () => {
  const newTheme = toggleThemeUtil()
  themeStore.setTheme(newTheme)
}

// 用户管理
const router = useRouter()
const userStore = useUserStore()
const globalModal = useGlobalModalStore()

// 地图管理
const mapStore = useMapStore()
const layerManager = uselayermanager()

// 图层管理状态
const layerManagerVisible = ref(false)

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

const goToProfile = () => {
  showUserMenu.value = false
  globalModal.open('profile')
}

const goToAIManagement = () => {
  showUserMenu.value = false
  globalModal.open('agent')
}

const goToManagement = () => {
  router.push('/dashboard/management-analysis').then(() => {
    // 路由切换后刷新页面
    window.location.reload()
  })
}



const handleLogout = () => {
  // 使用store管理登出
  userStore.logout()
  
  // 跳转到登录页
  router.push('/login')
}

// 简化的快速上传逻辑
const handleQuickUpload = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.geojson,.json'
  input.multiple = true
  
  input.onchange = async (event) => {
    const files = Array.from((event.target as HTMLInputElement).files || [])
    if (files.length === 0) return
    
    try {
      // 默认开启所有上传选项
      const options = {
        autoAddToMap: true,
        generateStyle: true,
        zoomTolayer: true
      }
      
      // 生成默认图层名称 - 直接使用文件原来名称
      let defaultLayerName = ''
      if (files.length === 1) {
        defaultLayerName = files[0].name.replace(/\.(geojson|json)$/i, '')
      } else {
        // 多文件时，使用第一个文件的名称作为基础
        const firstFileName = files[0].name.replace(/\.(geojson|json)$/i, '')
        defaultLayerName = `${firstFileName}_等${files.length}个文件`
      }
      
      // 直接执行上传，使用默认选项
      await performQuickUpload(files, options, defaultLayerName)
      
    } catch (error) {
      console.error('上传失败:', error)
    }
  }
  
  input.click()
}

// 执行快速上传
const performQuickUpload = async (files: File[], options: any, layerName: string) => {
  const ol = (window as any).ol
  const projection = mapStore.map.getView().getProjection()
  
  for (const file of files) {
    try {
      const text = await file.text()
      const geojson = JSON.parse(text)
      
      const features = new ol.format.GeoJSON().readFeatures(geojson, { 
        featureProjection: projection 
      })
      
      // 使用文件原来的名称
      const finalLayerName = file.name.replace(/\.(geojson|json)$/i, '')
      
      // 保存到上传图层组
      await layerManager.saveFeaturesAslayer(features, finalLayerName, 'upload')
      
      // 自动缩放到图层
      if (options.zoomTolayer) {
        const extent = ol.extent.createEmpty()
        for (const f of features) {
          ol.extent.extend(extent, f.getGeometry().getExtent())
        }
        mapStore.map.getView().fit(extent, { 
          duration: 300, 
          maxZoom: 18, 
          padding: [20, 20, 20, 20] 
        })
      }
      
    } catch (error) {
      console.error(`处理文件 ${file.name} 失败:`, error)
    }
  }
}

// 点击外部关闭菜单
const closeUserMenu = () => {
  showUserMenu.value = false
}

// 监听点击外部事件
onMounted(() => {
  // 使用统一的事件管理工具
  const clickHandler = (e: Event) => {
    const target = e.target as HTMLElement
    if (!target.closest('.user-dropdown')) {
      closeUserMenu()
    }
  }
  
  safeAddEventListener(document, 'click', clickHandler)
  
  // 初始化主题
  applySystemTheme()
  setupSystemThemeListener()
  
  // 不再默认打开图层管理面板
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
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  min-width: 0;
}

.screen-title {
  font-size: clamp(16px, 1.6vw, 20px);
  font-weight: 700;
  color: var(--accent);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
  transition: color 0.2s ease;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  max-width: 70%;
}

.header-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 4px;
  padding: 2px;
}

.earth-toggle {
  display: flex;
  align-items: center;
}

.earth-logo {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  padding: 0;
}

.earth-logo:hover {
  background: var(--surface-hover, var(--btn-secondary-bg));
  transform: translateY(-1px);
  box-shadow: var(--glow);
}

.earth-logo:active {
  transform: translateY(0);
}

.earth-logo svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}


.header-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  min-width: 0;
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

.upload-control {
  display: flex;
  align-items: center;
}

.upload-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.upload-btn:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.1);
}

.upload-btn:active {
  transform: scale(0.95);
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
