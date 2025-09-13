<template>
  <div class="water-surface-chart">
    <div class="chart-header">
      <h3>面状水系分布概况</h3>
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

// 水系面统计数据
const waterSurfaceData = [
  { name: '湖类水系面', value: 1472.70, count: 111, avg: 13267.55 },
  { name: '海类水系面', value: 103.58, count: 13, avg: 7967.82 },
  { name: '港类水系面', value: 34.17, count: 5, avg: 6833.91 },
  { name: '水库类水系面', value: 163.77, count: 5, avg: 32754.79 }
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
      const data = waterSurfaceData.find(item => item.name === params.name)
      return `${params.name}<br/>周长: ${params.value}公里<br/>数量: ${data?.count}个 (${percent}%)`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#1890ff',
    borderWidth: 1,
    textStyle: {
      color: '#fff',
      fontSize: 12
    }
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    textStyle: {
      color: '#0078D4',
      fontSize: 10
    },
    itemWidth: 12,
    itemHeight: 8
  },
  color: ['#001529', '#002766', '#003a8c', '#0050b3'],
  series: [
    {
      id: 'waterSurface',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['40%', '50%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: waterSurfaceData.map(item => ({
        name: item.name,
        value: item.value
      })),
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
        fontSize: 12,
        color: '#0078D4',
        fontWeight: 'bold'
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
      const data = waterSurfaceData[params[0].dataIndex]
      return `${params[0].name}<br/>周长: ${params[0].value}公里<br/>数量: ${data.count}个`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#1890ff',
    borderWidth: 1,
    textStyle: {
      color: '#fff',
      fontSize: 12
    }
  },
  legend: {
    show: false
  },
  color: ['#001529'],
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '5%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: waterSurfaceData.map(item => item.name),
    axisLabel: {
      color: '#0078D4',
      fontSize: 9,
      rotate: 45
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
      fontSize: 11,
      formatter: function(value: number) {
        return value.toFixed(0) + '公里'
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
      id: 'waterSurface',
      name: '周长',
      type: 'bar',
      universalTransition: true,
      data: waterSurfaceData.map((item, index) => ({
        value: item.value,
        itemStyle: {
          color: ['#001529', '#002766', '#003a8c', '#0050b3'][index],
          borderRadius: [4, 4, 0, 0]
        }
      })),
      itemStyle: {
        borderRadius: [4, 4, 0, 0]
      }
    }
  ]
}

// 切换到饼图
const switchToPieChart = () => {
  if (!chartInstance) return
  chartType.value = 'pie'
  chartInstance.setOption(pieOption, true)
}

// 切换到柱状图
const switchToBarChart = () => {
  if (!chartInstance) return
  chartType.value = 'bar'
  chartInstance.setOption(barOption, true)
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return
  const option = chartType.value === 'pie' ? pieOption : barOption
  chartInstance.setOption(option, true)
}

// 初始化图表
const initChart = async () => {
  if (!chartContainer.value) return
  
  // 初始化图表实例
  chartInstance = echarts.init(chartContainer.value)
  
  // 设置初始选项（显示饼图）
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
.water-surface-chart {
  position: absolute;
  bottom: 50px;
  right: 20px;
  width: 380px;
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
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.chart-container {
  width: 100%;
  height: calc(100% - 50px);
  min-height: 230px;
  cursor: pointer;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .water-surface-chart {
    width: 300px;
    height: calc(50vh - 40px);
    top: 30px;
    right: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>
