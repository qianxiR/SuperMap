#!/usr/bin/env python3
"""
简单的SuperMap缓冲区分析测试脚本
测试数据传入和JSON返回功能（使用模拟数据）
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Any

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from infrastructure.external.supermap_service import SuperMapConfig, BufferSetting


class MockSuperMapService:
    """模拟SuperMap服务类，用于测试数据传入和JSON返回功能"""
    
    def __init__(self, config: SuperMapConfig):
        self.config = config
    
    async def buffer_analysis(self, buffer_setting: BufferSetting, filter_query: str = None) -> Dict[str, Any]:
        """
        模拟缓冲区分析
        
        输入数据格式:
        - buffer_setting: BufferSetting对象，包含缓冲区参数
        - filter_query: 可选的过滤查询条件
        
        数据处理方法:
        1. 验证输入参数
        2. 生成模拟的缓冲区分析结果
        3. 返回标准格式的JSON数据
        
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
            # 验证输入参数
            if buffer_setting.left_distance <= 0 or buffer_setting.right_distance <= 0:
                return {
                    "success": False,
                    "error": "缓冲区距离必须大于0"
                }
            
            # 生成模拟的GeoJSON要素
            mock_features = [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [116.3974, 39.9093],
                            [116.4074, 39.9093],
                            [116.4074, 39.9193],
                            [116.3974, 39.9193],
                            [116.3974, 39.9093]
                        ]]
                    },
                    "properties": {
                        "id": 1,
                        "name": "缓冲区1",
                        "buffer_distance": buffer_setting.left_distance,
                        "end_type": buffer_setting.end_type,
                        "area": 1000000.0
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [116.4074, 39.9193],
                            [116.4174, 39.9193],
                            [116.4174, 39.9293],
                            [116.4074, 39.9293],
                            [116.4074, 39.9193]
                        ]]
                    },
                    "properties": {
                        "id": 2,
                        "name": "缓冲区2",
                        "buffer_distance": buffer_setting.right_distance,
                        "end_type": buffer_setting.end_type,
                        "area": 1500000.0
                    }
                }
            ]
            
            # 计算总面积
            total_area = sum(feature["properties"]["area"] for feature in mock_features)
            
            # 构建返回结果
            result = {
                "success": True,
                "data": {
                    "features": mock_features,
                    "total_count": len(mock_features),
                    "area": total_area,
                    "buffer_distance": buffer_setting.left_distance,
                    "config": {
                        "service_url": self.config.service_url,
                        "dataset": self.config.dataset,
                        "filter_query": filter_query
                    }
                }
            }
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"模拟分析失败: {str(e)}"
            }


class SimpleBufferTest:
    """简单缓冲区分析测试类"""
    
    def __init__(self):
        # 测试配置
        self.test_configs = [
            {
                "name": "测试1-圆形缓冲区",
                "config": SuperMapConfig(
                    service_url="https://iserver.supermap.io/iserver/services/spatialanalyst-changchun/restjsr/spatialanalyst",
                    dataset="RoadLine2@Changchun",
                    timeout=30000
                ),
                "buffer_setting": BufferSetting(
                    end_type="ROUND",
                    left_distance=10.0,
                    right_distance=10.0,
                    semicircle_line_segment=10
                ),
                "filter_query": "NAME='团结路'"
            },
            {
                "name": "测试2-平头缓冲区",
                "config": SuperMapConfig(
                    service_url="https://iserver.supermap.io/iserver/services/spatialanalyst-changchun/restjsr/spatialanalyst",
                    dataset="RoadNet@Changchun",
                    timeout=30000
                ),
                "buffer_setting": BufferSetting(
                    end_type="FLAT",
                    left_distance=50.0,
                    right_distance=30.0,
                    semicircle_line_segment=8
                ),
                "filter_query": None
            },
            {
                "name": "测试3-不同距离缓冲区",
                "config": SuperMapConfig(
                    service_url="https://iserver.supermap.io/iserver/services/spatialanalyst-changchun/restjsr/spatialanalyst",
                    dataset="TestDataset@Changchun",
                    timeout=30000
                ),
                "buffer_setting": BufferSetting(
                    end_type="ROUND",
                    left_distance=100.0,
                    right_distance=200.0,
                    semicircle_line_segment=12
                ),
                "filter_query": "TYPE='highway'"
            }
        ]
    
    async def test_buffer_analysis(self, test_case: dict) -> dict:
        """
        测试缓冲区分析
        
        输入数据格式:
        - test_case: 包含配置、缓冲区设置和过滤条件的测试用例
        
        数据处理方法:
        1. 创建模拟SuperMap服务实例
        2. 调用缓冲区分析功能
        3. 验证返回结果格式和内容
        
        输出数据格式:
        {
            "test_name": str,
            "success": bool,
            "result": Dict,
            "error": Optional[str],
            "execution_time": float
        }
        """
        import time
        start_time = time.time()
        
        try:
            print(f"\n🧪 开始测试: {test_case['name']}")
            print(f"   服务URL: {test_case['config'].service_url}")
            print(f"   数据集: {test_case['config'].dataset}")
            print(f"   缓冲区设置: {test_case['buffer_setting']}")
            print(f"   过滤条件: {test_case.get('filter_query', '无')}")
            
            # 创建模拟服务实例
            service = MockSuperMapService(test_case['config'])
            
            # 调用缓冲区分析
            result = await service.buffer_analysis(
                buffer_setting=test_case['buffer_setting'],
                filter_query=test_case.get('filter_query')
            )
            
            execution_time = time.time() - start_time
            
            # 验证结果
            if result['success']:
                print(f"   ✅ 测试成功")
                print(f"   返回要素数量: {result['data']['total_count']}")
                print(f"   缓冲区距离: {result['data']['buffer_distance']}")
                print(f"   总面积: {result['data']['area']:.2f}")
                print(f"   执行时间: {execution_time:.3f}秒")
                
                # 验证JSON格式
                json_str = json.dumps(result, ensure_ascii=False, indent=2)
                print(f"   📄 JSON数据长度: {len(json_str)} 字符")
                
                # 保存结果到文件
                self.save_test_result(test_case['name'], result)
                
            else:
                print(f"   ❌ 测试失败: {result['error']}")
            
            return {
                "test_name": test_case['name'],
                "success": result['success'],
                "result": result,
                "error": result.get('error'),
                "execution_time": execution_time
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"测试异常: {str(e)}"
            print(f"   ❌ {error_msg}")
            
            return {
                "test_name": test_case['name'],
                "success": False,
                "result": None,
                "error": error_msg,
                "execution_time": execution_time
            }
    
    def save_test_result(self, test_name: str, result: dict):
        """保存测试结果到JSON文件"""
        output_dir = Path("test_results")
        output_dir.mkdir(exist_ok=True)
        
        filename = f"simple_buffer_{test_name.replace(' ', '_').lower()}.json"
        filepath = output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"   结果已保存到: {filepath}")
    
    async def run_all_tests(self) -> dict:
        """
        运行所有测试用例
        
        输入数据格式:
        无参数
        
        数据处理方法:
        1. 遍历所有测试配置
        2. 执行缓冲区分析测试
        3. 统计测试结果
        
        输出数据格式:
        {
            "total_tests": int,
            "passed_tests": int,
            "failed_tests": int,
            "test_results": List[Dict],
            "summary": str
        }
        """
        print("🚀 开始简单SuperMap缓冲区分析测试")
        print("测试数据传入和JSON返回功能")
        print("=" * 60)
        
        test_results = []
        passed_count = 0
        failed_count = 0
        
        for test_case in self.test_configs:
            result = await self.test_buffer_analysis(test_case)
            test_results.append(result)
            
            if result['success']:
                passed_count += 1
            else:
                failed_count += 1
        
        # 生成测试报告
        total_tests = len(self.test_configs)
        summary = f"测试完成: {passed_count}/{total_tests} 通过"
        
        print("\n" + "=" * 60)
        print(f"📊 测试报告")
        print(f"   总测试数: {total_tests}")
        print(f"   通过数: {passed_count}")
        print(f"   失败数: {failed_count}")
        print(f"   成功率: {(passed_count/total_tests*100):.1f}%")
        print(f"   总结: {summary}")
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_count,
            "failed_tests": failed_count,
            "test_results": test_results,
            "summary": summary
        }


async def main():
    """主函数"""
    print("简单SuperMap缓冲区分析测试脚本")
    print("测试数据传入和JSON返回功能（使用模拟数据）")
    print("-" * 60)
    
    # 创建测试实例
    tester = SimpleBufferTest()
    
    # 运行测试
    try:
        report = await tester.run_all_tests()
        
        # 保存测试报告
        report_file = Path("test_results") / "simple_test_report.json"
        report_file.parent.mkdir(exist_ok=True)
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 测试报告已保存到: {report_file}")
        
        # 返回测试结果
        if report['failed_tests'] > 0:
            print(f"\n⚠️  有 {report['failed_tests']} 个测试失败")
            return 1
        else:
            print(f"\n🎉 所有测试通过！数据传入和JSON返回功能正常！")
            return 0
            
    except KeyboardInterrupt:
        print("\n\n⏹️  测试被用户中断")
        return 1
    except Exception as e:
        print(f"\n💥 测试脚本异常: {str(e)}")
        return 1


if __name__ == "__main__":
    # 运行测试
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
