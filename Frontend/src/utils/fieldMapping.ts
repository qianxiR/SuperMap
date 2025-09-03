/**
 * 前后端字段映射工具
 * 保留实际使用的核心功能
 */

/**
 * 后端用户实体字段映射
 */
export const BACKEND_USER_FIELDS = {
  // 核心字段
  ID: 'id',
  USERNAME: 'username',
  EMAIL: 'email',
  PHONE: 'phone',
  IS_ACTIVE: 'is_active',
  IS_SUPERUSER: 'is_superuser',
  
  // 时间字段
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  LAST_LOGIN: 'last_login',
  REGISTERED_AT: 'registered_at',
  
  // 密码字段（前端不直接使用）
  HASHED_PASSWORD: 'hashed_password'
} as const

/**
 * 获取必需的字段列表（只包含前端实际使用的字段）
 */
export function getRequiredUserFields(): string[] {
  return [
    BACKEND_USER_FIELDS.ID,
    BACKEND_USER_FIELDS.USERNAME,
    BACKEND_USER_FIELDS.EMAIL,
    BACKEND_USER_FIELDS.IS_ACTIVE
  ]
}
