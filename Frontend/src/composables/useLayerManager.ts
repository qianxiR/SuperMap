import { computed, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { usePopupStore } from '@/stores/popupStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { Maplayer, DrawlayerSaveType, Polygon, Feature, FeatureCollection } from '@/types/map';

export function uselayermanager() {
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
  const clearlayerSelection = (layerName: string) => {
    
    
    if (!mapStore.selectlayer || !mapStore.selectlayer.getSource()) return

    const source = mapStore.selectlayer.getSource()
    const features = source.getFeatures()
    
    // 找出属于该图层的选择要素并移除
    const featuresToRemove = features.filter((feature: any) => {
      // 通过几何坐标比较来判断要素是否属于该图层
      const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName)
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

    

    // 从选择图层中移除这些要素
    featuresToRemove.forEach((feature: any) => {
      source.removeFeature(feature)
    })

    // 检查弹窗中的要素是否属于被隐藏的图层
    const popupFeature = popupStore.feature
    if (popupFeature) {
      const popuplayerName = popupFeature.get('layerName') || 
                            (popupFeature.getProperties ? popupFeature.getProperties().layerName : null) ||
                            (popupFeature.properties ? popupFeature.properties.layerName : null)
      
      if (popuplayerName === layerName) {
        
        popupStore.hidePopup()
      }
    }

    // 检查当前选中的要素是否属于被隐藏的图层
    const currentSelectedFeature = selectionStore.currentSelectedFeature
    if (currentSelectedFeature) {
      // 通过几何坐标比较来判断当前选中要素是否属于被隐藏的图层
      const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName)
      if (layerInfo && layerInfo.layer) {
        const layerSource = layerInfo.layer.getSource()
        if (layerSource) {
          const layerFeatures = layerSource.getFeatures()
          const isFromHiddenlayer = layerFeatures.some((lf: any) => {
            const lfGeom = lf.getGeometry()
            const currentGeom = currentSelectedFeature.getGeometry()
            if (lfGeom && currentGeom) {
              const lfCoords = JSON.stringify(lfGeom.getCoordinates())
              const currentCoords = JSON.stringify(currentGeom.getCoordinates())
              return lfCoords === currentCoords
            }
            return false
          })
          
          if (isFromHiddenlayer) {
            
            selectionStore.clearSelection()
          }
        }
      }
    }

    // 从持久化选择列表中移除相关要素（通过几何坐标比较）
    const updatedFeatures = selectionStore.selectedFeatures.filter((feature: any) => {
      const layerInfo = mapStore.vectorlayers.find(l => l.name === layerName)
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
    if (mapStore.selectlayer) {
      mapStore.selectlayer.changed()
    }

    
  }

  const togglelayerVisibility = async (layerId: string) => {
    const layerInfo = mapStore.vectorlayers.find(l => l.id === layerId)
    if (!layerInfo) {
      console.warn(`图层不存在: ${layerId}`)
      return
    }
    
    const currentVisibility = layerInfo.layer.getVisible()
    const newVisibility = !currentVisibility
    
    // 动态导入useMap以获取相关函数
    const { useMap } = await import('@/composables/useMap')
    const { loadLazyLayer, unloadLazyLayer } = useMap()
    
    if (newVisibility) {
      // 显示图层逻辑
      if (layerInfo.isLazyLoaded && !layerInfo.isLoaded) {
        // 懒加载图层且未加载数据，需要先加载数据
        
        const loadSuccess = await loadLazyLayer(layerInfo.name)
        if (!loadSuccess) {
          console.error(`懒加载图层失败: ${layerInfo.name}`)
          return
        }
        
      } else {
        // 非懒加载图层或已加载的懒加载图层，直接显示
        layerInfo.layer.setVisible(true)
      }
      
      // 检查是否为建筑物图层，如果是则启用2.5D渲染
      if (layerInfo.name === '建筑物面' && mapStore.map) {
        const { enablePolygonExtrusion } = await import('@/composables/useBuildingExtrusion')
        const color = getComputedStyle(document.documentElement).getPropertyValue('--building-3d-color').trim()
        enablePolygonExtrusion(layerInfo.layer, mapStore.map, color)
      }
    } else {
      // 隐藏图层逻辑
      
      // 清除该图层的选择高亮和组件状态
      clearlayerSelection(layerInfo.name)
      
      // 强制清除所有选择状态，确保完全清除
      if (mapStore.selectlayer && mapStore.selectlayer.getSource()) {
        const source = mapStore.selectlayer.getSource()
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
      
      if (layerInfo.isLazyLoaded && layerInfo.isLoaded) {
        // 懒加载图层且已加载数据，需要完全卸载数据
        
        const unloadSuccess = await unloadLazyLayer(layerInfo.name)
        if (!unloadSuccess) {
          console.error(`卸载懒加载图层失败: ${layerInfo.name}`)
        } else {
        }
      } else {
        // 非懒加载图层，只设置可见性
        layerInfo.layer.setVisible(false)
      }
    }
    
    // 确保响应式更新 - 使用数组索引直接更新
    const layerIndex = mapStore.vectorlayers.findIndex(l => l.id === layerId)
    if (layerIndex > -1) {
      // 创建新的对象来触发响应式更新
      mapStore.vectorlayers[layerIndex] = {
        ...mapStore.vectorlayers[layerIndex],
        visible: newVisibility
      }
    }
  }

  // 监听 Agent 工具事件以执行图层显隐 - 只注册一次
  if (typeof window !== 'undefined' && !(window as any).__agentEventListenersRegistered) {
    (window as any).__agentEventListenersRegistered = true
    
    const getBaseName = (n: string): string => {
      if (!n) return n
      const idx = n.indexOf('@')
      return idx >= 0 ? n.slice(0, idx) : n
    }
    
    window.addEventListener('agent:toggleLayerVisibility', (e: any) => {
      const { layerName, action } = e.detail || {}
      if (!layerName || !action) return
      // 仅按基础名匹配
      const providedBase = getBaseName(layerName)
      const primary = mapStore.vectorlayers.find(l => getBaseName(l.name) === providedBase)
      if (!primary) return
      const targetBaseName = getBaseName(primary.name)
      // 在四个分组中同步同名（基础名相同）图层
      const siblings = mapStore.vectorlayers.filter(l => getBaseName(l.name) === targetBaseName)
      const targets = siblings
      for (const info of targets) {
        if (action === 'toggle') {
          togglelayerVisibility(info.id)
        } else if (action === 'show') {
          if (info.visible === false) togglelayerVisibility(info.id)
        } else if (action === 'hide') {
          if (info.visible === true) togglelayerVisibility(info.id)
        }
      }
    })
    
    // 监听 Agent 属性查询事件
    window.addEventListener('agent:queryFeaturesByAttribute', async (e: any) => {
      const { layerName, field, operator, value } = e.detail || {}
      if (!layerName || !field || !operator || value === undefined) {
        console.warn('[Agent] 属性查询参数不完整:', { layerName, field, operator, value })
        return
      }
      
        // 以字典格式提取纯文字，避免字符串引号问题
        const params = {
          layerName: layerName,
          field: field, 
          operator: operator,
          value: value
        }
        
        // 直接从字典中提取纯文字内容
        const cleanLayerName = params.layerName
        const cleanField = params.field
        const cleanOperator = params.operator
        const cleanValue = params.value
        
        console.log('[Agent] 字典格式参数提取:')
        console.log('原始参数字典:', params)
        console.log('提取的纯文字:', {
          layerName: cleanLayerName,
          field: cleanField,
          operator: cleanOperator,
          value: cleanValue
        })
        
        // 详细追踪参数构造过程
        console.log('[Agent] 参数构造详细追踪:')
        console.log('1. 原始event.detail:', e.detail)
        console.log('2. 解构后的参数:', { layerName, field, operator, value })
        console.log('3. 参数字典构造:', params)
        console.log('4. 各参数类型检查:', {
          layerName: typeof layerName,
          field: typeof field,
          operator: typeof operator,
          value: typeof value
        })
        console.log('5. 各参数内容检查:', {
          layerName: `"${layerName}"`,
          field: `"${field}"`,
          operator: `"${operator}"`,
          value: `"${value}"`
        })
      
      try {
        // 动态导入useFeatureQuery以获取查询功能
        const { useFeatureQuery } = await import('@/composables/useFeatureQuery')
        const featureQuery = useFeatureQuery()
        
        // 查找目标图层
        const getBaseName = (n: string): string => {
          if (!n) return n
          const idx = n.indexOf('@')
          return idx >= 0 ? n.slice(0, idx) : n
        }
        
        const providedBase = getBaseName(cleanLayerName)
        const targetLayer = mapStore.vectorlayers.find(l => getBaseName(l.name) === providedBase)
        
        if (!targetLayer) {
          console.warn(`[Agent] 图层不存在: ${cleanLayerName}`)
          return
        }
        
        // 确保图层可见性 - 如果图层隐藏则自动打开
        if (!targetLayer.visible) {
          console.log(`[Agent] 图层"${cleanLayerName}"当前隐藏，自动打开图层`)
          togglelayerVisibility(targetLayer.id)
        }
        
        // 设置查询图层
        featureQuery.selectedlayerId.value = targetLayer.id
        
        // 等待图层字段加载
        await featureQuery.getlayerFields(targetLayer.id)
        
        // 操作符映射：将LLM的操作符转换为前端支持的操作符
        const operatorMap: Record<string, string> = {
          '=': 'eq',
          '!=': 'ne', 
          '>': 'gt',
          '>=': 'gte',
          '<': 'lt',
          '<=': 'lte',
          'like': 'like'
        }
        
        const mappedOperator = operatorMap[params.operator] || params.operator
        
        console.log(`[Agent] 操作符映射: "${params.operator}" -> "${mappedOperator}"`)
        
        // 设置查询条件 - 使用字典格式确保纯文字
        const condition = {
          fieldName: params.field,      // 直接从字典读取
          operator: mappedOperator,     // 使用映射后的操作符
          value: params.value          // 直接从字典读取
        }
        
        console.log('[Agent] 查询条件构造详细追踪:')
        console.log('1. 原始参数字典:', params)
        console.log('2. 操作符映射结果:', {
          原始操作符: params.operator,
          映射后操作符: mappedOperator
        })
        console.log('3. 最终查询条件构造:', condition)
        console.log('4. 查询条件各字段详情:', {
          fieldName: `"${condition.fieldName}" (类型: ${typeof condition.fieldName})`,
          operator: `"${condition.operator}" (类型: ${typeof condition.operator})`,
          value: `"${condition.value}" (类型: ${typeof condition.value})`
        })
        console.log('5. 查询条件JSON序列化:', JSON.stringify(condition))
        


        
        // 更新查询配置
        featureQuery.queryConfig.value.condition = condition

        // 执行查询
        const result = await featureQuery.executeQuery()
        if (result.success) {
          const successMessage = `在图层"${cleanLayerName}"中找到${result.data.length}个匹配要素`
          console.log(`[Agent] 属性查询成功: ${successMessage}`)
          
          // 自动高亮显示查询结果
          if (result.data.length > 0) {
            featureQuery.highlightQueryResults()
          }
          
          // 发送查询结果事件，供LLM使用
          const resultEvent = new CustomEvent('agent:queryResult', {
            detail: {
              success: true,
              message: successMessage,
              layerName: cleanLayerName,
              field: cleanField,
              operator: cleanOperator,
              value: cleanValue,
              count: result.data.length
            }
          })
          window.dispatchEvent(resultEvent)
        } else {
          const errorMessage = `查询失败: ${result.error}`
          console.error(`[Agent] 属性查询失败:`, result.error)
          
          // 发送查询失败事件
          const errorEvent = new CustomEvent('agent:queryResult', {
            detail: {
              success: false,
              message: errorMessage,
              layerName: cleanLayerName,
              field: cleanField,
              operator: cleanOperator,
              value: cleanValue,
              error: result.error
            }
          })
          window.dispatchEvent(errorEvent)
        }
        
      } catch (error) {
        console.error('[Agent] 执行属性查询时出错:', error)
      }
    })
  } // 结束只注册一次的if语句

  const removeLayer = (layerId: string) => {
    const index = mapStore.vectorlayers.findIndex(l => l.id === layerId)
    if (index > -1) {
      const layerInfo = mapStore.vectorlayers[index]
      if (layerInfo.layer && mapStore.map) {
        // 移除图层前，清除该图层的选择高亮
        clearlayerSelection(layerInfo.name)
        
        mapStore.map.removeLayer(layerInfo.layer)
        mapStore.vectorlayers.splice(index, 1)
        return true
      }
    }
    return false
  }

  // 保留原有的被禁用的函数，以防其他地方有依赖
  const acceptDrawlayer = (_layerData: Maplayer): boolean => {
    
    return false
  }

  const toggleDrawlayerVisibility = (_layerId: string): boolean => {
    
    return false
  }

  const removeDrawlayer = (_layerId: string): boolean => {
    
    return false
  }

  const updatelayerProperties = (_layerId: string, _properties: Partial<Maplayer>): boolean => {
    
    return false
  }

  const findFeatureAtCoordinate = (_coordinate: number[]): any | null => {
    return null
  }

  const toggleFeatureVisibility = (_layerId:string, _featureId: string): boolean => {
    
    return false
  }

  const removeFeature = (_layerId: string, _featureId: string): boolean => {
    
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
  const getDrawlayerSource = () => {
    // 从地图中查找绘制图层
    if (!mapStore.map) {
      return null
    }
    
    const layers = mapStore.map.getLayers()
    
    for (let i = 0; i < layers.getLength(); i++) {
      const layer = layers.item(i)
      const isDrawlayer = layer.get('isDrawlayer')
      
      // 检查是否是绘制图层（通过样式或其他特征识别）
      if (isDrawlayer) {
        const source = layer.getSource()
        return source
      }
    }
    
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
  const saveFeaturesAslayer = async (
    features: any[], 
    layerName: string, 
    sourceType: 'draw' | 'area' | 'query' | 'buffer' | 'path' | 'upload' | 'intersect' | 'erase' = 'draw'
  ) => {
    
    
    if (!features || features.length === 0) {
      
      return false
    }

    try {
      // 检查Openlayers是否可用
      if (!window.ol) {
        throw new Error('Openlayers库未加载')
      }

      // 分析要素类型，决定保存格式
      const geometryTypes = new Set<string>()
      const validFeatures = features.filter((feature: any) => {
        const geometry = feature.getGeometry()
        if (!geometry) return false
        geometryTypes.add(geometry.getType())
        return true
      })

      if (validFeatures.length === 0) {
        return false
      }

      // 根据要素类型决定保存格式
      let saveFormat: 'polygon' | 'featurecollection'
      if (geometryTypes.size === 1 && geometryTypes.has('Polygon')) {
        // 只有多边形时，保存为多边形
        saveFormat = 'polygon'
      } else {
        // 其他情况（点、线、面混合或只有点/线）都保存为要素集合
        saveFormat = 'featurecollection'
      }

      // 创建GeoJSON格式的数据
      const geoJsonData = {
        type: 'FeatureCollection',
        features: validFeatures.map((feature: any, index: number) => {
          const geometry = feature.getGeometry()
          const properties = feature.getProperties() || {}
          const geometryType = geometry.getType()
          const coordinates = geometry.getCoordinates()

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
              // 直接使用原始属性，后端已经处理了所有必要的元数据
              ...properties,
              // 只添加必要的几何属性（如果不存在）
              ...Object.fromEntries(
                Object.entries(geometricProperties).filter(([key]) => !(key in properties))
              ),
              // 只添加基本的保存元数据（如果不存在）
              ...(properties.sourceType ? {} : { sourceType: sourceType }),
              ...(properties.saveTime ? {} : { saveTime: new Date().toISOString() }),
              ...(properties.layerName ? {} : { layerName: layerName }),
              ...(properties.saveFormat ? {} : { saveFormat: saveFormat })
            }
          }
        })
      }

      

      // 创建新的图层
      const ol = window.ol
      const newSource = new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(geoJsonData, {
          featureProjection: mapStore.map.getView().getProjection()
        })
      })

      // 根据来源类型设置不同的样式
      const getlayerStyle = () => {
        const css = getComputedStyle(document.documentElement)
        const panelColor = css.getPropertyValue('--panel').trim() || '#ffffff'
        
        // 获取统一的红色主题变量
        const getRedColor = (type: string) => {
          const colorVar = `--${type}-color`
          const rgbVar = `--${type}-rgb`
          const color = css.getPropertyValue(colorVar).trim() || '#0078D4'
          const rgb = css.getPropertyValue(rgbVar).trim() || '0, 120, 212'
          return { color, rgb }
        }
        
        // 创建统一的红色样式
        const createRedStyle = (type: string, width: number = 2) => {
          const { color, rgb } = getRedColor(type)
          return new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: color,
              width: width
            }),
            fill: new ol.style.Fill({
              color: color + '4D' // 70%透明度
            }),
            image: new ol.style.Circle({
              radius: 6,
              fill: new ol.style.Fill({
                color: color
              }),
              stroke: new ol.style.Stroke({
                color: panelColor,
                width: 2
              })
            })
          })
        }
        
        switch (sourceType) {
          case 'draw':
            return createRedStyle('draw', 2)
          case 'area':
            return createRedStyle('analysis', 2)
          case 'query':
            return createRedStyle('analysis', 2)
          case 'buffer':
            return createRedStyle('analysis', 3)
          case 'upload':
            return createRedStyle('upload', 3)
          case 'path':
            // 路径分析使用蓝色
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: '#0078D4',
                width: 4
              }),
              fill: new ol.style.Fill({
                color: '#0078D44D' // 蓝色，70%透明度
              }),
              image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                  color: '#0078D4'
                }),
                stroke: new ol.style.Stroke({
                  color: panelColor,
                  width: 2
                })
              })
            })
          case 'intersect':
            return createRedStyle('analysis', 3)
          case 'erase':
            return createRedStyle('analysis', 3)
          default:
            return createRedStyle('analysis', 2)
        }
      }

      const newlayer = new ol.layer.Vector({
        source: newSource,
        style: getlayerStyle()
      })

      // 设置图层标识
      newlayer.set('isDrawlayer', false)
      newlayer.set('isSavedDrawlayer', true)
      newlayer.set('layerName', layerName)
      newlayer.set('sourceType', sourceType)

      // 添加到地图
      mapStore.map.addLayer(newlayer)

      // 添加到图层管理列表
      const layerId = `${sourceType}_${Date.now()}`
      
      const layerInfo = {
        id: layerId,
        name: layerName,
        layer: newlayer,
        visible: true,
        type: 'vector' as const,
        source: 'local' as const
      }
      
      
      mapStore.vectorlayers.push(layerInfo)
      
      // 强制触发响应式更新
      mapStore.vectorlayers = [...mapStore.vectorlayers]

      

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

  // 将绘制内容保存为GeoJSON图层（支持多种保存格式）
  const saveDrawAslayer = async (layerName?: string): Promise<DrawlayerSaveType | false> => {
    const drawSource = getDrawlayerSource()
    if (!drawSource) {
      return false
    }

    const features = drawSource.getFeatures()
    
    if (features.length === 0) {
      return false
    }

    // 分析要素类型，决定保存格式
    const geometryTypes = new Set<string>()
    const validFeatures = features.filter((feature: any) => {
      const geometry = feature.getGeometry()
      if (!geometry) return false
      geometryTypes.add(geometry.getType())
      return true
    })

    if (validFeatures.length === 0) {
      return false
    }

    // 根据要素类型决定保存格式
    let saveFormat: 'polygon' | 'featurecollection'
    let result: DrawlayerSaveType

    if (geometryTypes.size === 1 && geometryTypes.has('Polygon')) {
      // 只有多边形时，保存为多边形
      saveFormat = 'polygon'
      const polygonFeature = validFeatures.find((f: any) => f.getGeometry().getType() === 'Polygon')
      if (polygonFeature) {
        const geometry = polygonFeature.getGeometry()
        result = {
          type: 'Polygon',
          coordinates: geometry.getCoordinates()
        } as Polygon
      } else {
        return false
      }
    } else {
      // 其他情况（点、线、面混合或只有点/线）都保存为要素集合
      saveFormat = 'featurecollection'
      result = {
        type: 'FeatureCollection',
        features: validFeatures.map((feature: any, index: number) => {
          const geometry = feature.getGeometry()
          const properties = feature.getProperties() || {}
          
          return {
            type: 'Feature',
            id: `draw_${Date.now()}_${index}`,
            geometry: {
              type: geometry.getType(),
              coordinates: geometry.getCoordinates()
            },
            properties: {
              ...properties,
              sourceType: 'draw',
              saveTime: new Date().toISOString(),
              saveFormat: saveFormat
            }
          }
        })
      } as FeatureCollection<Polygon>
    }

    // 生成默认图层名称
    const defaultlayerName = generateDefaultDrawlayerName(geometryTypes)
    const finallayerName = layerName || defaultlayerName

    // 使用通用插槽函数保存绘制要素
    const success = await saveFeaturesAslayer(
      features, 
      finallayerName, 
      'draw'
    )

    if (success) {
      // 清除原始绘制内容
      drawSource.clear()
      return result
    }

    return false
  }

  // 生成默认绘制图层名称
  const generateDefaultDrawlayerName = (geometryTypes: Set<string>): string => {
    const timestamp = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/[\/\s:]/g, '')
    
    if (geometryTypes.size === 1) {
      const type = Array.from(geometryTypes)[0]
      switch (type) {
        case 'Point':
          return `绘制点_${timestamp}`
        case 'LineString':
          return `绘制线_${timestamp}`
        case 'Polygon':
          return `绘制面_${timestamp}`
        default:
          return `绘制图层_${timestamp}`
      }
    } else {
      return `绘制图层_${timestamp}`
    }
  }

  // 处理绘制模式下的清除操作
  const handleDrawClear = () => {
    if (!isDrawingMode()) {
      return
    }

    const drawSource = getDrawlayerSource()
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
    togglelayerVisibility,
    removeLayer,
    clearlayerSelection,

    // 绘制相关功能
    isDrawingMode,
    handleDrawClear,
    saveDrawAslayer,

    // 通用保存功能
    saveFeaturesAslayer,

    // 确认对话框相关
    showConfirmDialog,
    confirmDialogVisible,
    confirmDialogConfig,
    handleConfirmDialogConfirm,
    handleConfirmDialogCancel,
    handleConfirmDialogClose,

    // 旧的禁用功能
    managedDrawlayers: computed(() => []),
    acceptDrawlayer,
    toggleDrawlayerVisibility,
    removeDrawlayer,
    updatelayerProperties,
    findFeatureAtCoordinate,
    toggleFeatureVisibility,
    removeFeature,

  }
}
