<template>
  <div class="region-population-chart">
    <div class="chart-header">
      <h3>武汉区域人口数量</h3>
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
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { useThemeStore } from '@/stores/themeStore'

// 区域人口数据（按人口数量排序）
const populationData = [
  { name: '江岸区', value: 965260 },
  { name: '江汉区', value: 647932 },
  { name: '硚口区', value: 666661 },
  { name: '汉阳区', value: 837263 },
  { name: '武昌区', value: 1092750 },
  { name: '青山区', value: 494772 },
  { name: '洪山区', value: 2785118 },
  { name: '东西湖区', value: 845782 },
  { name: '蔡甸区', value: 554383 },
  { name: '江夏区', value: 974715 },
  { name: '黄陂区', value: 1151644 },
  { name: '新洲区', value: 860377 },
  { name: '汉南区', value: 626441 }
].sort((a, b) => b.value - a.value)

const chartContainer = ref<HTMLElement>()
const chartType = ref<'pie' | 'bar'>('pie')
let chartInstance: echarts.ECharts | null = null
const themeStore = useThemeStore()

// 获取当前主题的实际颜色值
const getThemeColor = (cssVar: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
}

// 饼图配置选项
const pieOption = {
  tooltip: {
    trigger: 'item',
    formatter: function(params: any) {
      const percent = params.percent
      return `${params.name}<br/>${(params.value / 10000).toFixed(1)}万人 (${percent}%)`
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
  color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff', '#1890ff', '#40a9ff'],
  series: [
    {
      id: 'population',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['50%', '40%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: populationData,
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
          fontSize: 14,
          fontWeight: 'bold',
          color: '#1890ff'
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
        length2: -5
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
      return `${data.name}: ${(data.value / 10000).toFixed(1)}万人`
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
      fontSize: 13,
      fontWeight: 'bold',
      formatter: function(value: number) {
        return (value / 10000).toFixed(0) + '万'
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
    data: populationData.map(item => item.name).reverse(),
    axisLabel: {
      color: '#1890ff',
      fontSize: 12,
      fontWeight: 'bold',
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
    id: 'population',
    data: populationData.map((item, index) => ({
      value: item.value,
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
.region-population-chart {
  position: absolute;
  top: 10px;
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
  .region-population-chart {
    width: 300px;
    height: calc(50vh - 40px);
    top: 30px;
    left: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>
