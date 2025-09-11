"""
API密钥管理服务
"""
import json
import hashlib
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
from cryptography.fernet import Fernet
import os

from agent.models.schemas import APIKeyCreate, APIKeyUpdate, APIKeyResponse


class APIKeyService:
    """API密钥管理服务"""
    
    def __init__(self):
        # 初始化加密密钥
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
        # 模拟数据存储（实际项目中应使用数据库）
        self.api_keys = {}
    
    def _get_or_create_encryption_key(self) -> bytes:
        """获取或创建加密密钥"""
        key_file = "agent/data/encryption_key"
        os.makedirs(os.path.dirname(key_file), exist_ok=True)
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            return key
    
    def _encrypt_api_key(self, api_key: str) -> str:
        """加密API密钥"""
        return self.cipher.encrypt(api_key.encode()).decode()
    
    def _decrypt_api_key(self, encrypted_key: str) -> str:
        """解密API密钥"""
        return self.cipher.decrypt(encrypted_key.encode()).decode()
    
    async def create_api_key(self, user_id: str, data: APIKeyCreate) -> APIKeyResponse:
        """创建API密钥"""
        api_key_id = str(uuid4())
        encrypted_key = self._encrypt_api_key(data.api_key)
        
        api_key_data = {
            "id": api_key_id,
            "user_id": user_id,
            "name": data.name,
            "provider": data.provider,
            "api_key": encrypted_key,
            "base_url": data.base_url,
            "model_config": data.model_config or {},
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.api_keys[api_key_id] = api_key_data
        return APIKeyResponse(**api_key_data)
    
    async def get_api_keys(self, user_id: str) -> List[APIKeyResponse]:
        """获取用户的API密钥列表"""
        user_keys = []
        for key_data in self.api_keys.values():
            if key_data["user_id"] == user_id:
                # 不返回加密的API密钥
                response_data = key_data.copy()
                response_data.pop("api_key", None)
                response_data.pop("user_id", None)
                user_keys.append(APIKeyResponse(**response_data))
        return user_keys
    
    async def get_api_key(self, user_id: str, api_key_id: str) -> Optional[APIKeyResponse]:
        """获取指定API密钥"""
        key_data = self.api_keys.get(api_key_id)
        if key_data and key_data["user_id"] == user_id:
            response_data = key_data.copy()
            response_data.pop("api_key", None)
            response_data.pop("user_id", None)
            return APIKeyResponse(**response_data)
        return None
    
    async def get_decrypted_api_key(self, user_id: str, api_key_id: str) -> Optional[str]:
        """获取解密后的API密钥（内部使用）"""
        key_data = self.api_keys.get(api_key_id)
        if key_data and key_data["user_id"] == user_id and key_data["is_active"]:
            return self._decrypt_api_key(key_data["api_key"])
        return None
    
    async def update_api_key(self, user_id: str, api_key_id: str, data: APIKeyUpdate) -> Optional[APIKeyResponse]:
        """更新API密钥"""
        key_data = self.api_keys.get(api_key_id)
        if not key_data or key_data["user_id"] != user_id:
            return None
        
        if data.name is not None:
            key_data["name"] = data.name
        if data.api_key is not None:
            key_data["api_key"] = self._encrypt_api_key(data.api_key)
        if data.base_url is not None:
            key_data["base_url"] = data.base_url
        if data.model_config is not None:
            key_data["model_config"] = data.model_config
        if data.is_active is not None:
            key_data["is_active"] = data.is_active
        
        key_data["updated_at"] = datetime.utcnow()
        
        response_data = key_data.copy()
        response_data.pop("api_key", None)
        response_data.pop("user_id", None)
        return APIKeyResponse(**response_data)
    
    async def delete_api_key(self, user_id: str, api_key_id: str) -> bool:
        """删除API密钥"""
        key_data = self.api_keys.get(api_key_id)
        if key_data and key_data["user_id"] == user_id:
            del self.api_keys[api_key_id]
            return True
        return False
    
    async def get_api_key_config(self, user_id: str, api_key_id: str) -> Optional[Dict[str, Any]]:
        """获取API密钥配置（用于LLM调用）"""
        key_data = self.api_keys.get(api_key_id)
        if key_data and key_data["user_id"] == user_id and key_data["is_active"]:
            return {
                "provider": key_data["provider"],
                "api_key": self._decrypt_api_key(key_data["api_key"]),
                "base_url": key_data["base_url"],
                "model_config": key_data["model_config"]
            }
        return None
