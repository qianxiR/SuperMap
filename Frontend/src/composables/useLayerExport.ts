import { useMapStore } from '@/stores/mapStore'
import { extractGeoJSONFromlayer } from '@/utils/featureUtils'

interface LayerItem {
  key: string;
  name: string;
  displayName: string;
  desc: string;
  visible: boolean;
  source: string;
}

export function useLayerExport() {
  const mapStore = useMapStore()

  /**
   * 导出多个图层为GeoJSON文件
   * 
   * 输入数据格式：
   * @param layers - 要导出的图层列表
   * @param groupName - 图层组名称，用于生成文件名
   * 
   * 数据处理方法：
   * 1. 遍历所有图层，从mapStore中获取对应的OpenLayers图层对象
   * 2. 使用extractGeoJSONFromlayer函数提取每个图层的GeoJSON数据
   * 3. 为每个图层单独生成GeoJSON文件并下载
   * 4. 使用图层自己的名字生成文件名
   * 
   * 输出数据格式：
   * 为每个图层下载独立的GeoJSON文件
   */
  const exportLayersAsGeoJSON = async (layers: LayerItem[], groupName: string): Promise<any> => {
    try {
      if (!layers || layers.length === 0) {
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '导出失败',
            message: '没有可导出的图层',
            type: 'error',
            duration: 3000
          }
        }))
        return
      }

      let successCount = 0
      let errorCount = 0
      const exportedFiles: string[] = []

      // 遍历所有图层，为每个图层单独导出
      for (const layerItem of layers) {
        try {
          // 从mapStore中查找对应的图层对象
          const mapLayer = mapStore.vectorlayers.find(vl => vl.id === layerItem.key)
          
          if (!mapLayer || !mapLayer.layer) {
            console.warn(`图层 ${layerItem.displayName} 未找到或无效`)
            errorCount++
            continue
          }

          // 提取图层的GeoJSON数据
          const geoJSONData = extractGeoJSONFromlayer(mapLayer.layer, mapStore.map, {
            enableLogging: false
          })

          if (geoJSONData && geoJSONData.features && geoJSONData.features.length > 0) {
            // 为每个要素添加图层信息
            const featuresWithLayerInfo = geoJSONData.features.map((feature: any) => ({
              ...feature,
              properties: {
                ...feature.properties,
                sourceLayer: layerItem.displayName,
                sourceLayerType: layerItem.source,
                sourceLayerDesc: layerItem.desc
              }
            }))
            
            // 创建单个图层的GeoJSON
            const layerGeoJSON = {
              type: 'FeatureCollection',
              features: featuresWithLayerInfo,
              properties: {
                exportInfo: {
                  layerName: layerItem.displayName,
                  layerType: layerItem.source,
                  layerDesc: layerItem.desc,
                  featureCount: featuresWithLayerInfo.length,
                  exportTime: new Date().toISOString()
                }
              }
            }

            // 生成文件名并下载
            const now = new Date()
            const hh = String(now.getHours()).padStart(2, '0')
            const mm = String(now.getMinutes()).padStart(2, '0')
            const ss = String(now.getSeconds()).padStart(2, '0')
            const fileName = `${layerItem.displayName}_导出_${hh}${mm}${ss}.geojson`

            const blob = new Blob([JSON.stringify(layerGeoJSON, null, 2)], { 
              type: 'application/json' 
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            exportedFiles.push(fileName)
            successCount++
            
            console.log(`成功导出图层 ${layerItem.displayName}: ${featuresWithLayerInfo.length} 个要素到文件 ${fileName}`)
          } else {
            console.warn(`图层 ${layerItem.displayName} 没有要素数据`)
            errorCount++
          }
        } catch (error) {
          console.error(`导出图层 ${layerItem.displayName} 时出错:`, error)
          errorCount++
        }
      }

      if (successCount === 0) {
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '导出失败',
            message: '所有图层都没有可导出的要素数据',
            type: 'error',
            duration: 3000
          }
        }))
        return
      }

      // 显示成功通知
      const message = successCount === 1 
        ? `已导出图层 "${exportedFiles[0]}"`
        : `已导出 ${successCount} 个图层: ${exportedFiles.join(', ')}`
      
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '导出成功',
          message: message,
          type: 'success',
          duration: 5000
        }
      }))

      // 返回导出结果信息
      return {
        success: true,
        exportedFiles: exportedFiles,
        layerCount: layers.length,
        successCount: successCount,
        errorCount: errorCount
      }
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '导出失败',
          message: `导出过程中发生错误: ${error?.message || '未知错误'}`,
          type: 'error',
          duration: 5000
        }
      }))
      console.error('导出图层时发生错误:', error)
    }
  }

  /**
   * 导出单个图层为GeoJSON文件
   * 
   * 输入数据格式：
   * @param layerKey - 图层唯一标识
   * @param customFileName - 自定义文件名（可选）
   * 
   * 数据处理方法：
   * 1. 根据layerKey从mapStore中查找图层对象
   * 2. 使用extractGeoJSONFromlayer函数提取GeoJSON数据
   * 3. 生成文件名并下载
   * 
   * 输出数据格式：
   * 下载的GeoJSON文件，包含指定图层的要素数据
   */
  const exportSingleLayerAsGeoJSON = async (layerKey: string, customFileName?: string): Promise<any> => {
    try {
      const mapLayer = mapStore.vectorlayers.find(vl => vl.id === layerKey)
      
      if (!mapLayer || !mapLayer.layer) {
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '导出失败',
            message: `图层 ${layerKey} 未找到或无效`,
            type: 'error',
            duration: 3000
          }
        }))
        return
      }

    const geoJSONData = extractGeoJSONFromlayer(mapLayer.layer, mapStore.map)
    
    if (!geoJSONData || !geoJSONData.features || geoJSONData.features.length === 0) {
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '导出失败',
          message: '图层没有可导出的要素数据',
          type: 'error',
          duration: 3000
        }
      }))
      return
    }

    // 生成文件名
    const layerName = mapLayer.name || layerKey
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const fileName = customFileName || `${layerName}_导出_${hh}${mm}${ss}.geojson`

    const blob = new Blob([JSON.stringify(geoJSONData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // 显示成功通知
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '导出成功',
        message: `已导出图层 ${layerName}，共 ${geoJSONData.features.length} 个要素到文件 ${fileName}`,
        type: 'success',
        duration: 3000
      }
    }))

      return {
        success: true,
        fileName: fileName,
        featureCount: geoJSONData.features.length
      }
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '导出失败',
          message: `导出图层时发生错误: ${error?.message || '未知错误'}`,
          type: 'error',
          duration: 5000
        }
      }))
      console.error('导出单个图层时发生错误:', error)
    }
  }

  /**
   * 通用导出单个文件函数 - 插槽函数
   * 
   * 输入数据格式：
   * @param features - 要导出的要素数组
   * @param fileName - 文件名（不包含扩展名）
   * @param exportInfo - 导出信息对象（可选）
   * 
   * 数据处理方法：
   * 1. 验证要素数据有效性
   * 2. 创建GeoJSON FeatureCollection
   * 3. 添加导出元数据信息
   * 4. 生成带时间戳的文件名并下载
   * 
   * 输出数据格式：
   * 下载的GeoJSON文件，包含所有要素和导出信息
   */
  const exportFeaturesAsGeoJSON = async (
    features: any[], 
    fileName: string, 
    exportInfo?: {
      analysisType?: string;
      sourceLayer?: string;
      description?: string;
      parameters?: any;
    }
  ): Promise<any> => {
    try {
      if (!features || features.length === 0) {
        window.dispatchEvent(new CustomEvent('showNotification', {
          detail: {
            title: '导出失败',
            message: '没有可导出的要素数据',
            type: 'error',
            duration: 3000
          }
        }))
        return
      }

      // 扁平化包含 geometry.type === 'FeatureCollection' 的要素，生成标准GeoJSON Feature数组
      const flattenedFeatures = (() => {
        const result: any[] = []
        for (const f of features) {
          const geomType = f?.geometry?.type
          if (geomType === 'FeatureCollection' && Array.isArray(f?.geometry?.features)) {
            const parentProps = f.properties || {}
            for (const sf of f.geometry.features) {
              const mergedProps = {
                ...(sf?.properties || {}),
                ...parentProps
              }
              result.push({
                type: 'Feature',
                id: sf?.id ?? f?.id,
                geometry: sf?.geometry,
                properties: mergedProps
              })
            }
          } else {
            result.push(f)
          }
        }
        return result
      })()

      // 创建GeoJSON FeatureCollection
      const geoJSON = {
        type: 'FeatureCollection',
        features: flattenedFeatures,
        properties: {
          exportInfo: {
            fileName: fileName,
            featureCount: flattenedFeatures.length,
            exportTime: new Date().toISOString(),
            ...exportInfo
          }
        }
      }

      // 生成带时间戳的文件名
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const fullFileName = `${fileName}_${hh}${mm}${ss}.geojson`

      // 下载文件
      const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fullFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // 显示成功通知
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '导出成功',
          message: `已导出 ${fileName}，共 ${flattenedFeatures.length} 个要素到文件 ${fullFileName}`,
          type: 'success',
          duration: 3000
        }
      }))

      return {
        success: true,
        fileName: fullFileName,
        featureCount: flattenedFeatures.length
      }
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '导出失败',
          message: `导出 ${fileName} 时发生错误: ${error?.message || '未知错误'}`,
          type: 'error',
          duration: 5000
        }
      }))
      console.error(`导出 ${fileName} 时发生错误:`, error)
    }
  }

  return {
    exportLayersAsGeoJSON,
    exportSingleLayerAsGeoJSON,
    exportFeaturesAsGeoJSON
  }
}
