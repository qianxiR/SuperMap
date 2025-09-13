<template>
  <div class="road-level-chart">
    <div class="chart-header">
      <h3>公路等级分布</h3>
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

// 公路等级统计数据（基于SQL查询结果）
const roadData = [
  { name: '一级公路', length: 286270.02, count: 60 },
  { name: '二级公路', length: 1082113.81, count: 204 },
  { name: '三级公路', length: 175036.29, count: 47 },
  { name: '四级公路', length: 165863.34, count: 41 },
  { name: '其他', length: 370926.28, count: 173 }
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
      const data = roadData.find(item => item.name === params.name)
      return `${params.name}<br/>长度: ${(params.value / 1000).toFixed(1)}公里<br/>数量: ${data?.count}条 (${percent}%)`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#16a085',
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
      color: '#16a085',
      fontSize: 10
    },
    itemWidth: 12,
    itemHeight: 8
  },
  color: ['#0d4f3c', '#16a085', '#1abc9c', '#48c9b0', '#5dade2'],
  series: [
    {
      id: 'road',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['40%', '50%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: roadData.map(item => ({
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
          shadowColor: 'rgba(22, 160, 133, 0.5)'
        },
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#16a085'
        }
      },
      label: {
        show: true,
        formatter: function(params: any) {
          return `${params.name}\n${params.percent}%`
        },
        fontSize: 10,
        color: '#16a085'
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
      const roadInfo = roadData.find(item => item.name === data.name)
      return `${data.name}<br/>长度: ${(data.value / 1000).toFixed(1)}公里<br/>数量: ${roadInfo?.count}条`
    },
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#16a085',
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
      color: '#16a085',
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
    data: roadData.map(item => item.name).reverse(),
    axisLabel: {
      color: '#16a085',
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
    id: 'road',
    data: roadData.map((item, index) => ({
      value: item.length,
      itemStyle: {
        color: ['#0d4f3c', '#16a085', '#1abc9c', '#48c9b0', '#5dade2'][index]
      }
    })).reverse(),
    universalTransition: true,
    itemStyle: {
      borderRadius: [0, 4, 4, 0],
      shadowBlur: 3,
      shadowColor: 'rgba(22, 160, 133, 0.3)'
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 5,
        shadowColor: 'rgba(22, 160, 133, 0.5)'
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
.road-level-chart {
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
  font-size: 14px;
  font-weight: 600;
      color: #16a085;
}

.chart-container {
  width: 100%;
  height: calc(100% - 50px);
  min-height: 230px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .road-level-chart {
    width: 300px;
    height: calc(50vh - 40px);
    top: 15px;
    left: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>
