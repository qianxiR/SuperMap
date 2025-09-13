<template>
  <div class="livelihood-summary-chart">
    <div class="chart-header">
      <h3>民生资源一张图总览</h3>
    </div>
    <div 
      ref="chartContainer" 
      class="chart-container"
      @mouseenter="switchToBarChart"
      @mouseleave="switchToPieChart"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useThemeStore } from '@/stores/themeStore'

// 城市民生一张图总览数据（按数值从大到小排序）
const livelihoodData = [
  { name: '居民点', value: 1507, color: '#001529' },
  { name: '学校', value: 441, color: '#002766' },
  { name: '医院', value: 441, color: '#003a8c' }
]

const chartContainer = ref<HTMLElement>()
const chartType = ref<'pie' | 'bar'>('pie')
let chartInstance: echarts.ECharts | null = null
const themeStore = useThemeStore()

// 饼图配置选项
const pieOption = {
  tooltip: {
    trigger: 'item',
    formatter: function(params: any) {
      const percent = params.percent
      return `${params.name}<br/>${params.value}个 (${percent}%)`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderColor: '#1890ff',
    borderWidth: 2,
    textStyle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold'
    }
  },
  legend: {
    orient: 'horizontal',
    bottom: '5%',
    left: 'center',
    textStyle: {
      color: '#1890ff',
      fontSize: 12,
      fontWeight: 'bold'
    },
    itemWidth: 14,
    itemHeight: 10
  },
  color: ['#001529', '#002766', '#003a8c'],
  series: [
    {
      id: 'livelihood',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['50%', '40%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: livelihoodData,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 3,
        shadowColor: 'rgba(0, 0, 0, 0.3)'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 8,
          shadowOffsetX: 0,
          shadowColor: 'rgba(24, 144, 255, 0.5)'
        },
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#0078D4'
        }
      },
      label: {
        show: true,
        formatter: function(params: any) {
          return `${params.percent}%`
        },
        fontSize: 14,
        color: '#1890ff',
        fontWeight: 'bold'
      },
      labelLine: {
        show: true,
        length: 8,
        length2: -5,
        lineStyle: {
          color: '#0078D4',
          width: 1
        }
      }
    }
  ]
}

// 柱状图配置选项
const barOption = {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: function(params: any) {
      return `${params[0].name}<br/>${params[0].marker}数量: ${params[0].value}个`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderColor: '#1890ff',
    borderWidth: 2,
    textStyle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '5%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: livelihoodData.map(item => item.name),
    axisLabel: {
      color: '#0078D4',
      fontSize: 10
    },
    axisLine: {
      lineStyle: {
        color: 'var(--border)',
        width: 1
      }
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: '#0078D4',
      fontSize: 13,
      fontWeight: 'bold',
      formatter: function(value: number) {
        return value + '个'
      }
    },
    axisLine: {
      lineStyle: {
        color: 'var(--border)',
        width: 1
      }
    },
    splitLine: {
      lineStyle: {
        color: 'var(--border)',
        opacity: 0.3
      }
    }
  },
  animationDurationUpdate: 1000,
  series: [
    {
      name: '数量',
      type: 'bar',
      id: 'livelihood',
      data: livelihoodData.map((item, index) => ({
        value: item.value,
        itemStyle: {
          color: item.color
        }
      })),
      universalTransition: true,
      itemStyle: {
        borderRadius: [4, 4, 0, 0]
      }
    }
  ]
}

// 切换到柱状图
const switchToBarChart = () => {
  chartType.value = 'bar'
  updateChart()
}

// 切换到饼图
const switchToPieChart = () => {
  chartType.value = 'pie'
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return
  
  const option = chartType.value === 'pie' ? pieOption : barOption
  
  // 添加渐显动画效果
  if (chartType.value === 'pie') {
    // 饼图切换：渐显效果
    chartInstance.setOption({
      ...option,
      animationDuration: 2000,
      animationEasing: 'quadInOut' as any,
      animationDelay: (idx) => idx * 200
    }, true)
  } else {
    // 柱状图切换：渐显式生长
    chartInstance.setOption({
      ...option,
      animationDuration: 1000,
      animationEasing: 'quadInOut' as any,
      animationDelay: (idx) => idx * 100
    }, true)
  }
}

// 初始化图表
const initChart = async () => {
  if (!chartContainer.value) return
  
  // 初始化图表实例
  chartInstance = echarts.init(chartContainer.value)
  
  // 设置初始选项（默认显示饼图）
  chartInstance.setOption(pieOption)
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听主题变化
const handleThemeChange = () => {
  if (chartInstance) {
    updateChart()
  }
}

onMounted(async () => {
  await nextTick()
  initChart()
  
  // 监听主题变化
  themeStore.$subscribe(handleThemeChange)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.livelihood-summary-chart {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 400px;
  height: calc(50vh - 50px);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: transparent;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1890ff;
  text-shadow: 0 1px 2px rgba(24, 144, 255, 0.3);
}

.chart-container {
  width: 100%;
  height: calc(100% - 50px);
  min-height: 230px;
  cursor: pointer;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .livelihood-summary-chart {
    width: 300px;
    height: calc(50vh - 40px);
    bottom: 15px;
    right: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>
