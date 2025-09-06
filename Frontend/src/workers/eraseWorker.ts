// 擦除分析Web Worker
// 用于在后台线程中执行擦除计算，避免阻塞主线程

import { difference as turfDifference, polygon as turfPolygon, multiPolygon as turfMultiPolygon, feature as turfFeature } from '@turf/turf'

// 工具函数：将turf几何对象包装成FeatureCollection格式
const wrapTurfGeometryAsFeatureCollection = (turfGeometry: any): any => {
  if (!turfGeometry) return null
  return { type: 'FeatureCollection', features: [turfGeometry] }
}

// 工具函数：为turf分析函数准备FeatureCollection格式的输入
const prepareTurfAnalysisInput = (geometry1: any, geometry2: any): any => {
  if (!geometry1 || !geometry2) return null
  
  // 确保输入的是完整的Feature对象，而不是只有geometry属性
  const feature1 = geometry1.type === 'Feature' ? geometry1 : turfFeature(geometry1)
  const feature2 = geometry2.type === 'Feature' ? geometry2 : turfFeature(geometry2)
  
  return { type: 'FeatureCollection', features: [feature1, feature2] }
}

// Worker消息类型定义
interface WorkerMessage {
  type: 'PROCESS_ALL' | 'TERMINATE'
  data?: {
    targetFeatures: any[]
    eraseFeatures: any[]
    targetLayerName?: string
    eraseLayerName?: string
  }
}

interface WorkerResult {
  type: 'COMPLETE' | 'ERROR'
  results?: any[]
  error?: string
}

// 处理单个要素对的擦除计算
const computeErase = (targetFeature: any, eraseFeature: any, targetIndex: number, eraseIndex: number, targetLayerName: string = '目标图层', eraseLayerName: string = '擦除图层'): any | null => {
  try {
    if (!targetFeature || !eraseFeature) {
      return null
    }

    // 使用工具函数准备FeatureCollection格式的输入进行擦除计算
    const featureCollection = prepareTurfAnalysisInput(targetFeature, eraseFeature)
    if (!featureCollection) {
      console.warn(`Worker: 无法准备FeatureCollection格式输入 [${targetIndex}, ${eraseIndex}]`)
      return null
    }
    
    const difference = turfDifference(featureCollection)
    
    if (difference && difference.geometry) {
      return {
        id: `erase_${targetIndex}_${eraseIndex}_${Date.now()}`,
        name: `擦除区域`,
        geometry: difference.geometry,
        sourceTargetLayerName: targetLayerName,
        sourceEraseLayerName: eraseLayerName,
        targetIndex,
        eraseIndex,
        createdAt: new Date().toISOString()
      }
    }
    
    return null
  } catch (error) {
    console.warn(`Worker: 擦除计算失败 [${targetIndex}, ${eraseIndex}]:`, error)
    return null
  }
}

// 处理所有要素的擦除计算
const processAll = (data: WorkerMessage['data']): WorkerResult => {
  if (!data) {
    return {
      type: 'ERROR',
      error: '无效的数据'
    }
  }

  const { targetFeatures, eraseFeatures, targetLayerName, eraseLayerName } = data
  const results: any[] = []

  console.log(`Worker: 开始处理擦除分析，目标要素: ${targetFeatures.length} 个，擦除要素: ${eraseFeatures.length} 个`)

  try {
    // 遍历所有目标要素
    for (let i = 0; i < targetFeatures.length; i++) {
      const targetFeature = targetFeatures[i]
      if (!targetFeature) continue

      // 遍历所有擦除要素
      for (let j = 0; j < eraseFeatures.length; j++) {
        const eraseFeature = eraseFeatures[j]
        if (!eraseFeature) continue

        const result = computeErase(targetFeature, eraseFeature, i, j, targetLayerName, eraseLayerName)
        if (result) {
          results.push(result)
        }
      }
    }

    console.log(`Worker: 擦除分析完成，生成 ${results.length} 个结果`)

    return {
      type: 'COMPLETE',
      results
    }
  } catch (error: any) {
    console.error('Worker: 擦除分析失败:', error)
    return {
      type: 'ERROR',
      error: error?.message || '未知错误'
    }
  }
}

// 监听主线程消息
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data

  switch (type) {
    case 'PROCESS_ALL':
      const result = processAll(data)
      self.postMessage(result)
      break
    
    case 'TERMINATE':
      console.log('Worker: 收到终止信号，关闭worker')
      self.close()
      break
    
    default:
      console.warn('Worker: 未知消息类型:', type)
  }
})

// Worker初始化完成
console.log('Worker: 擦除分析Worker已初始化')
