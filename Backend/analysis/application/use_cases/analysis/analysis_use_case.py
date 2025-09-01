"""
分析用例
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from analysis.domains.analysis.entities import (
    AnalysisTask, AnalysisResult, SpatialData, 
    AnalysisStatus, AnalysisType, SuperMapResult
)
from analysis.domains.analysis.services import AnalysisService
from analysis.application.dto.analysis_dto import (
    AnalysisTaskCreateDTO, AnalysisTaskUpdateDTO, AnalysisTaskResponseDTO,
    AnalysisTaskDetailResponseDTO, AnalysisTaskListResponseDTO,
    SpatialDataCreateDTO, SpatialDataUpdateDTO, SpatialDataResponseDTO,
    AnalysisListResponseDTO, SpatialDataListResponseDTO, AnalysisResponseDTO
)


class AnalysisUseCase:
    """分析用例"""
    
    def __init__(self, analysis_service: AnalysisService):
        self.analysis_service = analysis_service
    
    async def create_analysis_task(
        self,
        task_data: AnalysisTaskCreateDTO,
        created_by: str
    ) -> Dict[str, Any]:
        """创建分析任务"""
        task = await self.analysis_service.create_analysis_task(
            name=task_data.name,
            analysis_type=task_data.analysis_type,
            parameters=task_data.parameters,
            created_by=created_by,
            description=task_data.description
        )
        
        return {
            "success": True,
            "message": "分析任务创建成功",
            "data": AnalysisTaskResponseDTO(**task.to_dict())
        }
    
    async def get_analysis_task(self, task_id: str) -> Dict[str, Any]:
        """获取分析任务"""
        try:
            task_uuid = UUID(task_id)
        except ValueError:
            return {
                "success": False,
                "message": "无效的任务ID",
                "error_code": "INVALID_TASK_ID"
            }
        
        task = await self.analysis_service.get_analysis_task(task_uuid)
        if not task:
            return {
                "success": False,
                "message": "分析任务不存在",
                "error_code": "TASK_NOT_FOUND"
            }
        
        return {
            "success": True,
            "message": "获取分析任务成功",
            "data": AnalysisTaskDetailResponseDTO(**task.to_dict())
        }
    
    async def get_user_tasks(self, user_id: str) -> Dict[str, Any]:
        """获取用户的分析任务列表"""
        tasks = await self.analysis_service.get_user_tasks(user_id)
        
        return {
            "success": True,
            "message": "获取用户任务列表成功",
            "data": [AnalysisTaskListResponseDTO(**task.to_list_dict()) for task in tasks]
        }
    
    async def list_analysis_tasks(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        analysis_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """列出分析任务"""
        # 转换状态和分析类型
        status_enum = None
        if status:
            try:
                status_enum = AnalysisStatus(status)
            except ValueError:
                return {
                    "success": False,
                    "message": "无效的状态值",
                    "error_code": "INVALID_STATUS"
                }
        
        type_enum = None
        if analysis_type:
            try:
                type_enum = AnalysisType(analysis_type)
            except ValueError:
                return {
                    "success": False,
                    "message": "无效的分析类型",
                    "error_code": "INVALID_ANALYSIS_TYPE"
                }
        
        tasks = await self.analysis_service.list_analysis_tasks(
            skip=skip,
            limit=limit,
            status=status_enum,
            analysis_type=type_enum
        )
        
        return {
            "success": True,
            "message": "获取任务列表成功",
            "data": AnalysisListResponseDTO(
                tasks=[AnalysisTaskListResponseDTO(**task.to_list_dict()) for task in tasks],
                total=len(tasks),
                limit=limit,
                offset=skip
            )
        }
    
    async def update_task_status(
        self,
        task_id: str,
        status: str,
        supermap_result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """更新任务状态"""
        try:
            task_uuid = UUID(task_id)
            status_enum = AnalysisStatus(status)
        except ValueError:
            return {
                "success": False,
                "message": "无效的任务ID或状态值",
                "error_code": "INVALID_PARAMETERS"
            }
        
        # 转换SuperMap结果
        supermap_result_obj = None
        if supermap_result:
            supermap_result_obj = SuperMapResult(
                success=supermap_result.get("success", False),
                data=supermap_result.get("data"),
                error_message=supermap_result.get("error_message"),
                service_response=supermap_result.get("service_response")
            )
        
        task = await self.analysis_service.update_task_status(
            task_uuid,
            status_enum,
            supermap_result_obj,
            error_message
        )
        
        if not task:
            return {
                "success": False,
                "message": "分析任务不存在",
                "error_code": "TASK_NOT_FOUND"
            }
        
        return {
            "success": True,
            "message": "任务状态更新成功",
            "data": AnalysisTaskResponseDTO(**task.to_dict())
        }
    
    async def delete_analysis_task(self, task_id: str) -> Dict[str, Any]:
        """删除分析任务"""
        try:
            task_uuid = UUID(task_id)
        except ValueError:
            return {
                "success": False,
                "message": "无效的任务ID",
                "error_code": "INVALID_TASK_ID"
            }
        
        success = await self.analysis_service.delete_analysis_task(task_uuid)
        
        if not success:
            return {
                "success": False,
                "message": "分析任务不存在或删除失败",
                "error_code": "TASK_NOT_FOUND"
            }
        
        return {
            "success": True,
            "message": "分析任务删除成功"
        }
    
    async def create_spatial_data(
        self,
        spatial_data: SpatialDataCreateDTO
    ) -> Dict[str, Any]:
        """创建空间数据"""
        data = await self.analysis_service.create_spatial_data(
            name=spatial_data.name,
            data_type=spatial_data.data_type,
            geometry=spatial_data.geometry.model_dump(),
            attributes=spatial_data.attributes,
            crs=spatial_data.crs
        )
        
        return {
            "success": True,
            "message": "空间数据创建成功",
            "data": SpatialDataResponseDTO(**data.to_dict())
        }
    
    async def get_spatial_data(self, data_id: str) -> Dict[str, Any]:
        """获取空间数据"""
        try:
            data_uuid = UUID(data_id)
        except ValueError:
            return {
                "success": False,
                "message": "无效的数据ID",
                "error_code": "INVALID_DATA_ID"
            }
        
        data = await self.analysis_service.get_spatial_data(data_uuid)
        if not data:
            return {
                "success": False,
                "message": "空间数据不存在",
                "error_code": "DATA_NOT_FOUND"
            }
        
        return {
            "success": True,
            "message": "获取空间数据成功",
            "data": SpatialDataResponseDTO(**data.to_dict())
        }
    
    async def list_spatial_data(
        self,
        skip: int = 0,
        limit: int = 100,
        data_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """列出空间数据"""
        data_list = await self.analysis_service.list_spatial_data(
            skip=skip,
            limit=limit,
            data_type=data_type
        )
        
        return {
            "success": True,
            "message": "获取空间数据列表成功",
            "data": SpatialDataListResponseDTO(
                data=[SpatialDataResponseDTO(**data.to_dict()) for data in data_list],
                total=len(data_list),
                skip=skip,
                limit=limit
            )
        }
    

