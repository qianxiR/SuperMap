export interface WuhanLayer {
  name: string
  type: 'point' | 'line' | 'polygon' | 'raster'
  visible: boolean
  group?: string
  datasetName?: string
  dataService?: string
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
  wuhanLayers: WuhanLayer[]
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
  vectorLayers: VectorLayerConfig[];
  center: [number, number];
  zoom: number;
  projection: string;
  extent: [number, number, number, number];
}

export interface VectorLayerConfig {
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

export interface MapLayer {
  id: string;
  name: string;
  layer: any; // ol.layer.Base
  visible: boolean;
  type: 'vector' | 'raster' | 'tile';
  source?: 'supermap' | 'local' | 'external';
  error?: string;
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
export type DrawLayerSaveType = Polygon | FeatureCollection<Polygon>
