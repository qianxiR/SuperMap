<template>
  <div class="water-line-chart">
    <div class="chart-header">
      <h3>线状水系分布概况</h3>
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

// 水系线统计数据
const waterLineData = [
  { name: '河类水系线', value: 528.64, count: 100, avg: 5286.36 },
  { name: '干渠类水系线', value: 172.81, count: 31, avg: 5574.39 },
  { name: '江类水系线', value: 198.68, count: 22, avg: 9030.76 },
  { name: '沟类水系线', value: 105.60, count: 42, avg: 2514.33 },
  { name: '举水类水系线', value: 50.86, count: 6, avg: 8476.18 },
  { name: '倒水类水系线', value: 41.80, count: 6, avg: 6966.11 },
  { name: '干沟类水系线', value: 36.10, count: 15, avg: 2406.78 }
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
      const data = waterLineData.find(item => item.name === params.name)
      return `${params.name}<br/>长度: ${params.value}公里<br/>数量: ${data?.count}条 (${percent}%)`
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
  color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff'],
  series: [
    {
      id: 'waterLine',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['40%', '50%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: waterLineData.map(item => ({
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
      const data = waterLineData[params[0].dataIndex]
      return `${params[0].name}<br/>` +
        `长度: ${params[0].value}公里<br/>` +
        `数量: ${data.count}条<br/>` +
        `平均长度: ${data.avg.toFixed(2)}米`
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
    data: waterLineData.map(item => item.name),
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
      id: 'waterLine',
      name: '长度',
      type: 'bar',
      universalTransition: true,
      data: waterLineData.map((item, index) => ({
        value: item.value,
        itemStyle: {
          color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff'][index],
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
.water-line-chart {
  position: absolute;
  top: 10px;
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
  .water-line-chart {
    width: 300px;
    height: calc(50vh - 40px);
    bottom: 30px;
    right: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>
