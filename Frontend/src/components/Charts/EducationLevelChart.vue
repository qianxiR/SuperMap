<template>
  <div class="education-level-chart">
    <div class="chart-header">
      <h3>武汉教育程度分布</h3>
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

// 教育程度数据（包含四个教育程度）
const educationData = [
  { name: '江岸区', 大学: 34858, 高中: 24651, 初中: 23282, 小学: 10903 },
  { name: '江汉区', 大学: 33040, 高中: 24656, 初中: 25773, 小学: 10781 },
  { name: '硚口区', 大学: 28447, 高中: 26511, 初中: 27947, 小学: 11208 },
  { name: '汉阳区', 大学: 31998, 高中: 23603, 初中: 25613, 小学: 11335 },
  { name: '武昌区', 大学: 45444, 高中: 21528, 初中: 18408, 小学: 9194 },
  { name: '青山区', 大学: 34614, 高中: 40135, 初中: 81808, 小学: 30237 },
  { name: '洪山区', 大学: 143818, 高中: 48183, 初中: 57006, 小学: 30668 },
  { name: '东西湖区', 大学: 26936, 高中: 22095, 初中: 28461, 小学: 14442 },
  { name: '蔡甸区', 大学: 15289, 高中: 18521, 初中: 37286, 小学: 20694 },
  { name: '江夏区', 大学: 37214, 高中: 15662, 初中: 23569, 小学: 15331 },
  { name: '黄陂区', 大学: 11656, 高中: 17266, 初中: 38049, 小学: 23148 },
  { name: '新洲区', 大学: 14485, 高中: 15597, 初中: 35367, 小学: 22965 },
  { name: '汉南区', 大学: 53349, 高中: 40644, 初中: 59687, 小学: 31244 }
]

// 获取区县名称列表
const districtNames = educationData.map(item => item.name)

// 计算各区县总教育程度人数
const districtTotalData = educationData.map(item => ({
  name: item.name,
  value: item.大学 + item.高中 + item.初中 + item.小学
}))

const chartContainer = ref<HTMLElement>()
const chartType = ref<'pie' | 'bar'>('pie')
let chartInstance: echarts.ECharts | null = null
const themeStore = useThemeStore()

// 获取当前主题的实际颜色值
const getThemeColor = (cssVar: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
}

// 饼图配置选项（显示各区县总教育程度人数分布）
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
  color: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff', '#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff'],
  series: [
    {
      id: 'education',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['50%', '40%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: districtTotalData,
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
      let result = `${params[0].name}<br/>`
      params.forEach((param: any) => {
        result += `${param.marker}${param.seriesName}: ${(param.value / 10000).toFixed(1)}万人<br/>`
      })
      return result
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
    bottom: '2%',
    textStyle: {
      color: '#1890ff',
      fontSize: 12,
      fontWeight: 'bold'
    },
    itemWidth: 12,
    itemHeight: 8
  },
  color: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff'],
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '5%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: districtNames,
    axisLabel: {
      color: '#0078D4',
      fontSize: 10,
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
  animationDurationUpdate: 1000,
  series: [
    {
      name: '大学(大专及以上)',
      type: 'bar',
      stack: 'education',
      id: 'education',
      data: educationData.map((item, index) => ({
        value: item.大学
      })),
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '高中(含中专)',
      type: 'bar',
      stack: 'education',
      data: educationData.map((item, index) => ({
        value: item.高中
      })),
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '初中',
      type: 'bar',
      stack: 'education',
      data: educationData.map((item, index) => ({
        value: item.初中
      })),
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '小学',
      type: 'bar',
      stack: 'education',
      data: educationData.map((item, index) => ({
        value: item.小学
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
      animationDuration: 1000,
      animationEasing: 'quadInOut' as any,
      animationDelay: (idx) => idx * 100
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
.education-level-chart {
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
  .education-level-chart {
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

