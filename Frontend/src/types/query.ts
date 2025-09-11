// 查询条件相关的类型定义

// 比较操作符类型
export type ComparisonOperator = 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte' | 'like'

// 单个查询条件接口
export interface QueryCondition {
  fieldName: string
  operator: ComparisonOperator
  value: string | number | boolean
}

// 查询配置接口
export interface QueryConfig {
  condition: QueryCondition
}

// 字段信息接口
export interface FieldInfo {
  name: string
  type: string
  sampleValue: string
  description: string
}

// 操作符选项接口
export interface OperatorOption {
  value: ComparisonOperator
  label: string
  description: string
}
