import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'
import { uselayermanager } from '@/composables/uselayermanager'
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
  zoomTolayer: boolean
}

export function useDataUpload() {
  const analysisStore = useAnalysisStore()
  const layermanager = uselayermanager()
  const mapStore = useMapStore()
  
  // 状态管理
  const uploadedFiles = ref<UploadedFile[]>([])
  const isUploading = ref<boolean>(false)
  const uploadProgress = ref<number>(0)
  const showUploadModal = ref<boolean>(false)
  const showLayerNameModal = ref<boolean>(false)
  const defaultlayerName = ref<string>('')
  const pendingUploadData = ref<{files: File[], options: UploadOptions} | null>(null)
  
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
    // 生成默认图层名称
    if (files.length === 1) {
      defaultlayerName.value = files[0].name.replace(/\.(geojson|json)$/i, '')
    } else {
      defaultlayerName.value = `上传图层_${files.length}个文件`
    }
    
    // 保存上传数据，显示图层名称弹窗
    pendingUploadData.value = { files, options }
    showLayerNameModal.value = true
    closeUploadModal()
  }

  // 处理图层名称确认
  const handlelayerNameConfirm = async (layerName: string) => {
    if (!pendingUploadData.value) return
    
    showLayerNameModal.value = false
    const { files, options } = pendingUploadData.value
    pendingUploadData.value = null
    
    await performUpload(files, options, layerName)
  }

  // 处理图层名称弹窗关闭
  const handlelayerNameClose = () => {
    showLayerNameModal.value = false
    pendingUploadData.value = null
  }

  // 执行实际的上传操作
  const performUpload = async (files: File[], options: UploadOptions, layerName: string) => {
    isUploading.value = true
    uploadProgress.value = 0

    const total = files.length
    let processed = 0

    for (const file of files) {
      const geojson = await parseGeoJSONFile(file)

      const ol = (window as any).ol
      const projection = mapStore.map.getView().getProjection()
      const features = new ol.format.GeoJSON().readFeatures(geojson, { featureProjection: projection })

      // 使用用户指定的图层名称
      const finallayerName = files.length === 1 ? layerName : `${layerName}_${file.name.replace(/\.(geojson|json)$/i, '')}`
      await layermanager.saveFeaturesAslayer(features, finallayerName, 'upload')

      if (options.zoomTolayer) {
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
    layermanager.saveFeaturesAslayer(features, file.name.replace(/\.(geojson|json)$/i, ''), 'upload')
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
  const createMaplayer = (geojsonData: any, layerName: string) => {
    const ol = (window as any).ol
    const projection = mapStore.map.getView().getProjection()
    const features = new ol.format.GeoJSON().readFeatures(geojsonData, { featureProjection: projection })
    layermanager.saveFeaturesAslayer(features, layerName, 'upload')
  }
  
  // 生成图层样式
  const generatelayerStyle = (_geometryType: string) => {
    return null
  }
  
  return {
    // State
    uploadedFiles,
    isUploading,
    uploadProgress,
    showUploadModal,
    showLayerNameModal,
    defaultlayerName,
    
    // Computed
    hasUploadedFiles,
    successfulUploads,
    
    // Actions
    openUploadModal,
    closeUploadModal,
    handleFileUpload,
    handlelayerNameConfirm,
    handlelayerNameClose,
    clearAllFiles,
    removeFile,
    previewFile,
    addToMap,
    
    // Utilities
    validateGeoJSONFile,
    parseGeoJSONFile,
    createMaplayer,
    generatelayerStyle
  }
}
