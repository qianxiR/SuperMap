export interface Wuhanlayer {
  name: string
  type: 'point' | 'line' | 'polygon' | 'raster'
  visible: boolean
  group?: string
  datasetName?: string
  dataService?: string
  lazyLoad?: boolean // 是否懒加载，默认false
}

export interface BaseMapConfig {
  light: string // 浅色主题底图URL
  dark: string  // 深色主题底图URL
}

export interface APIConfig {
  baseUrl: string
  mapService: string
  dataService: string
  datasetName: string
  wuhanlayers: Wuhanlayer[]
  baseMaps: BaseMapConfig // 新增底图配置
  fallbackBaseMaps: BaseMapConfig // 备用底图配置
  timeout: number
  retryCount: number
  devMode: boolean
  mapBounds: {
    extent: [number, number, number, number] // [minLon, minLat, maxLon, maxLat]
    center: [number, number] // [lon, lat]
    zoom: number
  }
}

export interface MapConfig {
  baseUrl: string;
  dataUrl: string;
  datasetName: string;
  vectorlayers: VectorlayerConfig[];
  center: [number, number];
  zoom: number;
  projection: string;
  extent: [number, number, number, number];
}

export interface VectorlayerConfig {
  name: string
  style?: {
    stroke?: { width: number; color?: string }
    fill?: { color: string }
  }
}

export interface Coordinate {
  lon: number | null;
  lat: number | null;
}

export interface Maplayer {
  id: string;
  name: string;
  layer: any; // ol.layer.Base
  visible: boolean;
  type: 'vector' | 'raster' | 'tile';
  source?: 'supermap' | 'local' | 'external' | 'hydrology';
  error?: string;
  isLazyLoaded?: boolean; // 是否为懒加载图层
  isLoaded?: boolean; // 是否已加载数据
  featureCount?: number; // 要素数量
  bounds?: [number, number, number, number]; // 图层边界
  fields?: Array<{ name: string; type: string }>; // 字段信息
}

export interface FeatureInfo {
  id?: string;
  name?: string;
  type?: string;
  coordinates?: string;
  geometry?: any; // ol.geom.Geometry
}

export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: number
}

// GeoJSON 类型定义
export interface Polygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface Feature<G = any> {
  type: 'Feature'
  geometry: G
  properties?: Record<string, any>
  id?: string | number
}

export interface FeatureCollection<G = any> {
  type: 'FeatureCollection'
  features: Feature<G>[]
}

// 绘制图层保存类型
export type DrawlayerSaveType = Polygon | FeatureCollection<Polygon>
