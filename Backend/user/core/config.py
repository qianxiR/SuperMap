"""
配置管理模块
统一管理所有系统配置
"""
from functools import lru_cache
from typing import Optional, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    app_name: str = Field(alias="APP_NAME")
    app_version: str = Field(alias="APP_VERSION")
    debug: bool = Field(alias="DEBUG")
    environment: str = Field(alias="ENVIRONMENT")
    
    # API 配置
    api_v1_prefix: str = Field(alias="API_V1_PREFIX")
    cors_origins: str = Field(alias="CORS_ORIGINS")
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        # 保持原始字符串格式，在属性中处理转换
        return v
    
    @property
    def cors_origins_list(self) -> List[str]:
        """获取解析后的 CORS origins 列表"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',')]
        return self.cors_origins
    
    # 数据库配置
    postgres_user: str = Field(alias="POSTGRES_USER")
    postgres_password: str = Field(alias="POSTGRES_PASSWORD")
    postgres_host: str = Field(alias="POSTGRES_HOST")
    postgres_port: int = Field(alias="POSTGRES_PORT")
    postgres_db: str = Field(alias="POSTGRES_DB")
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    # Redis 配置
    redis_host: str = Field(alias="REDIS_HOST")
    redis_port: int = Field(alias="REDIS_PORT")
    redis_password: Optional[str] = Field(alias="REDIS_PASSWORD")
    redis_db: int = Field(alias="REDIS_DB")
    
    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    # SuperMap 配置
    supermap_base_url: str = Field(alias="SUPERMAP_BASE_URL")
    supermap_server_url: str = Field(alias="SUPERMAP_SERVER_URL")
    supermap_username: str = Field(alias="SUPERMAP_USERNAME")
    supermap_password: str = Field(alias="SUPERMAP_PASSWORD")

    # JWT 配置
    secret_key: str = Field(alias="SECRET_KEY")
    algorithm: str = Field(alias="ALGORITHM")
    access_token_expire_minutes: int = Field(alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # 日志配置
    log_level: str = Field(alias="LOG_LEVEL")
    
    # DashScope / Vite 相关配置
    vite_dashscope_api_key: str = Field(alias="VITE_DASHSCOPE_API_KEY")
    vite_dashscope_base_url: str = Field(alias="VITE_DASHSCOPE_BASE_URL")
    vite_dashscope_model: str = Field(alias="VITE_DASHSCOPE_MODEL")
    vite_dashscope_temperature: float = Field(alias="VITE_DASHSCOPE_TEMPERATURE")
    vite_dashscope_max_tokens: int = Field(alias="VITE_DASHSCOPE_MAX_TOKENS")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 全局配置实例
settings = get_settings()