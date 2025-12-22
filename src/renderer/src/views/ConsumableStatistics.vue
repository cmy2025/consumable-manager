<template>
  <el-card>
    <el-form :model="queryForm" label-width="100px" style="margin-bottom: 16px; display: flex; flex-wrap: wrap;">
      <!-- 第一行 -->
      <el-form-item label="时间范围" style="width: 25%;">
        <el-date-picker
          v-model="queryForm.timeRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
      <el-form-item label="耗材ID" style="width: 25%;">
        <el-input v-model="queryForm.itemid" autocomplete="off" />
      </el-form-item>
      <el-form-item label="名称" style="width: 25%;">
        <el-input v-model="queryForm.name" autocomplete="off" />
      </el-form-item>
      <el-form-item label="操作者" style="width: 25%;">
        <el-input v-model="queryForm.operator" autocomplete="off" />
      </el-form-item>
      <!-- 第二行 -->
      <el-form-item label="出入库类型" style="width: 25%;">
        <el-select v-model="queryForm.type" placeholder="请选择类型">
          <el-option label="入库" value="入库" />
          <el-option label="出库" value="出库" />
          <el-option label="出入库" value="出入库" />
        </el-select>
      </el-form-item>
      <el-form-item label="耗材状态" style="width: 25%;">
        <el-input v-model="queryForm.status" autocomplete="off" />
      </el-form-item>
      <el-form-item label="时间粒度" style="width: 25%;">
        <el-select v-model="timeGranularity" placeholder="请选择时间粒度">
          <el-option label="按日" value="day" />
          <el-option label="按周" value="week" />
          <el-option label="按月" value="month" />
          <el-option label="按年" value="year" />
        </el-select>
      </el-form-item>
      <el-form-item style="width: 25%; display: flex; align-items: flex-end;">
        <el-button type="primary" @click="fetchStatistics">查询统计</el-button>
      </el-form-item>
    </el-form>

    <!-- 统计结果表格 -->
    <el-table
      v-loading="loading"
      :data="[statistics]"
      style="width: 1200%; margin-bottom: 20px"
      :cell-style="{ padding: '13px 0' }"
    >
      <el-table-column prop="totalInQuantity" label="入库总数量" />
      <el-table-column prop="totalOutQuantity" label="出库总数量" />
      <el-table-column prop="netChange" label="净变化量" />
    </el-table>

    <!-- 折线图容器 -->
    <div ref="chartRef" style="width: 100%; height: 400px"></div>

    <!-- 柱状图容器 -->
    <div ref="barChartRef" style="width: 100%; height: 400px"></div>

    <div class="back-button-container">
      <img src="../assets/exit.png" alt="返回" class="exit-icon" @click="goBack" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { apiService } from '../api/index'
import type { LineChartData } from '../types'
import dayjs from 'dayjs'

const router = useRouter()

const queryForm = ref({
  timeRange: [],
  itemid: '',
  name: '',
  operator: '',
  type: '',
  status: ''
})
const statistics = ref({
  totalInQuantity: 0,
  totalOutQuantity: 0,
  netChange: 0
})

const loading = ref(false)
const chartRef = ref<HTMLElement | null>(null)
const barChartRef = ref<HTMLElement | null>(null)
let myChart: echarts.ECharts | null = null
let myBarChart: echarts.ECharts | null = null
const timeGranularity = ref('day')

const fetchStatistics = async (): Promise<void> => {
  loading.value = true
  try {
    // 构建查询参数
    const query = {
      startTime: dayjs(queryForm.value.timeRange[0]).format('YYYY-MM-DD 00:00:00.000'),
      endTime: dayjs(queryForm.value.timeRange[1]).format('YYYY-MM-DD 23:59:59.999'),
      itemid: queryForm.value.itemid,
      name: queryForm.value.name,
      operator: queryForm.value.operator,
      type: queryForm.value.type,
      status: queryForm.value.status,
      timeGranularity: timeGranularity.value
    }

    console.log('发送的查询参数:', query)

    // 调用 API 获取统计数据
    const result = await apiService.getConsumableStatistics(query)
    console.log('统计结果:', result)

    // 获取折线图数据
    const lineChartData = (await apiService.getConsumableLineChartData(query)) as LineChartData
    console.log('折线图数据:', lineChartData)

    // 更新统计数据
    statistics.value = {
      totalInQuantity: lineChartData.inQuantities.reduce((acc, val) => acc + val, 0),
      totalOutQuantity: lineChartData.outQuantities.reduce((acc, val) => acc + val, 0),
      netChange:
        lineChartData.inQuantities.reduce((acc, val) => acc + val, 0) -
        lineChartData.outQuantities.reduce((acc, val) => acc + val, 0)
    }

    // 渲染折线图
    renderLineChart(lineChartData)
    // 渲染柱状图
    renderBarChart(lineChartData)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('查询统计失败: ' + errorMessage)
  }
  loading.value = false
}

// 渲染折线图
const renderLineChart = (data: LineChartData): void => {
  if (!chartRef.value) return

  // 初始化或获取图表实例
  if (!myChart) {
    myChart = echarts.init(chartRef.value)
  }

  // 构建图表配置
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['入库数量', '出库数量']
    },
    xAxis: {
      type: 'category',
      data: data.dates || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '入库数量',
        data: data.inQuantities || [],
        type: 'line',
        label: {
          show: true
        }
      },
      {
        name: '出库数量',
        data: data.outQuantities || [],
        type: 'line',
        label: {
          show: true
        }
      }
    ]
  }

  // 如果查询类型是"出入库"，添加总量系列
  if (queryForm.value.type === '出入库') {
    let legend = option.legend
    if (Array.isArray(legend)) {
      legend = legend[0]
    }
    if (!legend) {
      legend = { data: [] }
      option.legend = legend
    }
    if (!legend.data) {
      legend.data = []
    }
    legend.data.push('总量')

    if (!option.series) {
      option.series = []
    }
    if (Array.isArray(option.series)) {
      const totalQuantities = (data.inQuantities || []).map(
        (inQty: number, index: number) => inQty + (data.outQuantities || [])[index]
      )
      option.series.push({
        name: '总量',
        data: totalQuantities,
        type: 'line',
        label: {
          show: true
        }
      })
    }
  }

  // 设置图表配置
  myChart.setOption(option)
}

// 渲染柱状图
const renderBarChart = (data: LineChartData): void => {
  if (!barChartRef.value) return

  // 初始化或获取图表实例
  if (!myBarChart) {
    myBarChart = echarts.init(barChartRef.value)
  }

  // 构建图表配置
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['入库数量', '出库数量']
    },
    xAxis: {
      type: 'category',
      data: data.dates || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '入库数量',
        data: data.inQuantities || [],
        type: 'bar',
        label: {
          show: true,
          position: 'top'
        }
      },
      {
        name: '出库数量',
        data: data.outQuantities || [],
        type: 'bar',
        label: {
          show: true,
          position: 'top'
        }
      }
    ]
  }

  // 如果查询类型是"出入库"，添加总量系列
  if (queryForm.value.type === '出入库') {
    let legend = option.legend
    if (Array.isArray(legend)) {
      legend = legend[0]
    }
    if (!legend) {
      legend = { data: [] }
      option.legend = legend
    }
    if (!legend.data) {
      legend.data = []
    }
    legend.data.push('总量')

    if (!option.series) {
      option.series = []
    }
    if (Array.isArray(option.series)) {
      const totalQuantities = (data.inQuantities || []).map(
        (inQty: number, index: number) => inQty + (data.outQuantities || [])[index]
      )
      option.series.push({
        name: '总量',
        data: totalQuantities,
        type: 'bar',
        label: {
          show: true,
          position: 'top'
        }
      })
    }
  }

  // 设置图表配置
  myBarChart.setOption(option)
}

const goBack = (): void => {
  router.push('/')
}

// 窗口大小变化时重绘图表
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
  if (myBarChart) {
    myBarChart.dispose()
    myBarChart = null
  }
})

const handleResize = (): void => {
  if (myChart) {
    myChart.resize()
  }
  if (myBarChart) {
    myBarChart.resize()
  }
}
</script>

<style scoped>
.back-button-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

.exit-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
}
</style>