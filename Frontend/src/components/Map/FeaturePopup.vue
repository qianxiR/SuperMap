<template>
  <PanelWindow
    :visible="popupStore.visible"
    title="要素信息"
    :width="300"
    :height="popupHeight"
    position="absolute"
    :left="adjustedPosition.x"
    :top="adjustedPosition.y"
    :z-index="1000"
    :focusable="true"
    :closeable="true"
    :resizable="true"
    :animation-key="popupStore.animationKey"
    @close="handleClose"
  >
    <div class="popup-body" v-html="popupStore.content"></div>
  </PanelWindow>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePopupStore } from '@/stores/popupStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useMapStore } from '@/stores/mapStore'
import PanelWindow from '@/components/UI/PanelWindow.vue'

const popupStore = usePopupStore()
const selectionStore = useSelectionStore()
const mapStore = useMapStore()

// 要素匹配辅助函数
const isSameFeature = (feature1: any, feature2: any): boolean => {
  if (!feature1 || !feature2) return false
  
  // 首先尝试通过ID匹配
  const id1 = feature1.getId?.() || feature1.id
  const id2 = feature2.getId?.() || feature2.id
  if (id1 && id2 && id1 === id2) return true
  
  // 通过几何坐标匹配
  const geom1 = feature1.getGeometry?.()
  const geom2 = feature2.getGeometry?.()
  
  if (geom1 && geom2) {
    const coords1 = geom1.getCoordinates?.()
    const coords2 = geom2.getCoordinates?.()
    
    if (coords1 && coords2) {
      return JSON.stringify(coords1) === JSON.stringify(coords2)
    }
  }
  
  return false
}

  // 处理关闭按钮点击事件
  const handleClose = async () => {
    // 获取当前弹窗对应的要素
    const currentPopupFeature = popupStore.feature
    
    // 关闭要素信息弹窗
    popupStore.hidePopup()
    
    // 检查要素的标识类型
    const sourceTag = currentPopupFeature?.get?.('sourceTag') || 
                     currentPopupFeature?.sourceTag || 
                     (currentPopupFeature?.getProperties ? currentPopupFeature.getProperties().sourceTag : null)
    
    // 根据要素来源类型进行不同的清除处理
    if (sourceTag === 'click') {
      // 点击选择的要素：清除点击选择状态
      if (currentPopupFeature) {
        // 从选择存储中移除当前要素
        const updatedFeatures = selectionStore.selectedFeatures.filter((feature: any) => {
          return !isSameFeature(feature, currentPopupFeature)
        })
        selectionStore.setSelectedFeatures(updatedFeatures)
        
        // 如果当前选中的要素被移除，重置选中索引
        if (selectionStore.selectedFeatureIndex >= updatedFeatures.length) {
          selectionStore.setSelectedFeatureIndex(-1)
        }
      }
      
      // 清除地图上对应的点击选择高亮
      if (mapStore.selectlayer && mapStore.selectlayer.getSource()) {
        const source = mapStore.selectlayer.getSource()
        const features = source.getFeatures()
        features.forEach((f: any) => {
          if (f?.get && f.get('sourceTag') === 'click' && 
              (currentPopupFeature ? isSameFeature(f, currentPopupFeature) : true)) {
            source.removeFeature(f)
          }
        })
        mapStore.selectlayer.changed()
      }
    } else if (sourceTag === 'area') {
      // 区域选择的要素：清除区域选择状态
      const { useAreaSelectionStore } = await import('@/stores/areaSelectionStore')
      const areaSelectionStore = useAreaSelectionStore()
      
      if (currentPopupFeature) {
        // 从区域选择存储中移除当前要素
        const updatedFeatures = areaSelectionStore.selectedFeatures.filter((feature: any) => {
          return !isSameFeature(feature, currentPopupFeature)
        })
        areaSelectionStore.setSelectedFeatures(updatedFeatures)
        
        // 如果当前选中的要素被移除，重置选中索引
        if (areaSelectionStore.selectedFeatureIndex >= updatedFeatures.length) {
          areaSelectionStore.setSelectedFeatureIndex(-1)
        }
      }
      
      // 清除地图上对应的区域选择高亮
      if (mapStore.selectlayer && mapStore.selectlayer.getSource()) {
        const source = mapStore.selectlayer.getSource()
        const features = source.getFeatures()
        features.forEach((f: any) => {
          if (f?.get && f.get('sourceTag') === 'area' && 
              (currentPopupFeature ? isSameFeature(f, currentPopupFeature) : true)) {
            source.removeFeature(f)
          }
        })
        mapStore.selectlayer.changed()
      }
    } else if (sourceTag === 'query') {
      // 查询选择的要素：清除查询选择状态
      const { useFeatureQueryStore } = await import('@/stores/featureQueryStore')
      const featureQueryStore = useFeatureQueryStore()
      
      if (currentPopupFeature) {
        // 从查询结果中移除当前要素
        const updatedResults = featureQueryStore.queryResults.filter((feature: any) => {
          return !isSameFeature(feature, currentPopupFeature)
        })
        featureQueryStore.queryResults = updatedResults
        
        // 如果当前选中的要素被移除，重置选中索引
        if (featureQueryStore.selectedFeatureIndex >= updatedResults.length) {
          featureQueryStore.selectedFeatureIndex = -1
        }
      }
      
      // 清除地图上对应的查询选择高亮
      if (mapStore.selectlayer && mapStore.selectlayer.getSource()) {
        const source = mapStore.selectlayer.getSource()
        const features = source.getFeatures()
        features.forEach((f: any) => {
          if (f?.get && f.get('sourceTag') === 'query' && 
              (currentPopupFeature ? isSameFeature(f, currentPopupFeature) : true)) {
            source.removeFeature(f)
          }
        })
        mapStore.selectlayer.changed()
      }
    }
  }

// 计算弹窗高度为屏幕高度的1/4（缩小一半）
const popupHeight = computed(() => {
  return Math.floor(window.innerHeight / 4)
})

// 计算调整后的位置，使弹窗显示在鼠标位置的右侧，高度为屏幕高度的1/4
const adjustedPosition = computed(() => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const popupWidth = 300 // 增加宽度以容纳对象内容
  
  // 将弹窗放在鼠标位置的右侧
  let x = popupStore.position.x + 10 // 鼠标位置右侧，留10px间距
  let y = popupStore.position.y - popupHeight.value / 2 // 垂直居中于鼠标位置
  
  // 确保弹窗不会超出屏幕边界
  if (x + popupWidth > windowWidth) x = popupStore.position.x - popupWidth - 10 // 如果右侧放不下，放在左侧
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (y + popupHeight.value > windowHeight) y = windowHeight - popupHeight.value
  
  return { x, y }
})
</script>

<style scoped>
.popup-body {
  padding: 0;
  margin: 0;
}

.popup-body :deep(.kv) {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 12px;
  line-height: 20px;
  margin-bottom: 6px;
  padding: 4px 0;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.popup-body :deep(.kv:hover) {
  background: var(--surface-hover);
  padding: 4px 6px;
  margin: 0 -6px 6px -6px;
}

.popup-body :deep(.k) {
  color: var(--sub);
  min-width: 80px;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.popup-body :deep(.v) {
  color: var(--text);
  text-overflow: unset;
  white-space: pre-wrap;
  flex: 1;
  font-weight: 400;
  font-size: 12px;
  word-break: break-word;
  max-width: 250px;
  overflow-wrap: break-word;
}

.popup-body :deep(.section-title) {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
  margin: 16px 0 8px 0;
  padding: 6px 0;
  border-bottom: 2px solid var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  position: relative;
}

.popup-body :deep(.section-title:first-child) {
  margin-top: 0;
}

.popup-body :deep(.section-title::before) {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 20px;
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
}

/* 新增：支持显示所有字段的样式 */
.popup-body :deep(.field-row) {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 12px;
  line-height: 20px;
  margin-bottom: 6px;
  padding: 4px 0;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.popup-body :deep(.field-row:hover) {
  background: var(--surface-hover);
  padding: 4px 6px;
  margin: 0 -6px 6px -6px;
}

.popup-body :deep(.field-label) {
  color: var(--sub);
  min-width: 80px;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.popup-body :deep(.field-value) {
  color: var(--text);
  text-overflow: unset;
  white-space: pre-wrap;
  flex: 1;
  font-weight: 400;
  font-size: 12px;
  word-break: break-word;
  max-width: 250px;
  overflow-wrap: break-word;
}


.popup-body :deep(.feature-count) {
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.popup-body :deep(.feature-item) {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.popup-body :deep(.feature-header) {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
</style>
