import { ref } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { usePopupStore } from '@/stores/popupStore'
import { useAnalysisStore } from '@/stores/analysisStore'

/**
 * 地图交互管理 Composable
 * 
 * 功能：处理地图上的用户交互，包括点击、悬停、要素选择等
 * 职责：要素选择逻辑、弹窗显示、事件处理、交互状态管理等
 * 
 * @returns {Object} 交互管理相关的方法
 */
export function useMapInteraction() {
  const mapStore = useMapStore()
  const selectionStore = useSelectionStore()
  const popupStore = usePopupStore()
  const analysisStore = useAnalysisStore()
  
  const hoverTimer = ref<number | null>(null)

  /**
   * 处理要素悬停效果
   * 清除悬停高亮并重置鼠标样式
   * 
   * @param {any} hoverSource - 悬停图层的数据源
   */
  const handleFeatureHover = async (hoverSource: any): Promise<void> => {
    hoverSource.clear()
    if (mapStore.map) {
      mapStore.map.getTargetElement().style.cursor = 'default'
    }
  }
  
  /**
   * 处理地图点击事件
   * 根据当前工具状态决定执行不同的点击逻辑
   * 
   * @param {any} evt - 地图点击事件对象
   * @param {any} selectSource - 选择图层的数据源
   */
  const handleMapClick = async (evt: any, selectSource: any): Promise<void> => {
    if (analysisStore.toolPanel?.activeTool === 'draw' && analysisStore.drawMode === 'point') {
      const coord = mapStore.map.getCoordinateFromPixel(evt.pixel)
      if (coord) {
        window.dispatchEvent(new CustomEvent('drawPointClick', { 
          detail: { coordinate: coord, pixel: evt.pixel } 
        }))
      }
      return
    }
    
    await handleNormalClick(evt, selectSource)
  }

  /**
   * 处理普通点击事件
   * 要素选择、属性查看、弹窗显示的核心逻辑
   * 
   * @param {any} evt - 地图点击事件对象
   * @param {any} selectSource - 选择图层的数据源
   */
  const handleNormalClick = async (evt: any, selectSource: any): Promise<void> => {
    const map = evt.map;
    
    const isEditToolActive = analysisStore.toolPanel?.activeTool === 'attribute-selection';
    const isQueryToolActive = analysisStore.toolPanel?.activeTool === 'area-selection';
    const isDistanceMeasureMode = analysisStore.isDistanceMeasureMode;
    const isAreaMeasureMode = analysisStore.isAreaMeasureMode;
    
    // 检查是否处于绘制模式
    const isDrawingMode = analysisStore.drawMode !== '';
    
    // 如果处于距离量测模式、面积量测模式或绘制模式，禁用要素点击选择功能
    if (isDistanceMeasureMode || isAreaMeasureMode || isDrawingMode) {
      return;
    }
    
    const feature = map.forEachFeatureAtPixel(
      evt.pixel,
      (f: any, l: any) => {
        const isInteractiveLayer = l && l !== mapStore.baselayer && l !== mapStore.hintersecter && l !== mapStore.selectlayer;
        if (isInteractiveLayer && l.getVisible()) {
          return f;
        }
        return undefined;
      },
      {
        hitTolerance: 5
      }
    );

    // 移除点击外部区域清除选中状态高亮的功能
    // 保持选中状态，不再自动清除

    if (feature) {
      if (isEditToolActive || isQueryToolActive) {
        const isInSelectedFeatures = selectionStore.selectedFeatures.some((selectedFeature: any) => {
          const originalSelectedFeature = selectedFeature._originalFeature || selectedFeature;
          
          if (originalSelectedFeature === feature) {
            return true;
          }
          
          const selectedGeometry = originalSelectedFeature.getGeometry?.() || selectedFeature.geometry;
          const clickedGeometry = feature.getGeometry();
          
          if (selectedGeometry && clickedGeometry) {
            const selectedCoords = selectedGeometry.getCoordinates?.() || selectedGeometry.coordinates;
            const clickedCoords = clickedGeometry.getCoordinates();
            
            if (selectedCoords && clickedCoords) {
              return JSON.stringify(selectedCoords) === JSON.stringify(clickedCoords);
            }
          }
          return false;
        });
        
        if (isInSelectedFeatures) {
          if (isEditToolActive) {
            const selectedIndex = selectionStore.selectedFeatures.findIndex((selectedFeature: any) => {
              const originalSelectedFeature = selectedFeature._originalFeature || selectedFeature;
              return originalSelectedFeature === feature;
            });
            if (selectedIndex !== -1) {
              selectionStore.setSelectedFeatureIndex(selectedIndex);
            }
          } else if (isQueryToolActive) {
            await triggerQueryFeatureSelection(feature);
          }
        } else {
          return;
        }
      } else {

        
        // 清除之前的点击选择
        const source = mapStore.selectlayer?.getSource()
        if (source) {
          const features = source.getFeatures()
          features.forEach((f: any) => {
            if (f?.get && f.get('sourceTag') === 'click') {
              source.removeFeature(f)
            }
          })
        }
        // 只清除点击选择的状态，不影响其他选择
        selectionStore.clearSelection()
        
        // 标记来源为点击选择
        try { feature.set('sourceTag', 'click') } catch (_) {}
        
        // 添加到选择图层
        selectSource.addFeature(feature);
        
        // 添加到选择状态（直接使用原始要素）
        selectionStore.addSelectedFeature(feature);
        
        if (mapStore.selectlayer) {
          mapStore.selectlayer.changed();
        }

        // 直接从GeoJSON properties中获取数据
        const properties = feature.getProperties ? feature.getProperties() : {}
        
        let content = '<div class="feature-info">';
        
        // 显示所有GeoJSON属性字段
        Object.keys(properties).forEach(key => {
          if (key !== 'geometry') {
            const value = properties[key];
            const displayValue = value !== undefined && value !== null ? value : '(空值)';
            content += `<div class="field-row"><span class="field-label">${key}:</span><span class="field-value">${displayValue}</span></div>`;
          }
        });
        
        content += '</div>';

        popupStore.showPopup(
          { x: evt.pixel[0], y: evt.pixel[1] },
          content,
          feature,
          evt.coordinate
        );
      }
    } else {
      // 移除点击非要素区域清除弹窗和选中区域高亮的功能
      // 仅在编辑工具激活时隐藏弹窗
      if (isEditToolActive) {
        popupStore.hidePopup();
      }
    }
  }

  /**
   * 触发查询要素选择
   * 在查询模式下处理要素点击选择逻辑
   * 
   * @param {any} clickedFeature - 被点击的要素
   */
  const triggerQueryFeatureSelection = async (clickedFeature: any) => {
    try {
      const { useFeatureQuery } = await import('@/composables/useFeatureQuery')
      const featureQuery = useFeatureQuery()
      
      const queryResults = featureQuery.queryResults.value
      const selectedIndex = queryResults.findIndex((result: any) => {
        const resultGeometry = result.getGeometry?.() || result.geometry
        const clickedGeometry = clickedFeature.getGeometry()
        
        if (resultGeometry && clickedGeometry) {
          const resultCoords = resultGeometry.getCoordinates?.() || resultGeometry.coordinates
          const clickedCoords = clickedGeometry.getCoordinates()
          
          if (resultCoords && clickedCoords) {
            return JSON.stringify(resultCoords) === JSON.stringify(clickedCoords)
          }
        }
        return false
      })
      
      if (selectedIndex !== -1) {
        featureQuery.handleSelectFeature(selectedIndex)
        analysisStore.setAnalysisStatus(`已选择查询结果中的要素 ${selectedIndex + 1}`)
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  /**
   * 查询指定点位的所有要素
   * 支持多图层要素查询和结果排序
   * 
   * @param {number[]} coordinate - 查询坐标
   * @param {number[]} pixel - 屏幕像素坐标
   */
  const queryFeaturesAtPoint = async (coordinate: number[], pixel: number[]): Promise<void> => {
    try {
      const allFeatures: any[] = [];
      
      for (const layerInfo of mapStore.vectorlayers) {
        if (layerInfo.layer && layerInfo.layer.getVisible()) {
          const source = layerInfo.layer.getSource();
          if (source) {
            const features = source.getFeatures();
            
            features.forEach((feature: any) => {
              const geometry = feature.getGeometry();
              if (geometry) {
                if (geometry.intersectsCoordinate(coordinate)) {
                  allFeatures.push({
                    id: feature.getId(),
                    geometry: {
                      type: geometry.getType()
                    },
                    properties: feature.getProperties(),
                    layerName: layerInfo.name || layerInfo.id || '未知图层'
                  });
                }
              }
            });
          }
        }
      }
      
      if (allFeatures.length > 0) {
        const layerNameToZ: Record<string, number> = {};
        mapStore.vectorlayers.forEach(vl => {
          if (vl.layer && typeof vl.layer.getZIndex === 'function') {
            layerNameToZ[vl.name] = vl.layer.getZIndex() ?? 0;
          }
        });
        allFeatures.sort((a, b) => {
          const za = layerNameToZ[a.layerName] ?? 0;
          const zb = layerNameToZ[b.layerName] ?? 0;
          return zb - za;
        });
        
        let content = '<div class="multi-feature-info">';
        content += `<div class="feature-count">找到 ${allFeatures.length} 个要素</div>`;
        
        allFeatures.forEach((feature, index) => {
          content += `<div class="feature-item">`;
          // 改进图层名称显示逻辑
          const displayLayerName = feature.layerName || '未知图层'
          
          // 添加调试信息
          
          content += `<div class="feature-header">要素 ${index + 1} (${displayLayerName})</div>`;
          
          content += `<div class="field-row"><span class="field-label">要素ID:</span><span class="field-value">${feature.id || '无'}</span></div>`;
          content += `<div class="field-row"><span class="field-label">几何类型:</span><span class="field-value">${feature.geometry?.type || '未知'}</span></div>`;
          
          const properties = feature.properties || {};
          content += `<div class="field-row"><span class="field-label">属性字段数:</span><span class="field-value">${Object.keys(properties).length}个</span></div>`;
          Object.keys(properties).forEach(key => {
            if (key !== 'geometry') {
              const value = properties[key];
              const displayValue = value !== undefined && value !== null ? value : '(空值)';
              content += `<div class="field-row"><span class="field-label">${key}:</span><span class="field-value">${displayValue}</span></div>`;
            }
          });
          
          content += '</div>';
        });
        
        content += '</div>';
        
        popupStore.showPopup(
          { x: pixel[0], y: pixel[1] },
          content,
          null,
          coordinate
        );
      } else {
        popupStore.hidePopup();
      }
    } catch (error) {
      popupStore.hidePopup();
    }
  }

  /**
   * 设置地图事件监听器
   * 绑定地图的各种交互事件
   * 
   * @param {any} map - OpenLayers地图实例
   * @param {any} hoverSource - 悬停图层数据源
   * @param {any} selectSource - 选择图层数据源
   * @returns {Function} 事件清理函数
   */
  const setupMapEvents = (map: any, hoverSource: any, selectSource: any): (() => void) => {
    const view = map.getView()
    view.on('change:center', () => {
      popupStore.updatePosition(popupStore.position)
    })
    view.on('change:resolution', () => {
      popupStore.updatePosition(popupStore.position)
    })
    
    map.on('pointermove', (evt: any) => {
      mapStore.updateCoordinate(evt.coordinate)
      if (hoverTimer.value) clearTimeout(hoverTimer.value)
      hoverTimer.value = window.setTimeout(() => {
        handleFeatureHover(hoverSource)
      }, 120)
    })
    
    map.on('click', (evt: any) => {
      handleMapClick(evt, selectSource)
    })
    
    const resizeHandler = () => map.updateSize()
    window.addEventListener('resize', resizeHandler)

    return () => {
      try { window.removeEventListener('resize', resizeHandler) } catch (_) {}
    }
  }

  /**
   * 创建悬停图层样式函数
   * 动态创建适配当前主题的悬停样式
   * 
   * @returns {ol.style.Style} 悬停样式对象
   */
  const createHoverStyle = () => {
    const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--map-highlight-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000');
    const hoverFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-hover-fill').trim() || 'rgba(0, 123, 255, 0.3)';
    
    return new (window as any).ol.style.Style({
      image: new (window as any).ol.style.Circle({ 
        radius: 6, 
        stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 2}), 
        fill: new (window as any).ol.style.Fill({color: hoverFillColor}) 
      }),
      stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 2}),
      fill: new (window as any).ol.style.Fill({color: hoverFillColor})
    });
  };

  /**
   * 创建选择图层样式函数
   * 动态创建适配当前主题的选择样式，支持不同几何类型
   * 
   * @returns {Function} 样式函数
   */
  const createSelectStyle = () => {
    const highlightColor = getComputedStyle(document.documentElement).getPropertyValue('--map-highlight-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000');
    const grayFillColor = getComputedStyle(document.documentElement).getPropertyValue('--map-select-fill').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(33, 37, 41, 0.15)');
    
    return (feature: any) => {
      const geometry = feature.getGeometry();
      if (!geometry) {
        return new (window as any).ol.style.Style({
          image: new (window as any).ol.style.Circle({ 
            radius: 8, 
            stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 3}), 
            fill: new (window as any).ol.style.Fill({color: grayFillColor})
          }),
          stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 3}),
          fill: new (window as any).ol.style.Fill({color: grayFillColor})
        });
      }
      
      const geometryType = geometry.getType();
      
      switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
          return new (window as any).ol.style.Style({
            image: new (window as any).ol.style.Circle({ 
              radius: 8, 
              stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 3}), 
              fill: new (window as any).ol.style.Fill({color: grayFillColor})
            })
          });
          
        case 'LineString':
        case 'MultiLineString':
          return new (window as any).ol.style.Style({
            stroke: new (window as any).ol.style.Stroke({
              color: highlightColor, 
              width: 5,
              lineCap: 'round',
              lineJoin: 'round'
            })
          });
          
        case 'Polygon':
        case 'MultiPolygon':
          return new (window as any).ol.style.Style({
            stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 3}),
            fill: new (window as any).ol.style.Fill({color: grayFillColor})
          });
          
        default:
          return new (window as any).ol.style.Style({
            image: new (window as any).ol.style.Circle({ 
              radius: 8, 
              stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 3}), 
              fill: new (window as any).ol.style.Fill({color: grayFillColor})
            }),
            stroke: new (window as any).ol.style.Stroke({color: highlightColor, width: 3}),
            fill: new (window as any).ol.style.Fill({color: grayFillColor})
          });
      }
    };
  };

  return {
    handleFeatureHover,
    handleMapClick,
    handleNormalClick,
    triggerQueryFeatureSelection,
    queryFeaturesAtPoint,
    setupMapEvents,
    createHoverStyle,
    createSelectStyle,
    hoverTimer
  }
}
