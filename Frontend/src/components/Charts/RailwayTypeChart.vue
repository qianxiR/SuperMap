<template>
  <div class="railway-type-chart">
    <div class="chart-header">
      <h3>铁路类型分布</h3>
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

// 铁路类型统计数据（基于SQL查询结果）
const railwayData = [
  { name: '高铁', length: 240916.15, count: 37 },
  { name: '高铁/高架', length: 155779.73, count: 35 },
  { name: '电气化铁路', length: 359458.28, count: 54 },
  { name: '其他', length: 310508.80, count: 52 }
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
      const data = railwayData.find(item => item.name === params.name)
      return `${params.name}<br/>长度: ${(params.value / 1000).toFixed(1)}公里<br/>数量: ${data?.count}条 (${percent}%)`
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
      color: '#1890ff',
      fontSize: 10
    },
    itemWidth: 12,
    itemHeight: 8
  },
  color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff', '#1890ff', '#40a9ff'],
  series: [
    {
      id: 'railway',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['40%', '50%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: railwayData.map(item => ({
        name: item.name,
        value: item.length
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
          color: '#1890ff'
        }
      },
      label: {
        show: true,
        formatter: function(params: any) {
          return `${params.name}\n${params.percent}%`
        },
        fontSize: 10,
        color: '#1890ff'
      },
      labelLine: {
        show: true,
        length: 8,
        length2: 5
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
      const data = params[0]
      const railwayInfo = railwayData.find(item => item.name === data.name)
      return `${data.name}<br/>长度: ${(data.value / 1000).toFixed(1)}公里<br/>数量: ${railwayInfo?.count}条`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#1890ff',
    borderWidth: 1,
    textStyle: {
      color: '#fff',
      fontSize: 12
    }
  },
  grid: {
    left: '2%',
    right: '1%',
    bottom: '4%',
    top: '2%',
    containLabel: false
  },
  xAxis: {
    type: 'value',
    axisLabel: {
      color: '#1890ff',
      fontSize: 11,
      formatter: function(value: number) {
        return (value / 1000).toFixed(0) + 'km'
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
  yAxis: {
    type: 'category',
    data: railwayData.map(item => item.name).reverse(),
    axisLabel: {
      color: '#1890ff',
      fontSize: 10,
      rotate: 0
    },
    axisLine: {
      lineStyle: {
        color: 'var(--border)',
        width: 1
      }
    }
  },
  animationDurationUpdate: 1000,
  series: {
    type: 'bar',
    id: 'railway',
    data: railwayData.map((item, index) => ({
      value: item.length,
      itemStyle: {
        color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff', '#1890ff', '#40a9ff'][index]
      }
    })).reverse(),
    universalTransition: true,
    itemStyle: {
      borderRadius: [0, 4, 4, 0],
      shadowBlur: 3,
      shadowColor: 'rgba(24, 144, 255, 0.3)'
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 5,
        shadowColor: 'rgba(24, 144, 255, 0.5)'
      }
    },
    barWidth: '95%'
  }
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
  chartInstance.setOption(option, true)
}

// 初始化图表
const initChart = async () => {
  if (!chartContainer.value) return
  
  chartInstance = echarts.init(chartContainer.value)
  chartInstance.setOption(pieOption)
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
.railway-type-chart {
  position: absolute;
  bottom: 50px;
  left: 20px;
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

@media (max-width: 768px) {
  .railway-type-chart {
    width: 300px;
    height: calc(50vh - 40px);
    bottom: 15px;
    left: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>
