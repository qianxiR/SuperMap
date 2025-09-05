import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useLayerManager } from '@/composables/useLayerManager'
import { useMapStore } from '@/stores/mapStore'

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'success' | 'error' | 'parsing' | 'parsed'
  data?: any
  layerId?: string
  error?: string
}

interface UploadOptions {
  autoAddToMap: boolean
  generateStyle: boolean
  zoomToLayer: boolean
}

export function useDataUpload() {
  const analysisStore = useAnalysisStore()
  const layerManager = useLayerManager()
  const mapStore = useMapStore()
  
  // 状态管理
  const uploadedFiles = ref<UploadedFile[]>([])
  const isUploading = ref<boolean>(false)
  const uploadProgress = ref<number>(0)
  const showUploadModal = ref<boolean>(false)
  
  // 计算属性
  const hasUploadedFiles = computed(() => uploadedFiles.value.length > 0)
  const successfulUploads = computed(() => 
    uploadedFiles.value.filter(file => file.status === 'success' || file.status === 'parsed')
  )
  
  // 打开上传模态窗口
  const openUploadModal = () => {
    showUploadModal.value = true
  }
  
  // 关闭上传模态窗口
  const closeUploadModal = () => {
    showUploadModal.value = false
  }
  
  // 处理文件上传
  const handleFileUpload = async (files: File[], options: UploadOptions) => {
    isUploading.value = true
    uploadProgress.value = 0

    const total = files.length
    let processed = 0

    for (const file of files) {
      const geojson = await parseGeoJSONFile(file)

      const ol = (window as any).ol
      const projection = mapStore.map.getView().getProjection()
      const features = new ol.format.GeoJSON().readFeatures(geojson, { featureProjection: projection })

      await layerManager.saveFeaturesAsLayer(features, file.name.replace(/\.(geojson|json)$/i, ''), 'upload')

      if (options.zoomToLayer) {
        const extent = ol.extent.createEmpty()
        for (const f of features) {
          ol.extent.extend(extent, f.getGeometry().getExtent())
        }
        mapStore.map.getView().fit(extent, { duration: 300, maxZoom: 18, padding: [20, 20, 20, 20] })
      }

      processed += 1
      uploadProgress.value = Math.round((processed / total) * 100)
    }

    isUploading.value = false
    analysisStore.setAnalysisStatus('文件上传完成')
  }
  
  // 清除所有文件
  const clearAllFiles = () => {
    uploadedFiles.value = []
    analysisStore.setAnalysisStatus('已清除所有上传文件')
  }
  
  // 移除单个文件
  const removeFile = (index: number) => {
    const file = uploadedFiles.value[index]
    if (file) {
      // TODO: 如果文件已添加到地图，需要从地图中移除对应图层
      uploadedFiles.value.splice(index, 1)
      analysisStore.setAnalysisStatus(`已移除文件: ${file.name}`)
    }
  }
  
  // 预览文件
  const previewFile = (file: UploadedFile) => {
    console.log('预览文件:', file)
    // TODO: 实现文件预览功能
    analysisStore.setAnalysisStatus(`预览文件: ${file.name}`)
  }
  
  // 添加文件到地图
  const addToMap = (file: UploadedFile) => {
    const ol = (window as any).ol
    const projection = mapStore.map.getView().getProjection()
    const features = new ol.format.GeoJSON().readFeatures(file.data, { featureProjection: projection })
    layerManager.saveFeaturesAsLayer(features, file.name.replace(/\.(geojson|json)$/i, ''), 'upload')
    const extent = ol.extent.createEmpty()
    for (const f of features) {
      ol.extent.extend(extent, f.getGeometry().getExtent())
    }
    mapStore.map.getView().fit(extent, { duration: 300, maxZoom: 18, padding: [20, 20, 20, 20] })
    analysisStore.setAnalysisStatus(`添加文件到地图: ${file.name}`)
  }
  
  // 验证GeoJSON文件
  const validateGeoJSONFile = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      resolve(true)
    })
  }
  
  // 解析GeoJSON文件
  const parseGeoJSONFile = (file: File): Promise<any> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = (e.target as any).result as string
        const geojson = JSON.parse(content)
        resolve(geojson)
      }
      reader.readAsText(file)
    })
  }
  
  // 创建地图图层
  const createMapLayer = (geojsonData: any, layerName: string) => {
    const ol = (window as any).ol
    const projection = mapStore.map.getView().getProjection()
    const features = new ol.format.GeoJSON().readFeatures(geojsonData, { featureProjection: projection })
    layerManager.saveFeaturesAsLayer(features, layerName, 'upload')
  }
  
  // 生成图层样式
  const generateLayerStyle = (_geometryType: string) => {
    return null
  }
  
  return {
    // State
    uploadedFiles,
    isUploading,
    uploadProgress,
    showUploadModal,
    
    // Computed
    hasUploadedFiles,
    successfulUploads,
    
    // Actions
    openUploadModal,
    closeUploadModal,
    handleFileUpload,
    clearAllFiles,
    removeFile,
    previewFile,
    addToMap,
    
    // Utilities
    validateGeoJSONFile,
    parseGeoJSONFile,
    createMapLayer,
    generateLayerStyle
  }
}
