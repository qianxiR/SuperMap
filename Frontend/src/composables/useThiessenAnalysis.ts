import { ref, computed } from 'vue'
import { useAnalysisStore } from '@/stores/analysisStore'

interface ThiessenResult {
  type: string
  features: any[]
}

export function useThiessenAnalysis() {
  const analysisStore = useAnalysisStore()
  
  const selectedPoints = ref<any[]>([])
  const thiessenResult = ref<ThiessenResult | null>(null)
  const extent = ref<number[]>([])

  const pointsInfo = computed(() => {
    return selectedPoints.value.map((feature: any, index: number) => {
      const geometry = feature?.getGeometry?.()
      const coords = geometry?.getCoordinates?.()
      return {
        id: `point-${index + 1}`,
        coordinates: Array.isArray(coords) ? `${coords[0]}, ${coords[1]}` : '',
        geometry: geometry
      }
    })
  })

  function selectPoints(): void {
    analysisStore.setAnalysisStatus('请在地图上选择点集生成泰森多边形')
  }

  function setPoints(features: any[]): void {
    selectedPoints.value = features
    analysisStore.setAnalysisStatus('点集已更新')
  }

  function clearSelection(): void {
    selectedPoints.value = []
    thiessenResult.value = null
    extent.value = []
    analysisStore.setAnalysisStatus('')
  }

  function setExtentFromText(text: string): void {
    if (text) {
      const coords = text.split(',').map(Number)
      if (coords.length === 4) {
        extent.value = coords
      }
    }
  }

  async function executeThiessen(): Promise<void> {
    if (selectedPoints.value.length < 3) {
      analysisStore.setAnalysisStatus('至少需要3个点才能生成泰森多边形')
      return
    }

    analysisStore.setAnalysisStatus('正在生成泰森多边形...')
    
    try {
      // 模拟泰森多边形生成
      const mockFeatures = selectedPoints.value.map((_, index) => ({
        type: 'Feature',
        properties: { id: `polygon-${index + 1}` },
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        }
      }))

      thiessenResult.value = {
        type: 'FeatureCollection',
        features: mockFeatures
      }

      analysisStore.setAnalysisStatus('泰森多边形已生成')
    } catch (error) {
      analysisStore.setAnalysisStatus('泰森多边形生成失败')
    }
  }

  return {
    pointsInfo,
    thiessenResult,
    selectPoints,
    setPoints,
    clearSelection,
    setExtentFromText,
    executeThiessen
  }
}
