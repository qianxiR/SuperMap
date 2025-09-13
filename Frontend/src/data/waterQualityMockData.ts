// 水质监测点Mock数据
export interface WaterQualityData {
  time: string
  water_quality_class: string
  water_temperature: number
  ph_value: number
  dissolved_oxygen: number
  turbidity: number
  permanganate_index: number
  ammonia_nitrogen: number
  total_phosphorus: number
  total_nitrogen: number
  chlorophyll_a: number
  algae_density: number
}

export interface MonitoringSite {
  name: string
  location: string
  coordinates: [number, number]
  data: WaterQualityData[]
}

// 生成60分钟的mock数据
const generateMockData = (baseValues: Partial<WaterQualityData>, siteName: string): WaterQualityData[] => {
  const data: WaterQualityData[] = []
  const now = new Date()
  
  for (let i = 0; i < 60; i++) {
    const time = new Date(now.getTime() - (59 - i) * 60000) // 每分钟一个数据点
    
    data.push({
      time: time.toISOString().slice(11, 16), // HH:MM格式
      water_quality_class: baseValues.water_quality_class || 'Ⅱ',
      water_temperature: (baseValues.water_temperature || 15) + (Math.random() - 0.5) * 2,
      ph_value: (baseValues.ph_value || 7.5) + (Math.random() - 0.5) * 0.3,
      dissolved_oxygen: (baseValues.dissolved_oxygen || 8.5) + (Math.random() - 0.5) * 1.5,
      turbidity: (baseValues.turbidity || 5) + (Math.random() - 0.5) * 3,
      permanganate_index: (baseValues.permanganate_index || 3.5) + (Math.random() - 0.5) * 1,
      ammonia_nitrogen: (baseValues.ammonia_nitrogen || 0.025) + (Math.random() - 0.5) * 0.01,
      total_phosphorus: (baseValues.total_phosphorus || 0.015) + (Math.random() - 0.5) * 0.008,
      total_nitrogen: (baseValues.total_nitrogen || 1.2) + (Math.random() - 0.5) * 0.5,
      chlorophyll_a: (baseValues.chlorophyll_a || 0.003) + (Math.random() - 0.5) * 0.002,
      algae_density: (baseValues.algae_density || 1500000) + (Math.random() - 0.5) * 500000
    })
  }
  
  return data
}

// 四个监测点的Mock数据
export const monitoringSites: MonitoringSite[] = [
  {
    name: '湖北省新洲县阳逻镇武湖泵站',
    location: '武湖泵站',
    coordinates: [114.7856, 30.8456],
    data: generateMockData({
      water_quality_class: 'Ⅱ',
      water_temperature: 14.2,
      ph_value: 7.68,
      dissolved_oxygen: 9.2,
      turbidity: 4.8,
      permanganate_index: 3.2,
      ammonia_nitrogen: 0.028,
      total_phosphorus: 0.018,
      total_nitrogen: 1.35,
      chlorophyll_a: 0.004,
      algae_density: 1800000
    }, '武湖泵站')
  },
  {
    name: '湖北省武汉市南望山',
    location: '南望山',
    coordinates: [114.3125, 30.5268],
    data: generateMockData({
      water_quality_class: 'Ⅰ',
      water_temperature: 13.8,
      ph_value: 7.85,
      dissolved_oxygen: 10.5,
      turbidity: 2.1,
      permanganate_index: 2.8,
      ammonia_nitrogen: 0.015,
      total_phosphorus: 0.008,
      total_nitrogen: 0.95,
      chlorophyll_a: 0.002,
      algae_density: 850000
    }, '南望山')
  },
  {
    name: '湖北省武汉市东西湖区吴家山',
    location: '吴家山',
    coordinates: [114.1456, 30.6234],
    data: generateMockData({
      water_quality_class: 'Ⅲ',
      water_temperature: 16.1,
      ph_value: 7.45,
      dissolved_oxygen: 7.8,
      turbidity: 8.2,
      permanganate_index: 4.1,
      ammonia_nitrogen: 0.035,
      total_phosphorus: 0.025,
      total_nitrogen: 1.68,
      chlorophyll_a: 0.006,
      algae_density: 2200000
    }, '吴家山')
  },
  {
    name: '湖北省武昌县金口镇金水闸',
    location: '金水闸',
    coordinates: [114.2678, 30.4567],
    data: generateMockData({
      water_quality_class: 'Ⅱ',
      water_temperature: 15.3,
      ph_value: 7.72,
      dissolved_oxygen: 8.9,
      turbidity: 5.5,
      permanganate_index: 3.6,
      ammonia_nitrogen: 0.022,
      total_phosphorus: 0.012,
      total_nitrogen: 1.18,
      chlorophyll_a: 0.003,
      algae_density: 1650000
    }, '金水闸')
  }
]

// 获取指定监测点的数据
export const getMonitoringSiteData = (siteName: string): MonitoringSite | undefined => {
  return monitoringSites.find(site => site.name === siteName)
}

// 获取所有监测点数据
export const getAllMonitoringSitesData = (): MonitoringSite[] => {
  return monitoringSites
}
