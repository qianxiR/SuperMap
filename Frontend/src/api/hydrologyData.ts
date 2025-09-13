/**
 * 水文监测点数据服务
 * 模拟SuperMap服务接口，提供水文监测点数据
 */

// 水文监测点数据
const HYDROLOGY_DATA = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.56999969482422, 30.670000076293947]
      },
      "properties": {
        "测站名": "阳逻",
        "测站代": 61620600,
        "地址": "湖北省新洲县阳逻镇武湖泵站",
        "东经": 114.56999969482422,
        "北纬": 30.670000076293947,
        "水系代": 616,
        "测站类": 2,
        "编号": 600
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.9800033569336, 30.850000381469728]
      },
      "properties": {
        "测站名": "少潭河",
        "测站代": 61645400,
        "地址": "湖北省新洲县新集镇道观河水库",
        "东经": 114.9800033569336,
        "北纬": 30.850000381469728,
        "水系代": 616,
        "测站类": 4,
        "编号": 5400
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.72000122070313, 30.780000686645509]
      },
      "properties": {
        "测站名": "汪家集",
        "测站代": 61640000,
        "地址": "湖北省新洲县汪集镇",
        "东经": 114.72000122070313,
        "北纬": 30.780000686645509,
        "水系代": 616,
        "测站类": 4,
        "编号": 0
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.9000015258789, 31.0]
      },
      "properties": {
        "测站名": "潘塘",
        "测站代": 61644800,
        "地址": "湖北省新洲县潘塘镇新洲渠道管理段",
        "东经": 114.9000015258789,
        "北纬": 31.0,
        "水系代": 616,
        "测站类": 4,
        "编号": 4800
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.66999816894531, 30.8799991607666]
      },
      "properties": {
        "测站名": "李家集",
        "测站代": 61639800,
        "地址": "湖北省新洲县李集镇",
        "东经": 114.66999816894531,
        "北纬": 30.8799991607666,
        "水系代": 616,
        "测站类": 3,
        "编号": 9800
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.7699966430664, 30.93000030517578]
      },
      "properties": {
        "测站名": "柳子港",
        "测站代": 61644600,
        "地址": "湖北省新洲县凤凰镇庙岗山",
        "东经": 114.7699966430664,
        "北纬": 30.93000030517578,
        "水系代": 616,
        "测站类": 4,
        "编号": 4600
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.7300033569336, 30.6200008392334]
      },
      "properties": {
        "测站名": "挖沟",
        "测站代": 61640200,
        "地址": "湖北省新洲县大埠镇挖沟村",
        "东经": 114.7300033569336,
        "北纬": 30.6200008392334,
        "水系代": 616,
        "测站类": 4,
        "编号": 200
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.80000305175781, 30.850000381469728]
      },
      "properties": {
        "测站名": "新洲",
        "测站代": 61645000,
        "地址": "湖北省新洲县城关镇",
        "东经": 114.80000305175781,
        "北纬": 30.850000381469728,
        "水系代": 616,
        "测站类": 4,
        "编号": 5000
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.37999725341797, 30.549999237060548]
      },
      "properties": {
        "测站名": "东湖",
        "测站代": 61621100,
        "地址": "湖北省武汉市南望山",
        "东经": 114.37999725341797,
        "北纬": 30.549999237060548,
        "水系代": 616,
        "测站类": 2,
        "编号": 1100
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [113.97000122070313, 30.299999237060548]
      },
      "properties": {
        "测站名": "邓家口",
        "测站代": 62252000,
        "地址": "湖北省武汉市汉南区邓家口",
        "东经": 113.97000122070313,
        "北纬": 30.299999237060548,
        "水系代": 622,
        "测站类": 5,
        "编号": 2000
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.12999725341797, 30.6200008392334]
      },
      "properties": {
        "测站名": "汉口(吴家山)",
        "测站代": 61620500,
        "地址": "湖北省武汉市东西湖区吴家山",
        "东经": 114.12999725341797,
        "北纬": 30.6200008392334,
        "水系代": 616,
        "测站类": 2,
        "编号": 500
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.4000015258789, 30.329999923706056]
      },
      "properties": {
        "测站名": "五里界",
        "测站代": 61621900,
        "地址": "湖北省武昌县五里界乡五里界",
        "东经": 114.4000015258789,
        "北纬": 30.329999923706056,
        "水系代": 616,
        "测站类": 2,
        "编号": 1900
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.31999969482422, 30.219999313354493]
      },
      "properties": {
        "测站名": "土地堂",
        "测站代": 61621800,
        "地址": "湖北省武昌县土地堂镇",
        "东经": 114.31999969482422,
        "北纬": 30.219999313354493,
        "水系代": 616,
        "测站类": 2,
        "编号": 1800
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.5, 30.149999618530275]
      },
      "properties": {
        "测站名": "徐河",
        "测站代": 61621700,
        "地址": "湖北省武昌县舒安乡陈大行村",
        "东经": 114.5,
        "北纬": 30.149999618530275,
        "水系代": 616,
        "测站类": 2,
        "编号": 1700
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.12999725341797, 30.299999237060548]
      },
      "properties": {
        "测站名": "金口",
        "测站代": 61752500,
        "地址": "湖北省武昌县金口镇金水闸",
        "东经": 114.12999725341797,
        "北纬": 30.299999237060548,
        "水系代": 617,
        "测站类": 5,
        "编号": 2500
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.1500015258789, 30.149999618530275]
      },
      "properties": {
        "测站名": "法泗洲",
        "测站代": 61752000,
        "地址": "湖北省武昌县法泗镇法泗洲",
        "东经": 114.1500015258789,
        "北纬": 30.149999618530275,
        "水系代": 617,
        "测站类": 5,
        "编号": 2000
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.37000274658203, 31.219999313354493]
      },
      "properties": {
        "测站名": "姚家集",
        "测站代": 61635600,
        "地址": "湖北省黄陂县姚家集镇",
        "东经": 114.37000274658203,
        "北纬": 31.219999313354493,
        "水系代": 616,
        "测站类": 3,
        "编号": 5600
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.47000122070313, 31.06999969482422]
      },
      "properties": {
        "测站名": "夏家寺",
        "测站代": 61636200,
        "地址": "湖北省黄陂县夏家寺水库",
        "东经": 114.47000122070313,
        "北纬": 31.06999969482422,
        "水系代": 616,
        "测站类": 3,
        "编号": 6200
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.47000122070313, 30.8799991607666]
      },
      "properties": {
        "测站名": "黄陂",
        "测站代": 61636400,
        "地址": "湖北省黄陂县城关镇",
        "东经": 114.47000122070313,
        "北纬": 30.8799991607666,
        "水系代": 616,
        "测站类": 3,
        "编号": 6400
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.3499984741211, 31.079999923706056]
      },
      "properties": {
        "测站名": "长轩岭",
        "测站代": 61636000,
        "地址": "湖北省黄陂县长轩岭镇耳升村",
        "东经": 114.3499984741211,
        "北纬": 31.079999923706056,
        "水系代": 616,
        "测站类": 3,
        "编号": 6000
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.52999877929688, 31.0]
      },
      "properties": {
        "测站名": "长岭岗",
        "测站代": 61636800,
        "地址": "湖北省黄陂县蔡榨镇长岭岗中学",
        "东经": 114.52999877929688,
        "北纬": 31.0,
        "水系代": 616,
        "测站类": 3,
        "编号": 6800
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [113.83000183105469, 30.450000762939454]
      },
      "properties": {
        "测站名": "侏儒山",
        "测站代": 62251800,
        "地址": "湖北省汉阳县侏儒镇军山街",
        "东经": 113.83000183105469,
        "北纬": 30.450000762939454,
        "水系代": 622,
        "测站类": 5,
        "编号": 1800
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [114.02999877929688, 30.579999923706056]
      },
      "properties": {
        "测站名": "汉阳",
        "测站代": 62133000,
        "地址": "湖北省汉阳县蔡甸镇新庙",
        "东经": 114.02999877929688,
        "北纬": 30.579999923706056,
        "水系代": 621,
        "测站类": 3,
        "编号": 3000
      }
    }
  ]
}

/**
 * 获取水文监测点数据
 * 模拟SuperMap服务接口
 */
export const getHydrologyData = async (params?: {
  page?: number
  pageSize?: number
  bounds?: [number, number, number, number]
  filter?: Record<string, any>
}): Promise<{
  type: string
  features: any[]
  totalCount: number
  page: number
  pageSize: number
}> => {
  // 模拟异步请求
  await new Promise(resolve => setTimeout(resolve, 100))
  
  let features = [...HYDROLOGY_DATA.features]
  
  // 应用空间过滤
  if (params?.bounds) {
    const [minX, minY, maxX, maxY] = params.bounds
    features = features.filter(feature => {
      const [x, y] = feature.geometry.coordinates
      return x >= minX && x <= maxX && y >= minY && y <= maxY
    })
  }
  
  // 应用属性过滤
  if (params?.filter) {
    features = features.filter(feature => {
      return Object.entries(params.filter!).every(([key, value]) => {
        return feature.properties[key] === value
      })
    })
  }
  
  const totalCount = features.length
  const page = params?.page || 1
  const pageSize = params?.pageSize || 100
  
  // 分页处理
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedFeatures = features.slice(startIndex, endIndex)
  
  return {
    type: "FeatureCollection",
    features: paginatedFeatures,
    totalCount,
    page,
    pageSize
  }
}

/**
 * 获取水文监测点图层信息
 */
export const getHydrologyLayerInfo = () => {
  return {
    name: "水文监测点",
    type: "vector",
    source: "hydrology",
    geometryType: "Point",
    featureCount: HYDROLOGY_DATA.features.length,
    bounds: calculateBounds(HYDROLOGY_DATA.features),
    fields: [
      { name: "测站名", type: "string" },
      { name: "测站代", type: "number" },
      { name: "地址", type: "string" },
      { name: "东经", type: "number" },
      { name: "北纬", type: "number" },
      { name: "水系代", type: "number" },
      { name: "测站类", type: "number" },
      { name: "编号", type: "number" }
    ]
  }
}

/**
 * 计算要素边界
 */
const calculateBounds = (features: any[]): [number, number, number, number] => {
  if (features.length === 0) return [0, 0, 0, 0]
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  features.forEach(feature => {
    const [x, y] = feature.geometry.coordinates
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })
  
  return [minX, minY, maxX, maxY]
}
