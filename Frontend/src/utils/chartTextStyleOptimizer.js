/**
 * 图表文字样式优化工具
 * 用于批量优化所有图表组件的文字大小和颜色
 */

// 通用文字样式优化配置
export const CHART_TEXT_STYLES = {
  // Tooltip 样式优化
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderColor: '#1890ff',
    borderWidth: 2,
    textStyle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold'
    }
  },

  // Legend 样式优化
  legend: {
    textStyle: {
      color: '#1890ff',
      fontSize: 12,
      fontWeight: 'bold'
    },
    itemWidth: 14,
    itemHeight: 10
  },

  // Label 样式优化
  label: {
    fontSize: 14,
    color: '#1890ff',
    fontWeight: 'bold'
  },

  // 坐标轴样式优化
  axisLabel: {
    color: '#1890ff',
    fontWeight: 'bold'
  },

  // X轴样式
  xAxisLabel: {
    color: '#1890ff',
    fontSize: 12,
    fontWeight: 'bold'
  },

  // Y轴样式
  yAxisLabel: {
    color: '#1890ff',
    fontSize: 13,
    fontWeight: 'bold'
  },

  // 图表标题样式
  headerTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1890ff',
    textShadow: '0 1px 2px rgba(24, 144, 255, 0.3)'
  }
}

/**
 * 获取优化后的tooltip配置
 */
export function getOptimizedTooltipConfig(baseConfig = {}) {
  return {
    ...baseConfig,
    ...CHART_TEXT_STYLES.tooltip
  }
}

/**
 * 获取优化后的legend配置
 */
export function getOptimizedLegendConfig(baseConfig = {}) {
  return {
    ...baseConfig,
    ...CHART_TEXT_STYLES.legend
  }
}

/**
 * 获取优化后的label配置
 */
export function getOptimizedLabelConfig(baseConfig = {}) {
  return {
    ...baseConfig,
    ...CHART_TEXT_STYLES.label
  }
}

/**
 * 获取优化后的坐标轴标签配置
 */
export function getOptimizedAxisLabelConfig(isXAxis = false) {
  const baseConfig = CHART_TEXT_STYLES.axisLabel
  return {
    ...baseConfig,
    fontSize: isXAxis ? CHART_TEXT_STYLES.xAxisLabel.fontSize : CHART_TEXT_STYLES.yAxisLabel.fontSize
  }
}

/**
 * 获取优化后的emphasis label配置
 */
export function getOptimizedEmphasisLabelConfig(baseConfig = {}) {
  return {
    show: true,
    ...CHART_TEXT_STYLES.label,
    ...baseConfig
  }
}

/**
 * 批量替换文本样式的正则表达式模式
 */
export const REPLACEMENT_PATTERNS = [
  // Tooltip textStyle 替换
  {
    pattern: /textStyle:\s*{\s*color:\s*'#fff',\s*fontSize:\s*12\s*}/g,
    replacement: 'textStyle: {\n      color: \'#fff\',\n      fontSize: 14,\n      fontWeight: \'bold\'\n    }'
  },
  // backgroundColor 替换
  {
    pattern: /backgroundColor:\s*'rgba\(0,\s*0,\s*0,\s*0\.8\)',\s*borderColor:\s*'#1890ff',\s*borderWidth:\s*1,/g,
    replacement: 'backgroundColor: \'rgba(0, 0, 0, 0.9)\',\n    borderColor: \'#1890ff\',\n    borderWidth: 2,'
  },
  // Legend textStyle 替换
  {
    pattern: /textStyle:\s*{\s*color:\s*'#0078D4',\s*fontSize:\s*10\s*},/g,
    replacement: 'textStyle: {\n      color: \'#1890ff\',\n      fontSize: 12,\n      fontWeight: \'bold\'\n    },'
  },
  // Label fontSize 和 color 替换
  {
    pattern: /fontSize:\s*12,\s*color:\s*'#0078D4',/g,
    replacement: 'fontSize: 14,\n      color: \'#1890ff\','
  },
  // Axis label fontSize 替换
  {
    pattern: /fontSize:\s*10,/g,
    replacement: 'fontSize: 12,\n      fontWeight: \'bold\','
  },
  {
    pattern: /fontSize:\s*11,/g,
    replacement: 'fontSize: 13,\n      fontWeight: \'bold\','
  },
  // Header title 替换
  {
    pattern: /font-size:\s*14px;\s*font-weight:\s*600;\s*color:\s*#1890ff;/g,
    replacement: 'font-size: 16px;\n  font-weight: 700;\n  color: #1890ff;\n  text-shadow: 0 1px 2px rgba(24, 144, 255, 0.3);'
  }
]

/**
 * 应用所有替换模式到文本内容
 */
export function applyTextStyleOptimizations(content) {
  let optimizedContent = content
  
  REPLACEMENT_PATTERNS.forEach(pattern => {
    optimizedContent = optimizedContent.replace(pattern.pattern, pattern.replacement)
  })
  
  return optimizedContent
}

/**
 * 验证优化结果
 */
export function validateOptimizations(content) {
  const checks = [
    { name: 'Tooltip fontSize 14', pattern: /fontSize:\s*14/ },
    { name: 'Tooltip fontWeight bold', pattern: /fontWeight:\s*'bold'/ },
    { name: 'Legend color #1890ff', pattern: /color:\s*'#1890ff'/ },
    { name: 'Header fontSize 16px', pattern: /font-size:\s*16px/ },
    { name: 'Background opacity 0.9', pattern: /rgba\(0,\s*0,\s*0,\s*0\.9\)/ }
  ]
  
  const results = {}
  checks.forEach(check => {
    results[check.name] = check.pattern.test(content)
  })
  
  return results
}
