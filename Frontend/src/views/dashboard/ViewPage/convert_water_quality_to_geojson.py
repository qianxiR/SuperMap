#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水质数据转GeoJSON格式转换脚本
将湖北省长江流域水质监测数据转换为标准GeoJSON格式
"""

import json
import os
from typing import Dict, List, Any

def convert_water_quality_to_geojson(input_file: str, output_file: str) -> None:
    """
    将水质数据转换为GeoJSON格式
    
    输入数据格式：
    - input_file: 包含RECORDS数组的JSON文件路径
    
    输出数据格式：
    - output_file: 标准GeoJSON格式文件路径
    """
    
    # 读取原始数据
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 创建GeoJSON结构
    geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    
    # 处理每条记录
    for record in data.get('RECORDS', []):
        # 提取坐标信息
        try:
            longitude = float(record.get('longitude', 0)) if record.get('longitude') else 0
            latitude = float(record.get('latitude', 0)) if record.get('latitude') else 0
        except (ValueError, TypeError):
            longitude = 0
            latitude = 0
        
        # 跳过无效坐标
        if longitude == 0 and latitude == 0:
            continue
            
        # 创建Feature
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            "properties": {
                # 基础信息
                "province": record.get('province', ''),
                "watershed": record.get('watershed', ''),
                "site_name": record.get('site_name', ''),
                "monitor_time": record.get('monitor_time', ''),
                "site_status": record.get('site_status', ''),
                "formatted_address": record.get('formatted_address', ''),
                "match_level": record.get('match_level', ''),
                
                # 水质指标
                "water_quality_class": record.get('water_quality_class', ''),
                "water_temperature": parse_numeric_value(record.get('water_temperature')),
                "ph_value": parse_numeric_value(record.get('ph_value')),
                "dissolved_oxygen": parse_numeric_value(record.get('dissolved_oxygen')),
                "conductivity": parse_numeric_value(record.get('conductivity')),
                "turbidity": parse_numeric_value(record.get('turbidity')),
                "permanganate_index": parse_numeric_value(record.get('permanganate_index')),
                "ammonia_nitrogen": parse_numeric_value(record.get('ammonia_nitrogen')),
                "total_phosphorus": parse_numeric_value(record.get('total_phosphorus')),
                "total_nitrogen": parse_numeric_value(record.get('total_nitrogen')),
                "chlorophyll_a": record.get('chlorophyll_a', ''),
                "algae_density": record.get('algae_density', ''),
                
                # 坐标信息（保留原始字符串格式）
                "longitude": record.get('longitude', ''),
                "latitude": record.get('latitude', '')
            }
        }
        
        geojson["features"].append(feature)
    
    # 写入GeoJSON文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"转换完成！")
    print(f"输入文件: {input_file}")
    print(f"输出文件: {output_file}")
    print(f"转换记录数: {len(geojson['features'])}")

def parse_numeric_value(value: Any) -> Any:
    """
    解析数值字段，处理特殊值
    
    输入数据格式：
    - value: 字符串格式的数值或特殊标记
    
    输出数据格式：
    - 数值类型或原始字符串
    """
    if value is None or value == '*' or value == '':
        return None
    
    # 如果已经是数字类型，直接返回
    if isinstance(value, (int, float)):
        return value
    
    # 转换为字符串处理
    str_value = str(value).strip()
    if str_value == '*' or str_value == '':
        return None
    
    try:
        return float(str_value)
    except (ValueError, TypeError):
        return str_value

def create_water_quality_api(input_file: str, output_file: str) -> None:
    """
    创建水质数据API服务文件
    
    输入数据格式：
    - input_file: GeoJSON格式的水质数据文件
    
    输出数据格式：
    - output_file: TypeScript API服务文件
    """
    
    # 读取GeoJSON数据
    with open(input_file, 'r', encoding='utf-8') as f:
        geojson_data = json.load(f)
    
    # 生成TypeScript API代码
    api_code = f'''/**
 * 水质监测数据服务
 * 从JSON文件读取水质监测数据
 */

import waterQualityGeoJSON from '@/views/dashboard/ViewPage/水质监测点_GeoJSON.json'

// 水质监测点属性类型定义
interface WaterQualityProperties {{
  // 基础信息
  province: string
  watershed: string
  site_name: string
  monitor_time: string
  site_status: string
  formatted_address: string
  match_level: string
  
  // 水质指标
  water_quality_class: string
  water_temperature: number | null
  ph_value: number | null
  dissolved_oxygen: number | null
  conductivity: number | null
  turbidity: number | null
  permanganate_index: number | null
  ammonia_nitrogen: number | null
  total_phosphorus: number | null
  total_nitrogen: number | null
  chlorophyll_a: string
  algae_density: string
  
  // 坐标信息
  longitude: string
  latitude: string
}}

// 水质监测点数据
const WATER_QUALITY_DATA = waterQualityGeoJSON

/**
 * 获取水质监测点数据
 * 模拟SuperMap服务接口
 */
export const getWaterQualityData = async (params?: {{
  page?: number
  pageSize?: number
  bounds?: [number, number, number, number]
  filter?: Record<string, any>
  timeRange?: {{ start: string, end: string }}
  qualityClass?: string[]
}}): Promise<{{
  type: string
  features: any[]
  totalCount: number
  page: number
  pageSize: number
}}> => {{
  // 模拟异步请求
  await new Promise(resolve => setTimeout(resolve, 100))
  
  let features = [...WATER_QUALITY_DATA.features]
  
  // 应用空间过滤
  if (params?.bounds) {{
    const [minX, minY, maxX, maxY] = params.bounds
    features = features.filter(feature => {{
      const [x, y] = feature.geometry.coordinates
      return x >= minX && x <= maxX && y >= minY && y <= maxY
    }})
  }}
  
  // 应用属性过滤
  if (params?.filter) {{
    features = features.filter(feature => {{
      return Object.entries(params.filter!).every(([key, value]) => {{
        return (feature.properties as WaterQualityProperties)[key as keyof WaterQualityProperties] === value
      }})
    }})
  }}
  
  // 应用时间范围过滤
  if (params?.timeRange) {{
    const {{ start, end }} = params.timeRange
    features = features.filter(feature => {{
      const monitorTime = feature.properties.monitor_time
      return monitorTime >= start && monitorTime <= end
    }})
  }}
  
  // 应用水质类别过滤
  if (params?.qualityClass && params.qualityClass.length > 0) {{
    features = features.filter(feature => {{
      return params.qualityClass!.includes(feature.properties.water_quality_class)
    }})
  }}
  
  const totalCount = features.length
  const page = params?.page || 1
  const pageSize = params?.pageSize || 100
  
  // 分页处理
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedFeatures = features.slice(startIndex, endIndex)
  
  return {{
    type: "FeatureCollection",
    features: paginatedFeatures,
    totalCount,
    page,
    pageSize
  }}
}}

/**
 * 获取水质监测点图层信息
 */
export const getWaterQualityLayerInfo = () => {{
  return {{
    name: "水质监测点",
    type: "vector",
    source: "water_quality",
    geometryType: "Point",
    featureCount: WATER_QUALITY_DATA.features.length,
    bounds: calculateBounds(WATER_QUALITY_DATA.features),
    fields: [
      {{ name: "province", type: "string" }},
      {{ name: "watershed", type: "string" }},
      {{ name: "site_name", type: "string" }},
      {{ name: "monitor_time", type: "string" }},
      {{ name: "water_quality_class", type: "string" }},
      {{ name: "water_temperature", type: "number" }},
      {{ name: "ph_value", type: "number" }},
      {{ name: "dissolved_oxygen", type: "number" }},
      {{ name: "conductivity", type: "number" }},
      {{ name: "turbidity", type: "number" }},
      {{ name: "permanganate_index", type: "number" }},
      {{ name: "ammonia_nitrogen", type: "number" }},
      {{ name: "total_phosphorus", type: "number" }},
      {{ name: "total_nitrogen", type: "number" }},
      {{ name: "chlorophyll_a", type: "string" }},
      {{ name: "algae_density", type: "string" }},
      {{ name: "site_status", type: "string" }},
      {{ name: "formatted_address", type: "string" }},
      {{ name: "match_level", type: "string" }}
    ]
  }}
}}

/**
 * 获取水质统计数据
 */
export const getWaterQualityStats = () => {{
  const features = WATER_QUALITY_DATA.features
  
  // 统计水质类别分布
  const qualityClassStats = {{}}
  const provinceStats = {{}}
  const watershedStats = {{}}
  
  features.forEach(feature => {{
    const props = feature.properties as WaterQualityProperties
    
    // 水质类别统计
    const qualityClass = props.water_quality_class
    qualityClassStats[qualityClass] = (qualityClassStats[qualityClass] || 0) + 1
    
    // 省份统计
    const province = props.province
    provinceStats[province] = (provinceStats[province] || 0) + 1
    
    // 流域统计
    const watershed = props.watershed
    watershedStats[watershed] = (watershedStats[watershed] || 0) + 1
  }})
  
  return {{
    totalCount: features.length,
    qualityClassStats,
    provinceStats,
    watershedStats,
    bounds: calculateBounds(features)
  }}
}}

/**
 * 计算要素边界
 */
const calculateBounds = (features: any[]): [number, number, number, number] => {{
  if (features.length === 0) return [0, 0, 0, 0]
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  features.forEach(feature => {{
    const [x, y] = feature.geometry.coordinates
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }})
  
  return [minX, minY, maxX, maxY]
}}
'''
    
    # 写入API文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(api_code)
    
    print(f"API服务文件已生成: {output_file}")

def main():
    """主函数"""
    # 文件路径配置
    input_file = "Frontend/src/views/dashboard/ViewPage/湖北省长江流域2023年1月数据_UTF8.json"
    geojson_output = "Frontend/src/views/dashboard/ViewPage/水质监测点_GeoJSON.json"
    api_output = "Frontend/src/api/waterQualityData.ts"
    
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        print(f"错误: 输入文件不存在 - {input_file}")
        return
    
    try:
        # 转换数据格式
        convert_water_quality_to_geojson(input_file, geojson_output)
        
        # 生成API服务文件
        create_water_quality_api(geojson_output, api_output)
        
        print("\\n转换完成！生成的文件:")
        print(f"1. GeoJSON数据文件: {geojson_output}")
        print(f"2. TypeScript API文件: {api_output}")
        
    except Exception as e:
        print(f"转换过程中发生错误: {str(e)}")

if __name__ == "__main__":
    main()
