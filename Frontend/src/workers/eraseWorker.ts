// 擦除分析Web Worker
// 用于在后台线程中执行擦除计算，避免阻塞主线程

import { difference as turfDifference, kinks as turfKinks, polygon as turfPolygon, multiPolygon as turfMultiPolygon, feature as turfFeature } from '@turf/turf'

// Worker消息类型定义
interface WorkerMessage {
  type: 'PROCESS_BATCH' | 'TERMINATE'
  data?: {
    batchId: string
    targetFeatures: any[]
    eraseFeatures: any[]
    startTargetIndex: number
    endTargetIndex: number
    startEraseIndex: number
    endEraseIndex: number
  }
}

interface WorkerResult {
  type: 'BATCH_COMPLETE' | 'ERROR'
  batchId: string
  results?: any[]
  error?: string
  processedPairs: number
  totalPairs: number
}

// 处理单个要素对的擦除计算
const computeErase = (targetFeature: any, eraseFeature: any, targetIndex: number, eraseIndex: number): any | null => {
  try {
    if (!targetFeature || !eraseFeature) {
      return null
    }

    // 使用Turf.js进行擦除计算
    // 原始方式：把输入拼接成FeatureCollection格式
    const difference = turfDifference({ type: 'FeatureCollection', features: [targetFeature, eraseFeature] })
    
    if (difference && difference.geometry) {
      // 检查几何体是否有自相交
      const kinks = turfKinks(difference)
      if (kinks.features.length > 0) {
        console.warn(`Worker: 擦除结果存在自相交，跳过 [${targetIndex}, ${eraseIndex}]`)
        return null
      }

      return {
        id: `erase_${targetIndex}_${eraseIndex}_${Date.now()}`,
        name: `擦除区域`,
        geometry: difference.geometry,
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

// 处理一批要素的擦除计算
const processBatch = (data: WorkerMessage['data']): WorkerResult => {
  if (!data) {
    return {
      type: 'ERROR',
      batchId: '',
      error: '无效的批处理数据',
      processedPairs: 0,
      totalPairs: 0
    }
  }

  const { batchId, targetFeatures, eraseFeatures, startTargetIndex, endTargetIndex, startEraseIndex, endEraseIndex } = data
  const results: any[] = []
  let processedPairs = 0
  const totalPairs = (endTargetIndex - startTargetIndex) * (endEraseIndex - startEraseIndex)

  console.log(`Worker: 开始处理批次 ${batchId}, 目标范围: [${startTargetIndex}, ${endTargetIndex}), 擦除范围: [${startEraseIndex}, ${endEraseIndex})`)

  try {
    // 遍历目标要素范围
    for (let i = startTargetIndex; i < endTargetIndex; i++) {
      const targetFeature = targetFeatures[i]
      if (!targetFeature) continue

      // 遍历擦除要素范围
      for (let j = startEraseIndex; j < endEraseIndex; j++) {
        const eraseFeature = eraseFeatures[j]
        if (!eraseFeature) continue

        const result = computeErase(targetFeature, eraseFeature, i, j)
        if (result) {
          results.push(result)
        }
        
        processedPairs++
      }
    }

    console.log(`Worker: 批次 ${batchId} 完成，处理了 ${processedPairs} 个组合，生成 ${results.length} 个结果`)

    return {
      type: 'BATCH_COMPLETE',
      batchId,
      results,
      processedPairs,
      totalPairs
    }
  } catch (error: any) {
    console.error(`Worker: 批次 ${batchId} 处理失败:`, error)
    return {
      type: 'ERROR',
      batchId,
      error: error?.message || '未知错误',
      processedPairs,
      totalPairs
    }
  }
}

// 监听主线程消息
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data

  switch (type) {
    case 'PROCESS_BATCH':
      const result = processBatch(data)
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
