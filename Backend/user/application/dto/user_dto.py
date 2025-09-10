"""
用户数据传输对象
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from pydantic import field_validator, model_validator
import re


class UserRegisterDTO(BaseModel):
    """用户注册DTO"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱")
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    confirm_password: str = Field(..., description="确认密码")
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('用户名只能包含字母、数字和下划线')
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^1[3-9]\d{9}$', v):
            raise ValueError('手机号格式不正确')
        return v

    @model_validator(mode='after')
    def validate_passwords_match(self):
        if self.confirm_password != self.password:
            raise ValueError('密码和确认密码不匹配')
        return self


class UserLoginDTO(BaseModel):
    """用户登录DTO"""
    login_identifier: str = Field(..., description="登录标识符（用户名/邮箱/手机号）")
    password: str = Field(..., description="密码")


class UserProfileDTO(BaseModel):
    """用户资料DTO"""
    id: int
    username: str
    email: str
    phone: Optional[str]
    is_active: bool
    registered_at: Optional[str]


class UserUpdateDTO(BaseModel):
    """用户信息更新DTO"""
    old_username: str = Field(..., description="原用户名")
    new_username: Optional[str] = Field(None, min_length=3, max_length=50, description="新用户名")
    old_email: str = Field(..., description="原邮箱")
    new_email: Optional[EmailStr] = Field(None, description="新邮箱")
    old_phone: str = Field(..., description="原手机号")
    new_phone: Optional[str] = Field(None, max_length=20, description="新手机号")
    
    @field_validator('new_username')
    @classmethod
    def validate_new_username(cls, v):
        if v and not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('用户名只能包含字母、数字和下划线')
        return v
    
    @field_validator('new_phone')
    @classmethod
    def validate_new_phone(cls, v):
        if v and not re.match(r'^1[3-9]\d{9}$', v):
            raise ValueError('手机号格式不正确')
        return v


class PasswordChangeDTO(BaseModel):
    """密码修改DTO"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, max_length=100, description="新密码")
    confirm_new_password: str = Field(..., description="确认新密码")
    
    @model_validator(mode='after')
    def validate_new_passwords_match(self):
        if self.confirm_new_password != self.new_password:
            raise ValueError('新密码和确认密码不匹配')
        return self


class UserStatsDTO(BaseModel):
    """用户统计DTO"""
    total_users: int
    active_users: int
    new_users_today: int


class AuthResponseDTO(BaseModel):
    """认证响应DTO"""
    success: bool
    message: str
    token: Optional[str] = None
    data: Optional[dict] = None
