"""
用户相关的数据传输对象 (DTO)
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserRegisterRequest(BaseModel):
    """用户注册请求"""
    username: str
    email: str
    phone: Optional[str] = None
    password: str
    confirm_password: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('用户名至少2个字符')
        if len(v.strip()) > 50:
            raise ValueError('用户名不能超过50个字符')
        return v.strip()

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('邮箱格式不正确')
        return v.lower().strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('密码至少6个字符')
        if len(v) > 100:
            raise ValueError('密码不能超过100个字符')
        return v

    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('密码和确认密码不匹配')
        return v


class UserLoginRequest(BaseModel):
    """用户登录请求"""
    login_identifier: str  # 用户名/邮箱/手机号
    password: str

    @field_validator('login_identifier')
    @classmethod
    def validate_login_identifier(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('登录标识不能为空且至少2个字符')
        return v.strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v:
            raise ValueError('密码不能为空')
        return v


class UserProfileResponse(BaseModel):
    """用户资料响应"""
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    is_active: bool = True
    registered_at: str  # 用户注册时间


class UserUpdateRequest(BaseModel):
    """用户信息更新请求"""
    old_username: str
    new_username: Optional[str] = None
    old_email: str
    new_email: Optional[str] = None
    old_phone: Optional[str] = None
    new_phone: Optional[str] = None

    @field_validator('new_username')
    @classmethod
    def validate_new_username(cls, v):
        if v is not None:
            if len(v.strip()) < 2:
                raise ValueError('新用户名至少2个字符')
            if len(v.strip()) > 50:
                raise ValueError('新用户名不能超过50个字符')
            return v.strip()
        return v

    @field_validator('new_email')
    @classmethod
    def validate_new_email(cls, v):
        if v is not None:
            if not v or '@' not in v:
                raise ValueError('新邮箱格式不正确')
            return v.lower().strip()
        return v


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    current_password: str
    new_password: str
    confirm_new_password: str

    @field_validator('current_password')
    @classmethod
    def validate_current_password(cls, v):
        if not v:
            raise ValueError('当前密码不能为空')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError('新密码至少6个字符')
        if len(v) > 100:
            raise ValueError('新密码不能超过100个字符')
        return v

    @field_validator('confirm_new_password')
    @classmethod
    def validate_confirm_new_password(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('新密码和确认密码不匹配')
        return v


# 通用响应DTO
class ApiResponse(BaseModel):
    """通用API响应"""
    success: bool
    message: str
    data: Optional[dict] = None


class RegisterResponse(BaseModel):
    """注册响应"""
    success: bool
    message: str
    data: Optional[dict] = None


class LoginResponse(BaseModel):
    """登录响应"""
    success: bool
    message: str
    token: str
    data: Optional[dict] = None


class UserResponse(BaseModel):
    """用户响应"""
    id: str
    username: str
    email: str
    phone: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login: Optional[str] = None
