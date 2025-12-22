<template>
  <el-card class="prediction-card">
    <div class="page-title">耗材库存预测</div>
    
    <el-form :model="predictionForm" label-width="120px" class="prediction-form">
      <!-- 基本信息 -->
      <el-form-item label="耗材ID" prop="consumableId">
        <el-input v-model="predictionForm.consumableId" placeholder="请输入耗材ID" />
      </el-form-item>
      
      <!-- 模型选择 -->
      <el-form-item label="预测模型" prop="modelType">
        <el-radio-group v-model="predictionForm.modelType">
          <el-radio label="linear">线性回归</el-radio>
          <el-radio label="lstm">LSTM (模拟)</el-radio>
          <el-radio label="arima">ARIMA</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 预测天数 -->
      <el-form-item label="预测天数" prop="predictDays">
        <el-select v-model="predictionForm.predictDays" placeholder="请选择预测天数">
          <el-option label="7天" value="7" />
          <el-option label="30天" value="30" />
          <el-option label="365天" value="365" />
        </el-select>
      </el-form-item>
      
      <!-- 历史数据输入 -->
      <el-form-item label="历史数据" prop="historyData">
        <el-input 
          v-model="historyDataText" 
          type="textarea" 
          rows="5"
          placeholder="请输入历史库存数据，用逗号分隔（例如：100,95,90,85,80）" 
        />
        <div class="form-hint">提示：至少需要输入2个数据点（线性回归）或8个数据点（LSTM）</div>
      </el-form-item>
      
      <!-- 操作按钮 -->
      <el-form-item>
        <el-button 
          type="primary" 
          @click="handlePredict" 
          :loading="loading"
        >
          开始预测
        </el-button>
        <el-button 
          type="info" 
          @click="handleClear" 
          style="margin-left: 10px"
        >
          清空
        </el-button>
      </el-form-item>
    </el-form>
    
    <!-- 预测结果 -->
    <div v-if="predictionResult.length > 0" class="prediction-result">
      <div class="result-title">预测结果</div>
      
      <!-- 结果图表 -->
      <div class="chart-container">
        <div ref="chartRef" class="chart" />
      </div>
      
      <!-- 结果数据表格 -->
      <div class="table-wrapper">
        <el-table 
          :data="resultTableData" 
          border 
          class="result-table"
        >
          <el-table-column 
            prop="date" 
            label="日期" 
            align="center"
            min-width="180"
          />
          <el-table-column 
            prop="value" 
            label="预测库存" 
            align="center"
            min-width="180"
          />
        </el-table>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { apiService } from '../api/index'
import dayjs from 'dayjs'

// 表单数据
const predictionForm = reactive({
  consumableId: '',
  modelType: 'linear', // 默认线性回归
  predictDays: '7',
  historyData: [] as number[]
})

// 文本框输入的历史数据
const historyDataText = ref('')

// 预测结果
const predictionResult = ref<number[]>([])
const resultTableData = ref<{ date: string; value: number }[]>([])

// 状态控制
const loading = ref(false)
let chartInstance: echarts.ECharts | null = null
const chartRef = ref<HTMLDivElement | null>(null)

// 监听历史数据文本变化
watch(historyDataText, (val) => {
  try {
    if (val.trim() === '') {
      predictionForm.historyData = []
      return
    }
    // 转换为数字数组
    const data = val.split(',').map(item => {
      const num = parseFloat(item.trim())
      if (isNaN(num) || num < 0) {
        throw new Error('数据格式错误')
      }
      return num
    })
    predictionForm.historyData = data
  } catch (error) {
    ElMessage.error('请输入有效的数字，用逗号分隔')
  }
})

// 处理预测
const handlePredict = async () => {
  // 表单验证
  if (!predictionForm.consumableId.trim()) {
    ElMessage.warning('请输入耗材ID')
    return
  }
  
  if (predictionForm.historyData.length < 2) {
    ElMessage.warning('请输入至少2个历史数据点')
    return
  }
  
  if (predictionForm.modelType === 'lstm' && predictionForm.historyData.length < 8) {
    ElMessage.warning('LSTM模型需要至少8个历史数据点')
    return
  }
   // 新增ARIMA模型的数据量校验（后端要求至少10个）
  if (predictionForm.modelType === 'arima' && predictionForm.historyData.length < 10) {
    ElMessage.warning('ARIMA模型需要至少10个历史数据点')
    return
  }
  
  try {
    loading.value = true
    
    // 调用后端预测接口
    const rawResult = await apiService.predictStock({
      modelType: predictionForm.modelType,
      consumableId: predictionForm.consumableId,
      historyData: predictionForm.historyData.map(Number),
      predictDays: parseInt(predictionForm.predictDays, 10)
    })
    
   // 🌟 智能解析：自动提取预测数组（核心适配逻辑）
    let predictData: number[] = [];
    // 情况1：已经是数组（桌面端）
    if (Array.isArray(rawResult)) {
      predictData = rawResult;
    } 
    // 情况2：Web端嵌套结构（{data: {success: true, data: []}}）
    else if (rawResult?.data?.data && Array.isArray(rawResult.data.data)) {
      predictData = rawResult.data.data;
    } 
    // 情况3：其他嵌套格式兜底
    else if (rawResult?.data && Array.isArray(rawResult.data)) {
      predictData = rawResult.data;
    }
    
    // 校验数据有效性
    if (!predictData.length) {
      ElMessage.error('未获取到有效预测数据');
      return;
    }
    
    // 处理预测结果
    predictionResult.value = predictData;
    console.log('统一后的预测数据:', predictData);
    
    // 生成表格+渲染图表
    generateResultTable();
    renderChart();
    
    ElMessage.success('预测成功')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '预测失败，请稍后重试'
    ElMessage.error(errorMsg)
    console.error('预测错误:', error)
  } finally {
    loading.value = false
  }
}

// 生成结果表格数据
const generateResultTable = () => {
  const tableData = []
  const today = dayjs()
  
  for (let i = 0; i < predictionResult.value.length; i++) {
    tableData.push({
      date: today.add(i + 1, 'day').format('YYYY-MM-DD'),
      value: Number(predictionResult.value[i].toFixed(2)) // 保留两位小数，避免数字过长
    })
  }
  
  resultTableData.value = tableData
}

// 渲染图表
const renderChart = () => {
  if (!chartRef.value) return
  
  // 初始化图表
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  
  // 准备图表数据
  const allValues = [...predictionForm.historyData]
  
  // 历史数据日期（过去的日期）
  const historyDates = predictionForm.historyData.map((_, index) => {
    return dayjs().subtract(predictionForm.historyData.length - index, 'day').format('MM-DD')
  })
  
  // 预测数据日期（未来的日期）
  const predictDates = predictionResult.value.map((_, index) => {
    return dayjs().add(index + 1, 'day').format('MM-DD')
  })
  
  // 合并历史和预测数据
  const allLabels = [...historyDates, ...predictDates]
  
  // 标记历史数据和预测数据的分割点
  const splitLine = historyDates.length
  
  // 图表配置
  const option = {
    title: {
      text: `${predictionForm.consumableId} 库存预测趋势`,
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['历史数据', '预测数据'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: allLabels
    },
    yAxis: {
      type: 'value',
      name: '库存数量',
      min: 0
    },
    series: [
      {
        name: '历史数据',
        type: 'line',
        data: allValues.slice(0, splitLine),
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2
        }
      },
      {
        name: '预测数据',
        type: 'line',
        data: [...allValues.slice(splitLine - 1), ...predictionResult.value],
        symbol: 'diamond',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#ff4d4f'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
            { offset: 1, color: 'rgba(255, 77, 79, 0)' }
          ])
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

// 清空表单
const handleClear = () => {
  predictionForm.consumableId = ''
  predictionForm.modelType = 'linear'
  predictionForm.predictDays = '7'
  predictionForm.historyData = []
  historyDataText.value = ''
  predictionResult.value = []
  resultTableData.value = []
  
  if (chartInstance) {
    chartInstance.clear()
  }
}

// 窗口大小变化时重绘图表
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.prediction-card {
  margin: 20px;
  padding: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.prediction-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-hint {
  color: #606266;
  font-size: 12px;
  margin-top: 5px;
}

.prediction-result {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #e6e6e6;
}

.result-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

/* 表格容器样式 */
.table-wrapper {
  width: 100%;
  overflow-x: auto; /* 确保在小屏幕上可以横向滚动 */
  margin-top: 20px;
}

/* 表格样式优化 */
.result-table {
  width: 100%;
  table-layout: fixed; /* 固定表格布局，防止列宽不一致 */
  min-width: 500px; /* 设置最小宽度 */
}

/* 表格单元格样式优化 */
::v-deep .el-table td,
::v-deep .el-table th {
  vertical-align: middle;
  padding: 12px 8px;
  text-align: center;
  white-space: nowrap; /* 防止内容换行导致行高变化 */
  overflow: hidden;
  text-overflow: ellipsis; /* 内容过长时显示省略号 */
}

/* 表头样式优化 */
::v-deep .el-table th {
  background-color: #f5f7fa;
  font-weight: 500;
}

/* 表格边框优化 */
::v-deep .el-table--border {
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

::v-deep .el-table--border th,
::v-deep .el-table--border td {
  border-right: 1px solid #ebeef5;
}

::v-deep .el-table--border::after,
::v-deep .el-table--group::after,
::v-deep .el-table::before {
  background-color: #ebeef5;
}


</style>