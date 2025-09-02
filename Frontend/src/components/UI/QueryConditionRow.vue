<template>
  <div class="query-condition-row">
    <!-- 字段选择 - 改为输入框 -->
    <div class="field-selector">
      <TraditionalInputGroup
        v-model="condition.fieldName"
        type="text"
        :placeholder="getFieldPlaceholder()"
        :disabled="disabled"
      />
    </div>
    
    <!-- 比较操作符选择 -->
    <div class="operator-selector">
      <DropdownSelect
        v-model="condition.operator"
        :options="operatorOptions"
        :placeholder="getOperatorPlaceholder()"
        :disabled="disabled"
      />
    </div>
    
    <!-- 值输入 -->
    <div class="value-input">
      <TraditionalInputGroup
        :model-value="inputValue"
        type="text"
        :placeholder="getValuePlaceholder()"
        :disabled="disabled"
        @update:modelValue="onValueChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'
import DropdownSelect from './DropdownSelect.vue'
import TraditionalInputGroup from './TraditionalInputGroup.vue'
import type { QueryCondition, FieldInfo } from '@/types/query'

// 比较操作符选项
const operatorOptions = [
  { value: 'eq', label: '=', description: '等于' },
  { value: 'gt', label: '>', description: '大于' },
  { value: 'lt', label: '<', description: '小于' },
  { value: 'gte', label: '>=', description: '大于等于' },
  { value: 'lte', label: '<=', description: '小于等于' },
  { value: 'like', label: 'LIKE', description: '模糊匹配（使用%作为通配符）' }
]

interface Props {
  condition: QueryCondition
  fields: FieldInfo[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  update: [condition: QueryCondition]
}>()

// 保留占位，后续如需用于验证可恢复

// 获取字段选择占位符
const getFieldPlaceholder = () => {
  if (props.disabled) return '输入字段名'
  return '输入字段名'
}

// 获取操作符选择占位符
const getOperatorPlaceholder = () => {
  if (props.disabled) return '等于'
  return '操作符'
}

// 根据字段类型获取值占位符
const getValuePlaceholder = () => {
  if (props.disabled) return '输入值'
  
  const field = props.fields.find(f => f.name === props.condition.fieldName)
  if (!field) return '输入值'
  
  switch (field.type) {
    case '文本':
      return props.condition.operator === 'like' ? '输入关键词，支持%通配符（如：%武汉%）' : '输入文本'
    case '整数':
    case '小数':
      return '输入数字'
    case '布尔值':
      return '输入 true 或 false'
    case '日期':
      return '输入日期 (YYYY-MM-DD)'
    default:
      return '输入值'
  }
}

// 处理字段名输入由 v-model 自动触发

// 处理值输入
const handleValueInput = () => {
  // 根据字段类型转换值
  const field = props.fields.find(f => f.name === props.condition.fieldName)
  if (!field) return
  
  let convertedValue: string | number | boolean = props.condition.value
  
  switch (field.type) {
    case '整数':
      convertedValue = parseInt(String(props.condition.value)) || 0
      break
    case '小数':
      convertedValue = parseFloat(String(props.condition.value)) || 0
      break
    case '布尔值':
      convertedValue = String(props.condition.value).toLowerCase() === 'true'
      break
    default:
      convertedValue = String(props.condition.value)
  }
  
  props.condition.value = convertedValue
  emit('update', props.condition)
}

// 将可能的 boolean 值转为字符串以满足输入组件类型
const inputValue = computed(() => {
  const value = props.condition.value
  if (typeof value === 'boolean') {
    return String(value)
  }
  return value as string | number | undefined
})

const onValueChange = (val: string | number | undefined) => {
  props.condition.value = val as unknown as string | number | boolean
  handleValueInput()
}

// 监听条件变化并触发更新
watch(() => props.condition, (newCondition) => {
  emit('update', newCondition)
}, { deep: true })

// 监听字段选择变化，更新占位符和验证
watch(() => props.condition.fieldName, () => {
  emit('update', props.condition)
})

// 监听操作符变化，更新占位符
watch(() => props.condition.operator, () => {
  emit('update', props.condition)
})
</script>

<style scoped>
.query-condition-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
}

.field-selector {
  flex: 2;
  min-width: 150px;
  position: relative;
}

.operator-selector {
  flex: 1;
  min-width: 100px;
}

.value-input {
  flex: 2;
  min-width: 150px;
}

.field-input-field,
.value-input-field {
  width: 100%;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 12px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}

.field-input-field:focus,
.value-input-field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.field-input-field:disabled,
.value-input-field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-validation-message {
  font-size: 10px;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.validation-success {
  color: var(--text);
  background: var(--surface);
}

.validation-warning {
  color: var(--text);
  background: var(--surface);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .query-condition-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .field-selector,
  .operator-selector,
  .value-input {
    min-width: auto;
  }
}

/* 确保下拉组件样式一致 */
:deep(.dropdown-select) {
  min-height: 36px;
}

:deep(.dropdown-options) {
  z-index: 1001;
}
</style>
