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
        <SecondaryButton v-if="results.length > 0" text="保存为图层" @click="showLayerNameModal" />
        <SecondaryButton v-if="results.length > 0" text="导出为json" @click="handleExportJSON" />
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
            正在对目标要素 ({{ targetFeatureCount }} 个) 和擦除要素 ({{ eraseFeatureCount }} 个) 进行Web Worker异步擦除分析
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
  
  <!-- 图层名称输入弹窗 -->
  <LayerNameModal
    :visible="showLayerNameModalRef"
    title="保存擦除分析结果"
    placeholder="请输入图层名称"
    hint="图层名称将用于在图层管理器中识别此擦除分析结果"
    :default-name="defaultLayerName"
    @confirm="handleLayerNameConfirm"
    @close="handleLayerNameClose"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEraseAnalysis } from '@/composables/useEraseAnalysis'
import { useLayerManager } from '@/composables/useLayerManager'
import { useMapStore } from '@/stores/mapStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import DropdownSelect from '@/components/UI/DropdownSelect.vue'
import PanelWindow from '@/components/UI/PanelWindow.vue'
import TipWindow from '@/components/UI/TipWindow.vue'
import SecondaryButton from '@/components/UI/SecondaryButton.vue'
import LayerNameModal from '@/components/UI/LayerNameModal.vue'
import GeoJSON from 'ol/format/GeoJSON'
import { Feature } from 'ol'

const {
  targetLayerId,
  eraseLayerId,
  layerOptions,
  results,
  targetFeatureCount,
  eraseFeatureCount,
  isAnalyzing,
  executeEraseAnalysis,
  clearState,
  setTargetLayer,
  setEraseLayer,
  targetFeaturesCache,
  eraseFeaturesCache
} = useEraseAnalysis()

const mapStore = useMapStore()
const analysisStore = useAnalysisStore()
const { saveFeaturesAsLayer } = useLayerManager()

// 图层名称弹窗状态
const showLayerNameModalRef = ref<boolean>(false)
const defaultLayerName = ref<string>('')

const layerOptionsWithNone = computed(() => [{ value: '', label: '无', disabled: false }, ...layerOptions.value])

const selectedTargetId = computed({ get: () => targetLayerId.value, set: (v: string) => setTargetLayer(v) })
const selectedEraseId = computed({ get: () => eraseLayerId.value, set: (v: string) => setEraseLayer(v) })

const handleExecute = () => {
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
    targetLayerId: targetLayerId.value,
    eraseLayerId: eraseLayerId.value,
    targetCount: tCount,
    eraseCount: eCount,
    targetFirstType: tGeom?.getType?.(),
    eraseFirstType: eGeom?.getType?.()
  })

  executeEraseAnalysis({
    targetLayerId: targetLayerId.value,
    eraseLayerId: eraseLayerId.value,
    targetFeatures: targetFeaturesCache.value,
    eraseFeatures: eraseFeaturesCache.value
  })
}

const handleClear = () => {
  clearState()
}

// 显示图层名称输入弹窗
const showLayerNameModal = () => {
  if (results.value.length === 0) {
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '提示',
        message: '没有擦除结果可保存',
        type: 'warning',
        duration: 3000
      }
    }))
    return
  }
  
  defaultLayerName.value = `擦除分析结果`
  showLayerNameModalRef.value = true
}

// 处理图层名称确认
const handleLayerNameConfirm = async (layerName: string) => {
  showLayerNameModalRef.value = false
  await handleSaveLayer(layerName)
}

// 处理图层名称弹窗关闭
const handleLayerNameClose = () => {
  showLayerNameModalRef.value = false
}

const handleSaveLayer = async (customLayerName: string) => {
  if (results.value.length === 0) {
    return
  }
  
  try {
    // 将擦除结果转换为 OpenLayers Feature
    const format = new GeoJSON()
    const features = results.value.map((item: any) => {
      if (item.geometry && item.geometry.type && item.geometry.coordinates) {
        const geometry = format.readGeometry(item.geometry)
        const feature = new Feature({ 
          geometry, 
          properties: { 
            id: item.id, 
            name: item.name, 
            sourceTarget: item.sourceTargetLayerName, 
            sourceErase: item.sourceEraseLayerName, 
            createdAt: item.createdAt,
            analysisType: 'erase'
          } 
        })
        return feature
      }
      return null
    }).filter(Boolean)

    if (features.length > 0) {
      await saveFeaturesAsLayer(features as any[], customLayerName, 'erase')
      
      // 保存成功后清除临时渲染结果
      clearState()
      
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '保存成功',
          message: `已保存 ${features.length} 个擦除结果为图层：${customLayerName}`,
          type: 'success',
          duration: 3000
        }
      }))
    }
  } catch (error: any) {
    console.error('保存擦除结果为图层失败:', error)
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '保存失败',
        message: `保存失败：${error?.message || '未知错误'}`,
        type: 'error',
        duration: 5000
      }
    }))
  }
}

const handleExportJSON = () => {
  const featureCollection = {
    type: 'FeatureCollection',
    features: results.value.map((r: any) => ({ type: 'Feature', geometry: r.geometry, properties: { name: r.name } }))
  }
  const blob = new Blob([JSON.stringify(featureCollection)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `erase_${Date.now()}.geojson`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
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
