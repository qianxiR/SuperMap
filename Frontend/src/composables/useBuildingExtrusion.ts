import type Map from 'ol/Map'

/**
 * 启用基于 zValue 的 2.5D 多边形拉伸渲染（Canvas 后处理）
 * 输入：
 * - vectorLayer: OpenLayers 矢量图层实例（已加载建筑物要素）
 * - map: OpenLayers 地图实例
 * - color: 顶面与侧面的填充颜色（rgba）
 * 处理：
 * - 在图层 postrender 事件中，读取 Polygon 的第三维坐标作为高度（zValue）
 * - 依据当前视图分辨率将高度换算为屏幕像素偏移，绘制顶面与侧面实现 2.5D 效果
 * 输出：
 * - 直接渲染到该图层的 Canvas 上，无返回值
 */
export function enablePolygonExtrusion(vectorLayer: any, map: Map, color: string): void {
  const drawExtrusions = (evt: any) => {
    const ctx: CanvasRenderingContext2D = evt.context
    const frameState = evt.frameState
    const tr = frameState.coordinateToPixelTransform as number[]
    const resolution: number = frameState.viewState.resolution

    const features = vectorLayer.getSource().getFeatures()

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'

    for (let i = 0; i < features.length; i++) {
      const feature = features[i]
      const geom = feature.getGeometry()
      if (!geom || typeof (geom as any).getCoordinates !== 'function') continue

      const type = geom.getType()
      if (type !== 'Polygon' && type !== 'MultiPolygon') continue

      const drawPolygon = (coords: number[][]) => {
        // 从要素属性读取高度值：优先 ZVALUE，其次 HEIGHT
        const zAttr = feature.get('ZVALUE')
        const hAttr = feature.get('HEIGHT')
        const zValue = Number(zAttr != null ? zAttr : (hAttr != null ? hAttr : 0))
        
        // 根据比例尺计算方式，将建筑高度转换为像素偏移
        // 参考 ScaleBar.vue 的计算逻辑
        const view = map.getView()
        const center = view.getCenter()
        if (!center) return
        
        // 获取指定纬度的米/像素分辨率 (与ScaleBar相同的计算方式)
        const latitude = center[1]
        const metersPerDegree = 111320 * Math.cos(latitude * Math.PI / 180)
        const metersPerPixel = resolution * metersPerDegree
        
        // 将建筑高度(米)转换为像素偏移
        const dz = zValue / metersPerPixel

        // 将地理坐标转换为像素坐标
        const toPixel = (c: number[]) => {
          const x = c[0]
          const y = c[1]
          const px = tr[0] * x + tr[1] * y + tr[4]
          const py = tr[2] * x + tr[3] * y + tr[5]
          return [px, py]
        }

        const basePixels: number[][] = []
        const topPixels: number[][] = []

        for (let k = 0; k < coords.length; k++) {
          const p = toPixel(coords[k])
          basePixels.push(p)
          topPixels.push([p[0], p[1] - dz])
        }

        // 侧面
        ctx.fillStyle = color
        for (let k = 0; k < basePixels.length - 1; k++) {
          const b0 = basePixels[k]
          const b1 = basePixels[k + 1]
          const t0 = topPixels[k]
          const t1 = topPixels[k + 1]
          ctx.beginPath()
          ctx.moveTo(b0[0], b0[1])
          ctx.lineTo(b1[0], b1[1])
          ctx.lineTo(t1[0], t1[1])
          ctx.lineTo(t0[0], t0[1])
          ctx.closePath()
          ctx.fill()
        }

        // 顶面
        ctx.beginPath()
        for (let k = 0; k < topPixels.length; k++) {
          const tp = topPixels[k]
          if (k === 0) ctx.moveTo(tp[0], tp[1])
          else ctx.lineTo(tp[0], tp[1])
        }
        ctx.closePath()
        ctx.fill()
      }

      if (type === 'Polygon') {
        const rings: number[][][] = (geom as any).getCoordinates()
        if (rings && rings[0]) drawPolygon(rings[0])
      } else {
        const polys: number[][][][] = (geom as any).getCoordinates()
        for (let p = 0; p < polys.length; p++) {
          const rings = polys[p]
          if (rings && rings[0]) drawPolygon(rings[0])
        }
      }
    }

    ctx.restore()
    map.render()
  }

  vectorLayer.on('postrender', drawExtrusions)
}


