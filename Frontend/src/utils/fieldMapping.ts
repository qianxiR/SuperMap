/**
 * 前后端字段映射工具
 * 确保字段名称和类型的一致性
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
 * 前端用户信息字段映射
 */
export const FRONTEND_USER_FIELDS = {
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
  
  // 前端特有字段
  ROLE: 'role',
  ACCOUNT_TYPE: 'accountType',
  LOGIN_TIME: 'loginTime'
} as const

/**
 * 字段类型定义
 */
export type BackendUserField = typeof BACKEND_USER_FIELDS[keyof typeof BACKEND_USER_FIELDS]
export type FrontendUserField = typeof FRONTEND_USER_FIELDS[keyof typeof FRONTEND_USER_FIELDS]

/**
 * 验证字段名称是否有效
 */
export function isValidBackendField(fieldName: string): fieldName is BackendUserField {
  return Object.values(BACKEND_USER_FIELDS).includes(fieldName as BackendUserField)
}

export function isValidFrontendField(fieldName: string): fieldName is FrontendUserField {
  return Object.values(FRONTEND_USER_FIELDS).includes(fieldName as FrontendUserField)
}

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

/**
 * 获取可选字段列表
 */
export function getOptionalUserFields(): BackendUserField[] {
  return [
    BACKEND_USER_FIELDS.PHONE,
    BACKEND_USER_FIELDS.IS_SUPERUSER,
    BACKEND_USER_FIELDS.CREATED_AT,
    BACKEND_USER_FIELDS.UPDATED_AT,
    BACKEND_USER_FIELDS.LAST_LOGIN,
    BACKEND_USER_FIELDS.REGISTERED_AT
  ]
}

/**
 * 字段名称规范化
 * 确保字段名称的大小写和格式正确
 */
export function normalizeFieldName(fieldName: string): string {
  // 转换为小写并替换下划线
  return fieldName.toLowerCase().replace(/_/g, '')
}

/**
 * 比较字段名称（忽略大小写和下划线）
 */
export function compareFieldNames(field1: string, field2: string): boolean {
  return normalizeFieldName(field1) === normalizeFieldName(field2)
}
