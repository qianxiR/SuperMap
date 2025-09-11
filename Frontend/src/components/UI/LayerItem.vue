<template>
  <div 
    class="layer-item"
    :class="{ 'layer-hidden': hidden }"
  >
    <!-- 图层信息区域 -->
    <div class="layer-info">
      <div class="layer-details">
        <div class="layer-name" :title="layerName">{{ layerName }}</div>
        <div class="layer-desc">{{ layerDesc }}</div>
      </div>
    </div>
    
    <!-- 图层控制区域 -->
    <div class="layer-controls">
      <!-- 显示/隐藏按钮 -->
      <button 
        class="control-btn visibility-btn"
        :class="{ 'visible': !hidden, 'hidden': hidden }"
        @click="$emit('toggle-visibility')"
        :title="hidden ? '显示图层' : '隐藏图层'"
      >
        <svg v-if="!hidden" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        </svg>
      </button>
      
      <!-- 其他控制按钮插槽 -->
      <slot name="controls">
        <!-- 默认控制按钮插槽 -->
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  layerName: string
  layerDesc?: string
  hidden?: boolean
}

withDefaults(defineProps<Props>(), {
  layerDesc: '',
  hidden: false
})

// 定义事件发射器
defineEmits<{
  'toggle-visibility': []
}>()
</script>

<style scoped>
.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--btn-secondary-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: none !important;
  animation: none !important;
  min-height: 48px;
}

.layer-item:hover {
  background: var(--btn-secondary-bg);
}

.layer-item.layer-hidden {
  opacity: 0.6;
}

.layer-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  transition: none !important;
  animation: none !important;
}

.layer-details {
  display: flex;
  flex-direction: column;
  transition: none !important;
  animation: none !important;
}

.layer-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  text-align: left;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: none !important;
  animation: none !important;
}

.layer-desc {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: none !important;
  animation: none !important;
}

.layer-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  transition: none !important;
  animation: none !important;
}

.control-btn {
  font-size: 12px;
  padding: 6px 8px;
  min-width: 32px;
  min-height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: none !important;
  animation: none !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.visibility-btn {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  border: 1px solid var(--border);
  transition: none !important;
  animation: none !important;
}

.visibility-btn.visible {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transition: none !important;
  animation: none !important;
}

.visibility-btn.hidden {
  background: var(--panel);
  color: var(--text);
  border-color: var(--border);
  transition: none !important;
  animation: none !important;
}

.visibility-btn:hover {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-color);
  transition: none !important;
  animation: none !important;
}

.visibility-btn.visible:hover {
  background: var(--accent);
  color: white;
  transition: none !important;
  animation: none !important;
}

.visibility-btn.hidden:hover {
  background: var(--panel);
  color: var(--text);
  transition: none !important;
  animation: none !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .layer-item {
    padding: 10px 12px;
    min-height: 44px;
  }
  
  .layer-name {
    font-size: 12px;
  }
  
  .layer-desc {
    font-size: 11px;
  }
  
  .control-btn {
    min-width: 30px;
    min-height: 30px;
  }
}
</style>
