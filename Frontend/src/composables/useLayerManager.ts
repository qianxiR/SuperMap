import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { usePopupStore } from '@/stores/popupStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { MapLayer } from '@/types/map';

export function useLayerManager() {
  const mapStore = useMapStore()
  const selectionStore = useSelectionStore()
  const popupStore = usePopupStore()
  const analysisStore = useAnalysisStore()
  
  // 确认对话框状态
  const confirmDialogVisible = ref(false)
  const confirmDialogConfig = ref({
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  })

  // 清除特定图层的选择高亮
  const clearLayerSelection = (layerName: string) => {
    console.log(`清除图层 ${layerName} 的选择高亮和组件状态`)
    
    if (!mapStore.selectLayer || !mapStore.selectLayer.getSource()) return

    const source = mapStore.selectLayer.getSource()
    const features = source.getFeatures()
    
    // 找出属于该图层的选择要素并移除
    const featuresToRemove = features.filter((feature: any) => {
      // 通过几何坐标比较来判断要素是否属于该图层
      const layerInfo = mapStore.vectorLayers.find(l => l.name === layerName)
      if (layerInfo && layerInfo.layer) {
        const layerSource = layerInfo.layer.getSource()
        if (layerSource) {
          const layerFeatures = layerSource.getFeatures()
          return layerFeatures.some((lf: any) => {
            // 通过几何坐标比较来判断是否为同一要素
            const lfGeom = lf.getGeometry()
            const featureGeom = feature.getGeometry()
            if (lfGeom && featureGeom) {
              const lfCoords = JSON.stringify(lfGeom.getCoordinates())
              const featureCoords = JSON.stringify(featureGeom.getCoordinates())
              return lfCoords === featureCoords
            }
            return false
          })
        }
      }
      return false
    })

    console.log(`找到 ${featuresToRemove.length} 个属于图层 ${layerName} 的选择要素，准备移除`)

    // 从选择图层中移除这些要素
    featuresToRemove.forEach((feature: any) => {
      source.removeFeature(feature)
    })

    // 检查弹窗中的要素是否属于被隐藏的图层
    const popupFeature = popupStore.feature
    if (popupFeature) {
      const popupLayerName = popupFeature.get('layerName') || 
                            (popupFeature.getProperties ? popupFeature.getProperties().layerName : null) ||
                            (popupFeature.properties ? popupFeature.properties.layerName : null)
      
      if (popupLayerName === layerName) {
        console.log(`弹窗中的要素属于被隐藏的图层 ${layerName}，清除弹窗`)
        popupStore.hidePopup()
      }
    }

    // 检查当前选中的要素是否属于被隐藏的图层
    const currentSelectedFeature = selectionStore.currentSelectedFeature
    if (currentSelectedFeature) {
      // 通过几何坐标比较来判断当前选中要素是否属于被隐藏的图层
      const layerInfo = mapStore.vectorLayers.find(l => l.name === layerName)
      if (layerInfo && layerInfo.layer) {
        const layerSource = layerInfo.layer.getSource()
        if (layerSource) {
          const layerFeatures = layerSource.getFeatures()
          const isFromHiddenLayer = layerFeatures.some((lf: any) => {
            const lfGeom = lf.getGeometry()
            const currentGeom = currentSelectedFeature.getGeometry()
            if (lfGeom && currentGeom) {
              const lfCoords = JSON.stringify(lfGeom.getCoordinates())
              const currentCoords = JSON.stringify(currentGeom.getCoordinates())
              return lfCoords === currentCoords
            }
            return false
          })
          
          if (isFromHiddenLayer) {
            console.log(`当前选中的要素属于被隐藏的图层 ${layerName}，清除选择状态`)
            selectionStore.clearSelection()
          }
        }
      }
    }

    // 从持久化选择列表中移除相关要素（通过几何坐标比较）
    const updatedFeatures = selectionStore.selectedFeatures.filter((feature: any) => {
      const layerInfo = mapStore.vectorLayers.find(l => l.name === layerName)
      if (layerInfo && layerInfo.layer) {
        const layerSource = layerInfo.layer.getSource()
        if (layerSource) {
          const layerFeatures = layerSource.getFeatures()
          return !layerFeatures.some((lf: any) => {
            const lfGeom = lf.getGeometry()
            const featureGeom = feature.getGeometry?.() || feature.geometry
            if (lfGeom && featureGeom) {
              const lfCoords = JSON.stringify(lfGeom.getCoordinates())
              const featureCoords = JSON.stringify(featureGeom.getCoordinates?.() || featureGeom.coordinates)
              return lfCoords === featureCoords
            }
            return false
          })
        }
      }
      return true
    })
    selectionStore.setSelectedFeatures(updatedFeatures)

    // 如果当前选中的要素被移除，重置选中索引
    if (selectionStore.selectedFeatureIndex >= updatedFeatures.length) {
      selectionStore.setSelectedFeatureIndex(-1)
    }

    // 强制刷新选择图层以确保高亮效果立即消失
    if (mapStore.selectLayer) {
      mapStore.selectLayer.changed()
    }

    console.log(`图层 ${layerName} 的选择状态清除完成`)
  }

  const toggleLayerVisibility = async (layerId: string) => {
    const layerInfo = mapStore.vectorLayers.find(l => l.id === layerId)
    if (layerInfo && layerInfo.layer) {
      const currentVisibility = layerInfo.layer.getVisible()
      const newVisibility = !currentVisibility
      
      console.log(`切换图层 ${layerInfo.name} 可见性: ${currentVisibility} -> ${newVisibility}`)
      
      // 如果图层被隐藏，立即清除该图层的选择高亮和组件状态
      if (!newVisibility) {
        console.log(`图层 ${layerInfo.name} 被隐藏，立即清除相关选择状态`)
        clearLayerSelection(layerInfo.name)
        
        // 强制清除所有选择状态，确保完全清除
        if (mapStore.selectLayer && mapStore.selectLayer.getSource()) {
          const source = mapStore.selectLayer.getSource()
          const features = source.getFeatures()
          features.forEach((f: any) => {
            if (f?.get && (f.get('sourceTag') === 'click' || f.get('sourceTag') === 'area' || f.get('sourceTag') === 'query')) {
              source.removeFeature(f)
            }
          })
        }
        selectionStore.clearSelection()
        
        // 总是清除弹窗状态，确保状态同步
        popupStore.hidePopup()
        
        // 清除查询结果（如果当前在查询工具中）
        const { useFeatureQueryStore } = await import('@/stores/featureQueryStore')
        const featureQuery = useFeatureQueryStore()
        featureQuery.clearQuerySelection()
      }
      
      // 设置图层可见性
      layerInfo.layer.setVisible(newVisibility)
      
      // 确保响应式更新 - 使用数组索引直接更新
      const layerIndex = mapStore.vectorLayers.findIndex(l => l.id === layerId)
      if (layerIndex > -1) {
        // 创建新的对象来触发响应式更新
        mapStore.vectorLayers[layerIndex] = {
          ...mapStore.vectorLayers[layerIndex],
          visible: newVisibility
        }
      }
      
      console.log(`图层 ${layerInfo.name} 可见性切换完成`)
    }
  }

  const removeLayer = (layerId: string) => {
    const index = mapStore.vectorLayers.findIndex(l => l.id === layerId)
    if (index > -1) {
      const layerInfo = mapStore.vectorLayers[index]
      if (layerInfo.layer && mapStore.map) {
        // 移除图层前，清除该图层的选择高亮
        clearLayerSelection(layerInfo.name)
        
        mapStore.map.removeLayer(layerInfo.layer)
        mapStore.vectorLayers.splice(index, 1)
        return true
      }
    }
    return false
  }

  // 保留原有的被禁用的函数，以防其他地方有依赖
  const acceptDrawLayer = (_layerData: MapLayer): boolean => {
    console.log('图层管理功能已禁用')
    return false
  }

  const toggleDrawLayerVisibility = (_layerId: string): boolean => {
    console.log('图层可见性切换功能已禁用')
    return false
  }

  const removeDrawLayer = (_layerId: string): boolean => {
    console.log('图层删除功能已禁用')
    return false
  }

  const updateLayerProperties = (_layerId: string, _properties: Partial<MapLayer>): boolean => {
    console.log('图层属性更新功能已禁用')
    return false
  }

  const findFeatureAtCoordinate = (_coordinate: number[]): any | null => {
    return null
  }

  const toggleFeatureVisibility = (_layerId:string, _featureId: string): boolean => {
    console.log('要素可见性切换功能已禁用')
    return false
  }

  const removeFeature = (_layerId: string, _featureId: string): boolean => {
    console.log('要素删除功能已禁用')
    return false
  }

  // 显示确认对话框
  const showConfirmDialog = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    confirmDialogConfig.value = {
      title,
      message,
      onConfirm,
      onCancel: onCancel || (() => {})
    }
    confirmDialogVisible.value = true
  }

  // 处理确认对话框确认
  const handleConfirmDialogConfirm = () => {
    confirmDialogConfig.value.onConfirm()
    confirmDialogVisible.value = false
  }

  // 处理确认对话框取消
  const handleConfirmDialogCancel = () => {
    confirmDialogConfig.value.onCancel()
    confirmDialogVisible.value = false
  }

  // 处理确认对话框关闭
  const handleConfirmDialogClose = () => {
    confirmDialogVisible.value = false
  }

  // 检查是否处于绘制模式
  const isDrawingMode = () => {
    return analysisStore.drawMode !== ''
  }

  // 获取绘制图层的数据源
  const getDrawLayerSource = () => {
    console.log('开始查找绘制图层...')
    
    // 从地图中查找绘制图层
    if (!mapStore.map) {
      console.warn('地图实例不存在')
      return null
    }
    
    const layers = mapStore.map.getLayers()
    console.log('地图图层总数:', layers.getLength())
    
    for (let i = 0; i < layers.getLength(); i++) {
      const layer = layers.item(i)
      const isDrawLayer = layer.get('isDrawLayer')
      console.log(`图层 ${i}: isDrawLayer = ${isDrawLayer}`)
      
      // 检查是否是绘制图层（通过样式或其他特征识别）
      if (isDrawLayer) {
        const source = layer.getSource()
        console.log('找到绘制图层，数据源:', source)
        return source
      }
    }
    
    console.warn('未找到绘制图层')
    return null
  }

  // 计算两点间距离（千米）
  const calculateDistance = (coord1: number[], coord2: number[]): number => {
    const R = 6371 // 地球半径（千米）
    const lat1 = coord1[1] * Math.PI / 180
    const lat2 = coord2[1] * Math.PI / 180
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180
    const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // 计算线要素长度（千米）
  const calculateLineLength = (coordinates: number[][]): number => {
    if (coordinates.length < 2) return 0
    
    let totalLength = 0
    for (let i = 1; i < coordinates.length; i++) {
      totalLength += calculateDistance(coordinates[i - 1], coordinates[i])
    }
    return totalLength
  }

  // 计算多边形面积（平方千米）
  const calculatePolygonArea = (coordinates: number[][]): number => {
    if (coordinates.length < 3) return 0
    
    // 使用球面多边形面积公式
    const R = 6371 // 地球半径（千米）
    let area = 0
    
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length
      const lat1 = coordinates[i][1] * Math.PI / 180
      const lat2 = coordinates[j][1] * Math.PI / 180
      const deltaLon = (coordinates[j][0] - coordinates[i][0]) * Math.PI / 180
      
      area += deltaLon * Math.sin((lat1 + lat2) / 2)
    }
    
    return Math.abs(area * R * R)
  }



  // 通用保存要素为图层的插槽函数
  const saveFeaturesAsLayer = async (
    features: any[], 
    layerName: string, 
    sourceType: 'draw' | 'area' | 'query' | 'buffer' | 'overlay' | 'path' = 'draw'
  ) => {
    console.log(`开始保存${sourceType}要素为图层: ${layerName}`)
    
    if (!features || features.length === 0) {
      console.warn('没有要素可保存')
      return false
    }

    try {
      // 检查OpenLayers是否可用
      if (!window.ol) {
        throw new Error('OpenLayers库未加载')
      }

      // 创建GeoJSON格式的数据
      const geoJsonData = {
        type: 'FeatureCollection',
        features: features.map((feature: any, index: number) => {
          const geometry = feature.getGeometry()
          if (!geometry) {
            console.warn(`要素 ${index} 没有几何信息`)
            return null
          }
          
          const properties = feature.getProperties() || {}
          const geometryType = geometry.getType()
          const coordinates = geometry.getCoordinates()
          
          console.log(`要素 ${index}: 类型=${geometryType}, 坐标=${JSON.stringify(coordinates)}`)
          
          // 计算几何属性
          let geometricProperties = {}
          
          if (geometryType === 'Point') {
            // 点要素：添加经纬度
            geometricProperties = {
              elementId: index + 1,
              longitude: parseFloat(coordinates[0].toFixed(6)), // 经度，保留6位小数
              latitude: parseFloat(coordinates[1].toFixed(6)),  // 纬度，保留6位小数
              coordinateUnit: '度'
            }
          } else if (geometryType === 'LineString') {
            // 线要素：添加长度
            const length = calculateLineLength(coordinates)
            geometricProperties = {
              elementId: index + 1,
              length: parseFloat(length.toFixed(3)), // 长度，保留3位小数
              lengthUnit: '千米'
            }
          } else if (geometryType === 'Polygon') {
            // 面要素：添加面积
            const area = calculatePolygonArea(coordinates[0]) // 外环坐标
            geometricProperties = {
              elementId: index + 1,
              area: parseFloat(area.toFixed(3)), // 面积，保留3位小数
              areaUnit: '平方千米'
            }
          }
          
          return {
            type: 'Feature',
            id: `${sourceType}_${Date.now()}_${index}`,
            geometry: {
              type: geometryType,
              coordinates: coordinates
            },
            properties: {
              ...properties,
              ...geometricProperties,
              sourceType: sourceType,
              saveTime: new Date().toISOString(),
              layerName: layerName
            }
          }
        }).filter(Boolean) // 过滤掉null值
      }

      console.log('GeoJSON数据:', JSON.stringify(geoJsonData, null, 2))

      // 创建新的图层
      const ol = window.ol
      const newSource = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(geoJsonData, {
          featureProjection: mapStore.map.getView().getProjection()
        })
      })

      // 根据来源类型设置不同的样式
      const getLayerStyle = () => {
        const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--draw-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000')
        
        switch (sourceType) {
          case 'draw':
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: highlightColor,
                width: 2
              }),
              fill: new ol.style.Fill({
                color: `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--draw-rgb').trim() || '0, 0, 0'}, 0.1)`
              }),
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                  color: highlightColor
                }),
                stroke: new ol.style.Stroke({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
                  width: 2
                })
              })
            })
          case 'area':
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: highlightColor,
                width: 2
              }),
              fill: new ol.style.Fill({
                color: `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '0, 0, 0'}, 0.1)`
              }),
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                  color: highlightColor
                }),
                stroke: new ol.style.Stroke({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
                  width: 2
                })
              })
            })
          case 'query':
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: highlightColor,
                width: 2
              }),
              fill: new ol.style.Fill({
                color: `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '0, 0, 0'}, 0.1)`
              }),
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                  color: highlightColor
                }),
                stroke: new ol.style.Stroke({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
                  width: 2
                })
              })
            })
          case 'buffer':
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: '#ff0000',
                width: 3
              }),
              fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.0)' // 完全透明，实现空心效果
              }),
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                  color: '#ff0000'
                }),
                stroke: new ol.style.Stroke({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
                  width: 2
                })
              })
            })
          case 'overlay':
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3b82f6',
                width: 3
              }),
              fill: new ol.style.Fill({
                color: `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '59, 130, 246'}, 0.2)`
              }),
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3b82f6'
                }),
                stroke: new ol.style.Stroke({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
                  width: 2
                })
              })
            })
          default:
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: highlightColor,
                width: 2
              }),
              fill: new ol.style.Fill({
                color: `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '0, 0, 0'}, 0.1)`
              }),
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({
                  color: highlightColor
                }),
                stroke: new ol.style.Stroke({
                  color: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#ffffff',
                  width: 2
                })
              })
            })
        }
      }

      const newLayer = new ol.layer.Vector({
        source: newSource,
        style: getLayerStyle()
      })

      // 设置图层标识
      newLayer.set('isDrawLayer', false)
      newLayer.set('isSavedDrawLayer', true)
      newLayer.set('layerName', layerName)
      newLayer.set('sourceType', sourceType)

      // 添加到地图
      mapStore.map.addLayer(newLayer)

      // 添加到图层管理列表
      const layerId = `${sourceType}_${Date.now()}`
      
      const layerInfo = {
        id: layerId,
        name: layerName,
        layer: newLayer,
        visible: true,
        type: 'vector' as const,
        source: 'local' as const
      }
      
      console.log('添加图层到管理列表:', layerInfo)
      mapStore.vectorLayers.push(layerInfo)
      
      // 强制触发响应式更新
      mapStore.vectorLayers = [...mapStore.vectorLayers]

      console.log(`${sourceType}要素保存成功`)

      // 显示成功通知
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '保存成功',
          message: `已保存 ${features.length} 个${sourceType}要素为新图层`,
          type: 'success',
          duration: 3000
        }
      }))

      return true
    } catch (error: any) {
      console.error(`保存${sourceType}要素失败:`, error)
      console.error('错误详情:', error?.message || '未知错误')
      console.error('错误堆栈:', error?.stack || '无堆栈信息')
      
      // 显示错误通知
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          title: '保存失败',
          message: `保存${sourceType}要素时发生错误: ${error?.message || '未知错误'}`,
          type: 'error',
          duration: 5000
        }
      }))
      
      return false
    }
  }

  // 将绘制内容保存为GeoJSON图层（保持向后兼容）
  const saveDrawAsLayer = async () => {
    console.log('开始保存绘制内容...')
    
    const drawSource = getDrawLayerSource()
    if (!drawSource) {
      console.warn('未找到绘制图层数据源')
      return false
    }

    const features = drawSource.getFeatures()
    console.log('绘制要素数量:', features.length)
    
    if (features.length === 0) {
      console.warn('绘制图层中没有要素')
      return false
    }

    // 使用通用插槽函数保存绘制要素
    const success = await saveFeaturesAsLayer(
      features, 
      `绘制图层_${new Date().toLocaleString()}`, 
      'draw'
    )

    if (success) {
      // 清除原始绘制内容
      drawSource.clear()
    }

    return success
  }

  // 处理绘制模式下的清除操作
  const handleDrawClear = () => {
    if (!isDrawingMode()) {
      return
    }

    const drawSource = getDrawLayerSource()
    if (!drawSource) {
      return
    }

    const features = drawSource.getFeatures()
    if (features.length === 0) {
      return
    }

    // 直接清除绘制内容，不提示保存
    drawSource.clear()
    
    // 显示通知
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        title: '已清除',
        message: '绘制内容已清除',
        type: 'info',
        duration: 2000
      }
    }))
  }

  return {
    // 激活新功能
    toggleLayerVisibility,
    removeLayer,
    clearLayerSelection,

    // 绘制相关功能
    isDrawingMode,
    handleDrawClear,
    saveDrawAsLayer,

    // 通用保存功能
    saveFeaturesAsLayer,

    // 确认对话框相关
    showConfirmDialog,
    confirmDialogVisible,
    confirmDialogConfig,
    handleConfirmDialogConfirm,
    handleConfirmDialogCancel,
    handleConfirmDialogClose,

    // 旧的禁用功能
    managedDrawLayers: computed(() => []),
    acceptDrawLayer,
    toggleDrawLayerVisibility,
    removeDrawLayer,
    updateLayerProperties,
    findFeatureAtCoordinate,
    toggleFeatureVisibility,
    removeFeature,

  }
}
