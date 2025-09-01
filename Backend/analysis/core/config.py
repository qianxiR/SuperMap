"""
配置管理模块
统一管理所有系统配置
"""
from functools import lru_cache
from typing import Optional, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    app_name: str = Field(default="Analysis Service", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    debug: bool = Field(default=True, alias="DEBUG")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    
    # API 配置
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        return v
    
    @property
    def cors_origins_list(self) -> List[str]:
        """获取解析后的 CORS origins 列表"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',')]
        return self.cors_origins
    
    # 数据库配置
    postgres_user: str = Field(default="supermap", alias="POSTGRES_USER")
    postgres_password: str = Field(default="supermap", alias="POSTGRES_PASSWORD")
    postgres_host: str = Field(default="localhost", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="supermap", alias="POSTGRES_DB")
    
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    # Redis 配置
    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_password: Optional[str] = Field(default=None, alias="REDIS_PASSWORD")
    redis_db: int = Field(default=1, alias="REDIS_DB")
    
    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    # SuperMap 配置
    supermap_base_url: str = Field(default="http://localhost:8090", alias="SUPERMAP_BASE_URL")
    supermap_server_url: str = Field(default="http://localhost:8090/iserver", alias="SUPERMAP_SERVER_URL")
    supermap_username: str = Field(default="admin", alias="SUPERMAP_USERNAME")
    supermap_password: str = Field(default="supermap", alias="SUPERMAP_PASSWORD")

    # JWT 配置
    secret_key: str = Field(default="your-secret-key", alias="SECRET_KEY")
    algorithm: str = Field(default="HS256", alias="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # 日志配置
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    
    # 分析服务配置
    analysis_timeout: int = Field(default=300, alias="ANALYSIS_TIMEOUT")
    max_concurrent_analysis: int = Field(default=10, alias="MAX_CONCURRENT_ANALYSIS")
    result_cache_ttl: int = Field(default=3600, alias="RESULT_CACHE_TTL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 全局配置实例
settings = get_settings()
