"""
SuperMap服务集成
"""
import aiohttp
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class SuperMapConfig:
    """SuperMap配置"""
    service_url: str
    dataset: str
    weight_field: str = "length"
    timeout: int = 30000
    result_setting: Dict[str, bool] = None
    
    def __post_init__(self):
        if self.result_setting is None:
            self.result_setting = {
                "returnEdgeFeatures": True,
                "returnEdgeGeometry": True,
                "returnEdgeIDs": True,
                "returnNodeFeatures": True,
                "returnNodeGeometry": True,
                "returnNodeIDs": True,
                "returnPathGuides": True,
                "returnRoutes": True
            }


@dataclass
class BufferSetting:
    """缓冲区设置"""
    end_type: str = "ROUND"  # ROUND/FLAT
    left_distance: float = 100.0
    right_distance: float = 100.0
    semicircle_line_segment: int = 10


class SuperMapServiceError(Exception):
    """SuperMap服务错误"""
    pass


class SuperMapService:
    """SuperMap服务类"""
    
    def __init__(self, config: SuperMapConfig):
        self.config = config
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout / 1000)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def buffer_analysis(self, buffer_setting: BufferSetting, filter_query: Optional[str] = None) -> Dict[str, Any]:
        """
        缓冲区分析
        
        输入数据格式:
        - buffer_setting: BufferSetting对象，包含缓冲区参数
        - filter_query: 可选的过滤查询条件
        
        数据处理方法:
        1. 构建SuperMap缓冲区分析请求参数
        2. 调用SuperMap空间分析服务
        3. 解析返回结果并转换为标准格式
        
        输出数据格式:
        {
            "success": bool,
            "data": {
                "features": List[Dict],  # GeoJSON格式的要素
                "total_count": int,
                "area": float,
                "buffer_distance": float
            },
            "error": Optional[str]
        }
        """
        try:
            # 构建请求参数
            request_data = {
                "dataset": self.config.dataset,
                "bufferSetting": {
                    "endType": buffer_setting.end_type,
                    "leftDistance": {"value": buffer_setting.left_distance},
                    "rightDistance": {"value": buffer_setting.right_distance},
                    "semicircleLineSegment": buffer_setting.semicircle_line_segment
                }
            }
            
            # 添加过滤条件
            if filter_query:
                request_data["filterQueryParameter"] = {
                    "attributeFilter": filter_query
                }
            
            # 调用SuperMap服务 - 使用datasets端点进行缓冲区分析
            url = f"{self.config.service_url}/datasets/{self.config.dataset}/bufferAnalyst"
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            async with self.session.post(url, json=request_data, headers=headers) as response:
                if response.status != 200:
                    raise SuperMapServiceError(f"SuperMap服务调用失败: {response.status}")
                
                result = await response.json()
                
                # 解析结果
                if "recordset" in result and "features" in result["recordset"]:
                    features = result["recordset"]["features"]
                    total_count = len(features)
                    
                    # 计算总面积
                    total_area = 0.0
                    for feature in features:
                        if "geometry" in feature and "coordinates" in feature["geometry"]:
                            # 这里可以添加面积计算逻辑
                            pass
                    
                    return {
                        "success": True,
                        "data": {
                            "features": features,
                            "total_count": total_count,
                            "area": total_area,
                            "buffer_distance": buffer_setting.left_distance
                        }
                    }
                else:
                    return {
                        "success": False,
                        "error": "SuperMap返回数据格式异常"
                    }
                    
        except aiohttp.ClientError as e:
            return {
                "success": False,
                "error": f"网络请求错误: {str(e)}"
            }
        except SuperMapServiceError as e:
            return {
                "success": False,
                "error": f"SuperMap服务错误: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"未知错误: {str(e)}"
            }






