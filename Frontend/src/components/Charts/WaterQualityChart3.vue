<template>
  <div class="water-quality-chart">
    <div class="chart-header">
      <h3>吴家山水质监测</h3>
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
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import * as echarts from 'echarts'
import { useThemeStore } from '@/stores/themeStore'
import { useRealTimeWaterQuality } from '@/composables/useRealTimeWaterQuality'

// 使用实时水质数据
const { data: waterQualityData } = useRealTimeWaterQuality('湖北省武汉市东西湖区吴家山')

// 计算时间序列数据
const timeSeriesData = computed(() => {
  const latestData = waterQualityData.value.slice(-20) // 取最近20个数据点
  
  return {
    times: latestData.map(item => item.time),
    waterTemperature: latestData.map(item => item.water_temperature),
    phValue: latestData.map(item => item.ph_value),
    dissolvedOxygen: latestData.map(item => item.dissolved_oxygen),
    turbidity: latestData.map(item => item.turbidity),
    permanganateIndex: latestData.map(item => item.permanganate_index),
    ammoniaNitrogen: latestData.map(item => item.ammonia_nitrogen),
    totalPhosphorus: latestData.map(item => item.total_phosphorus),
    totalNitrogen: latestData.map(item => item.total_nitrogen),
    chlorophyllA: latestData.map(item => item.chlorophyll_a),
    algaeDensity: latestData.map(item => item.algae_density / 1000000) // 转换为百万单位
  }
})

// 计算饼图数据（最新时间点的各指标值）
const pieData = computed(() => {
  if (waterQualityData.value.length === 0) return []
  
  const latestData = waterQualityData.value[waterQualityData.value.length - 1]
  
  return [
    { name: '水温(°C)', value: latestData.water_temperature },
    { name: 'pH值', value: latestData.ph_value },
    { name: '溶解氧(mg/L)', value: latestData.dissolved_oxygen },
    { name: '浊度(NTU)', value: latestData.turbidity },
    { name: '高锰酸盐指数(mg/L)', value: latestData.permanganate_index },
    { name: '氨氮(mg/L)', value: latestData.ammonia_nitrogen },
    { name: '总磷(mg/L)', value: latestData.total_phosphorus },
    { name: '总氮(mg/L)', value: latestData.total_nitrogen },
    { name: '叶绿素a(mg/L)', value: latestData.chlorophyll_a },
    { name: '藻密度(百万个/L)', value: latestData.algae_density / 1000000 }
  ]
})

const chartContainer = ref<HTMLElement>()
const chartType = ref<'pie' | 'bar'>('pie')
let chartInstance: echarts.ECharts | null = null
const themeStore = useThemeStore()

// 饼图配置选项（显示最新时间点的各指标分布）
const pieOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: function(params: any) {
      const percent = params.percent
      let unit = ''
      if (params.name.includes('水温')) unit = '°C'
      else if (params.name.includes('pH')) unit = ''
      else if (params.name.includes('溶解氧')) unit = 'mg/L'
      else if (params.name.includes('浊度')) unit = 'NTU'
      else if (params.name.includes('高锰酸盐')) unit = 'mg/L'
      else if (params.name.includes('氨氮')) unit = 'mg/L'
      else if (params.name.includes('总磷')) unit = 'mg/L'
      else if (params.name.includes('总氮')) unit = 'mg/L'
      else if (params.name.includes('叶绿素')) unit = 'mg/L'
      else if (params.name.includes('藻密度')) unit = '百万个/L'
      
      return `${params.name}<br/>${params.value.toFixed(3)}${unit} (${percent}%)`
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
    right: '2%',
    bottom: '2%',
    textStyle: {
      color: '#1890ff',
      fontSize: 11,
      fontWeight: 'bold'
    },
    itemWidth: 12,
    itemHeight: 8
  },
  color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff', '#1890ff', '#40a9ff'],
  series: [
    {
      id: 'waterQuality',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['50%', '45%'],
      animationDurationUpdate: 1000,
      universalTransition: true,
      data: pieData.value,
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
}))

// 柱状图配置选项
const barOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: function(params: any) {
      let result = `${params[0].name}<br/>`
      params.forEach((param: any) => {
        let unit = ''
        if (param.seriesName.includes('水温')) unit = '°C'
        else if (param.seriesName.includes('pH')) unit = ''
        else if (param.seriesName.includes('溶解氧')) unit = 'mg/L'
        else if (param.seriesName.includes('浊度')) unit = 'NTU'
        else if (param.seriesName.includes('高锰酸盐')) unit = 'mg/L'
        else if (param.seriesName.includes('氨氮')) unit = 'mg/L'
        else if (param.seriesName.includes('总磷')) unit = 'mg/L'
        else if (param.seriesName.includes('总氮')) unit = 'mg/L'
        else if (param.seriesName.includes('叶绿素')) unit = 'mg/L'
        else if (param.seriesName.includes('藻密度')) unit = '百万个/L'
        
        result += `${param.marker}${param.seriesName}: ${param.value.toFixed(3)}${unit}<br/>`
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
    top: '2%',
    textStyle: {
      color: '#1890ff',
      fontSize: 12,
      fontWeight: 'bold'
    },
    itemWidth: 12,
    itemHeight: 8
  },
  color: ['#001529', '#002766', '#003a8c', '#0050b3', '#096dd9', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff', '#1890ff', '#40a9ff'],
  grid: {
    left: '3%',
    right: '4%',
    bottom: '5%',
    top: '20%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: timeSeriesData.value.times,
    axisLabel: {
      color: '#1890ff',
      fontSize: 12,
      fontWeight: 'bold',
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
      color: '#1890ff',
      fontSize: 13,
      fontWeight: 'bold',
      formatter: function(value: number) {
        return value.toFixed(2)
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
      name: '水温(°C)',
      type: 'bar',
      stack: 'waterQuality',
      id: 'waterQuality',
      data: timeSeriesData.value.waterTemperature,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: 'pH值',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.phValue,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '溶解氧(mg/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.dissolvedOxygen,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '浊度(NTU)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.turbidity,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '高锰酸盐指数(mg/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.permanganateIndex,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '氨氮(mg/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.ammoniaNitrogen,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '总磷(mg/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.totalPhosphorus,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '总氮(mg/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.totalNitrogen,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '叶绿素a(mg/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.chlorophyllA,
      universalTransition: true,
      itemStyle: {
        borderRadius: [0, 0, 0, 0]
      }
    },
    {
      name: '藻密度(百万个/L)',
      type: 'bar',
      stack: 'waterQuality',
      data: timeSeriesData.value.algaeDensity,
      universalTransition: true,
      itemStyle: {
        borderRadius: [4, 4, 0, 0]
      }
    }
  ]
}))

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
  
  const option = chartType.value === 'pie' ? pieOption.value : barOption.value
  chartInstance.setOption(option, true)
}

// 初始化图表
const initChart = async () => {
  if (!chartContainer.value) return
  
  // 初始化图表实例
  chartInstance = echarts.init(chartContainer.value)
  
  // 设置初始选项（默认显示饼图）
  chartInstance.setOption(pieOption.value)
  
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

// 监听数据变化
const handleDataChange = () => {
  if (chartInstance) {
    updateChart()
  }
}

onMounted(async () => {
  await nextTick()
  initChart()
  
  // 监听主题变化
  themeStore.$subscribe(handleThemeChange)
  
  // 监听数据变化
  watch(waterQualityData, handleDataChange, { deep: true })
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
.water-quality-chart {
  position: absolute;
  top: 10px;
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
  .water-quality-chart {
    width: 300px;
    height: calc(50vh - 40px);
    top: 10px;
    right: 15px;
  }
  
  .chart-container {
    min-height: calc(50vh - 90px);
  }
}
</style>