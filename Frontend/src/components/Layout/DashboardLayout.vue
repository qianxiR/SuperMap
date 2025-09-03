<template>
  <div class="dashboard-layout">
    <DashboardHeader />
    <!-- 主内容区域 -->
    <div class="screen-main">
      <splitpanes class="default-theme">
        <pane size="60" min-size="50">
          <div class="map-container">
            <SuperMapViewer />
          </div>
        </pane>
        <pane size="30" min-size="30">
          <div class="right-panel-container">
            <RightPanel />
          </div>
        </pane>
      </splitpanes>
    </div>

    <!-- 全局窗口：个人中心 / Agent 管理 -->
    <UserProfile v-if="globalModal.visible && globalModal.type === 'profile'" />
    <AIManagement v-if="globalModal.visible && globalModal.type === 'agent'" />
  </div>
</template>

<script setup lang="ts">
import DashboardHeader from './DashboardHeader.vue'
import SuperMapViewer from '@/views/dashboard/SuperMapViewer.vue'
import RightPanel from '@/views/dashboard/RightPanel.vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import UserProfile from '@/views/profile/UserProfile.vue'
import AIManagement from '@/views/management/AIManagement.vue'
import { useGlobalModalStore } from '@/stores/modalStore'

const globalModal = useGlobalModalStore()
</script>

<style>
.splitpanes__pane {
  background-color: transparent !important;
  min-width: 0;
  min-height: 0;
}

.splitpanes__splitter {
  background-color: var(--splitter-bg) !important;
  position: relative;
  width: 5px !important;
  border: none !important;
  transition: all 0.2s ease-in-out;
  opacity: 0.5;
}

.splitpanes__splitter:before {
  content: '';
  position: absolute;
  left: -2px;
  top: 0;
  width: 10px;
  height: 100%;
  background: transparent;
  z-index: 1;
  transition: background-color 0.2s ease-in-out;
}

.splitpanes__splitter:hover {
  background-color: var(--splitter-hover) !important;
  opacity: 1;
  transform: scaleX(1.2);
}

</style>

<style scoped>
.dashboard-layout {
  height: 100vh;
  width: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: "Segoe UI", PingFang SC, Microsoft YaHei, Arial, sans-serif;
  overflow: hidden;
}

.screen-main {
  height: calc(100vh - clamp(48px, 6vh, 64px));
  width: 100%;
  padding: 0;
}

/* 确保分割面板充满可用高度，避免子容器高度为0 */
.screen-main > .default-theme {
  height: 100%;
  min-width: 0;
}

.map-container {
  width: 100%;
  height: 100%;
  min-width: 0;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 0.625rem;
  position: relative;
  overflow: hidden;
}

.right-panel-container {
  width: 100%;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--glow);
  padding: 10px;
  position: relative;
  overflow: hidden;
}



/* 响应式设计 */
@media (max-width: 1400px) {
  .screen-main {
    padding: 0;
  }
}

@media (max-width: 768px) {
  .screen-main { 
    padding: 0; 
    flex-direction: column;
  }
  .map-container { 
    padding: 8px; 
    flex: none;
    height: 60%;
  }
  .right-panel-container {
    flex: none;
    height: 40%;
  }
}
</style>
