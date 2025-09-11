<template>
  <PanelWindow 
    :visible="analysisStore.toolPanel.visible && analysisStore.toolPanel.activeTool === 'erase'"
    :embed="true"
    :width="'100%'"
    :height="'100%'"
    class="erase-analysis-panel"
    title="擦除分析"
  >
    <div class="analysis-section">
      <div class="group-title">选择目标图层（被擦除的面要素）</div>
      <DropdownSelect :options="layerOptionsWithNone" v-model="selectedTargetId" />

      <div class="group-title" style="margin-top:12px">选择擦除图层（用于擦除的面要素）</div>
      <DropdownSelect :options="layerOptionsWithNone" v-model="selectedEraseId" />

      <div class="analysis-actions">
        <SecondaryButton text="开始执行擦除" @click="handleExecute" />
        <SecondaryButton v-if="results.length > 0" text="清除擦除结果" @click="handleClear" />
      </div>

      <!-- 运行时提示 -->
      <TipWindow 
        v-if="isAnalyzing"
        :visible="isAnalyzing"
        variant="info"
        :show-icon="true"
      >
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">正在执行擦除分析...</div>
          <div style="font-size: 11px; opacity: 0.8;">
            正在对目标要素 ({{ targetFeatureCount }} 个) 和擦除要素 ({{ eraseFeatureCount }} 个) 进行擦除分析
          </div>
        </div>
      </TipWindow>

      <!-- 错误提示 -->
      <TipWindow 
        v-if="errorMessage"
        :visible="!!errorMessage"
        variant="error"
        :show-icon="true"
      >
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">图层类型错误</div>
          <div style="font-size: 11px; opacity: 0.8;">
            {{ errorMessage }}
          </div>
        </div>
      </TipWindow>

      <div class="group-title" style="margin-top:16px">结果</div>
      
      <!-- 结果提示 -->
      <TipWindow 
        v-if="results.length > 0"
        :visible="results.length > 0"
        variant="success"
        :show-icon="true"
      >
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">擦除分析完成</div>
          <div style="font-size: 11px; opacity: 0.8;">
            目标要素: {{ targetFeatureCount }} 个，擦除要素: {{ eraseFeatureCount }} 个，生成擦除结果: {{ results.length }} 个
          </div>
        </div>
      </TipWindow>
    </div>
  </PanelWindow>
  
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useEraseAnalysis } from '@/composables/useEraseAnalysis'
import { uselayermanager } from '@/composables/useLayerManager'
import { useLayerExport } from '@/composables/useLayerExport'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import GeoJSON from 'ol/format/GeoJSON'
import { Feature } from 'ol'

const {
  targetlayerId,
  eraselayerId,
  layerOptions,
  results,
  targetFeatureCount,
  eraseFeatureCount,
  isAnalyzing,
  executeEraseAnalysis,
  clearState,
  setTargetlayer,
  setEraselayer,
  targetFeaturesCache,
  eraseFeaturesCache
} = useEraseAnalysis()

const mapStore = useMapStore()
const analysisStore = useAnalysisStore()


// 错误消息状态
const errorMessage = ref<string>('')

const layerOptionsWithNone = computed(() => [{ value: '', label: '无', disabled: false }, ...layerOptions.value])

const selectedTargetId = computed({ get: () => targetlayerId.value, set: (v: string) => setTargetlayer(v) })
const selectedEraseId = computed({ get: () => eraselayerId.value, set: (v: string) => setEraselayer(v) })

const handleExecute = async () => {
  // 清除之前的错误信息
  errorMessage.value = ''
  
  const tCount = targetFeaturesCache.value?.length || 0
  const eCount = eraseFeaturesCache.value?.length || 0
  if (tCount < 1 || eCount < 1) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '提示',
        message: '请先选择两个包含要素的图层再执行擦除分析。',
        type: 'warning',
        duration: 3000
      }
    }))
    return
  }

  const coordShape = (coords: any): number[] => {
    const sizes: number[] = []
    let cur: any = coords
    while (Array.isArray(cur)) {
      sizes.push(cur.length)
      cur = cur[0]
    }
    return sizes
  }
  const firstCoord = (coords: any): any => {
    let cur: any = coords
    while (Array.isArray(cur) && Array.isArray(cur[0])) cur = cur[0]
    return Array.isArray(cur) ? (cur as number[]).slice(0, 3) : cur
  }

  const tFirst = targetFeaturesCache.value?.[0]
  const eFirst = eraseFeaturesCache.value?.[0]
  const tGeom = (tFirst as any)?.getGeometry?.()?.clone?.()
  const eGeom = (eFirst as any)?.getGeometry?.()?.clone?.()
  console.log('[Panel] execute clicked. source selection:', {
    targetlayerId: targetlayerId.value,
    eraselayerId: eraselayerId.value,
    targetCount: tCount,
    eraseCount: eCount,
    targetFirstType: tGeom?.getType?.(),
    eraseFirstType: eGeom?.getType?.()
  })

  try {
    await executeEraseAnalysis({
      targetlayerId: targetlayerId.value,
      eraselayerId: eraselayerId.value,
      targetFeatures: targetFeaturesCache.value,
      eraseFeatures: eraseFeaturesCache.value
    })
  } catch (error) {
    // 捕获错误并显示在 TipWindow 中
    errorMessage.value = error instanceof Error ? error.message : '执行擦除分析时发生未知错误'
  }
}

const handleClear = () => {
  clearState()
}

// 清理擦除分析状态（工具切换时调用）
const clearEraseAnalysisState = () => {
  clearState()
  analysisStore.setAnalysisStatus('擦除分析状态已清理')
}

// 组件生命周期管理
onMounted(() => {
  analysisStore.setAnalysisStatus('请选择目标图层和擦除图层')
})

onUnmounted(() => {
  clearEraseAnalysisState()
})

// 监听工具面板变化
watch(() => analysisStore.toolPanel?.activeTool, (tool, prevTool) => {
  if (tool === 'erase' && prevTool !== 'erase') {
    // 当进入擦除分析时，只更新状态提示，不重复恢复状态
    if (results.value && results.value.length > 0) {
      analysisStore.setAnalysisStatus(`擦除分析结果已加载（${results.value.length}个结果），点击"执行分析"重新显示`)
    } else {
      analysisStore.setAnalysisStatus('请选择目标图层和擦除图层')
    }
  } else if (prevTool === 'erase' && tool !== 'erase') {
    // 当从擦除分析切换到其他工具时，清理分析结果和地图显示
    clearEraseAnalysisState()
  }
}, { immediate: true })

// 监听面板关闭时，清除地图图层与状态
watch(() => analysisStore.toolPanel.visible.valueOf?.() ?? analysisStore.toolPanel.visible, (newVisible: any, oldVisible: any) => {
  try {
    const wasVisible = Boolean(oldVisible)
    const nowVisible = Boolean(newVisible)
    if (wasVisible && !nowVisible && (analysisStore.toolPanel.activeTool.valueOf?.() === 'erase' || analysisStore.toolPanel.activeTool === 'erase')) {
      clearEraseAnalysisState()
      analysisStore.setAnalysisStatus('擦除分析面板已关闭，已清除图层与状态')
    }
  } catch (_) {
    clearEraseAnalysisState()
  }
})

</script>

<style scoped>
.analysis-section {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  box-shadow: var(--glow);
}
.btn {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.analysis-actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
