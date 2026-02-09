<template>
  <el-card class="prediction-card">
    <!-- 标题 -->
    <div slot="header" class="card-header">
      <span>耗材出库量预测</span>
    </div>

    <!-- 数据输入区域 -->
    <el-form :model="inputForm" label-width="120px" class="input-form">
      <el-form-item label="历史出库数据（逗号分隔）" prop="historyData">
        <el-input
          v-model="inputForm.historyData"
          type="textarea"
          :rows="5"
          placeholder="示例：8,10,12,9,11,13,7,14,12,15"
        />
      </el-form-item>
      <el-form-item label="预测方法">
        <el-radio-group v-model="inputForm.method" @change="resetPrediction">
          <el-radio label="linear">线性回归</el-radio>
          <el-radio label="arima">ARIMA</el-radio>
          <el-radio label="lstm">LSTM（深度学习）</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="预测未来天数">
        <el-input-number
          v-model="inputForm.predictDays"
          :min="1"
          :max="7"
          :step="1"
          value="1"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handlePredict" :loading="loading">
          开始预测
        </el-button>
        <el-button @click="resetForm">重置</el-button>
        <el-button 
          type="default" 
          @click="refreshChart" 
          v-if="predictionResult.length > 0"
          icon="el-icon-refresh"
        >
          刷新图表
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 预测结果展示 -->
    <div v-if="predictionResult.length > 0" class="result-section">
      <h4>预测结果</h4>
      <el-table :data="resultTableData" border style="width: 100%; margin-top: 10px;">
        <el-table-column
          prop="day"
          label="预测天数"
          align="center"
        />
        <el-table-column
          prop="value"
          label="预测出库量"
          align="center"
        />
      </el-table>

      <!-- 预测趋势图 -->
      <div class="chart-container" style="margin-top: 20px; height: 400px;">
        <h4>历史数据 + 预测趋势</h4>
        <div 
          ref="chartRef" 
          :key="chartKey"
          style="width: 100%; height: 350px;"
        ></div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as tf from '@tensorflow/tfjs'
import * as echarts from 'echarts'

// ===================== 线性回归预测函数 =====================
const linearRegression = (x: number[], y: number[], predictX: number[]): number[] => {
  console.log("【线性回归】输入数据：", { x, y, predictX })
  const xMean = x.reduce((a, b) => a + b, 0) / x.length
  const yMean = y.reduce((a, b) => a + b, 0) / y.length

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < x.length; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean)
    denominator += Math.pow(x[i] - xMean, 2)
  }
  const slope = numerator / denominator
  const intercept = yMean - slope * xMean

  const result = predictX.map(x => slope * x + intercept)
  console.log("【线性回归】预测结果：", result)
  return result
}

// ===================== SARIMA预测模块 =====================
interface SARIMAParams {
  order?: { p?: number; d?: number; q?: number };
  seasonal_order?: { P?: number; D?: number; Q?: number; S?: number };
  ar_params?: number[];
  ma_params?: number[];
  seasonal_ar_params?: number[];
  seasonal_ma_params?: number[];
  intercept?: number;
  sigma2?: number;
  train_last_values?: number[];
  train_last_date?: string;
  aic?: number;
  bic?: number;
  version?: string;
  train_time?: string;
}

const sarimaParams = ref<SARIMAParams>({
  order: { p: 1, d: 1, q: 1 },
  seasonal_order: { P: 0, D: 1, Q: 1, S: 7 },
  ar_params: [],
  ma_params: [],
  seasonal_ar_params: [],
  seasonal_ma_params: [],
  intercept: 0
});

const loadSARIMAParams = async () => {
  console.log("【SARIMA】开始加载参数文件...");
  try {
    let paramsPath: string;
    
    // 纯前端路径适配（无IPC）
    if (window.electronAPI) {
      console.log("【SARIMA】当前为Electron环境");
      // 使用import.meta.url拼接相对路径
      paramsPath = new URL(
        '../../public/models/arima/sarima_params.json',
        import.meta.url
      ).href;
    } else {
      console.log("【SARIMA】当前为Web环境");
      paramsPath = '/models/arima/sarima_params.json';
    }

    const response = await fetch(paramsPath);
    if (!response.ok) {
      throw new Error(`参数文件加载失败，状态码：${response.status}`);
    }
    
    let paramsData: any = {};
    try {
      paramsData = await response.json();
    } catch (e) {
      throw new Error(`JSON解析失败：${(e as Error).message}`);
    }
    
    sarimaParams.value = {
      order: { p: 1, d: 1, q: 1 },
      seasonal_order: { P: 0, D: 1, Q: 1, S: 7 },
      ar_params: [],
      ma_params: [],
      seasonal_ar_params: [],
      seasonal_ma_params: [],
      intercept: 0,
      ...paramsData,
      order: {
        p: Number(paramsData?.order?.p) ?? 1,
        d: Number(paramsData?.order?.d) ?? 1,
        q: Number(paramsData?.order?.q) ?? 1
      },
      seasonal_order: {
        P: Number(paramsData?.seasonal_order?.P) ?? 0,
        D: Number(paramsData?.seasonal_order?.D) ?? 1,
        Q: Number(paramsData?.seasonal_order?.Q) ?? 1,
        S: Number(paramsData?.seasonal_order?.S) ?? 7
      },
      ar_params: paramsData?.ar_params?.map(Number) ?? [],
      ma_params: paramsData?.ma_params?.map(Number) ?? [],
      seasonal_ar_params: paramsData?.seasonal_ar_params?.map(Number) ?? [],
      seasonal_ma_params: paramsData?.seasonal_ma_params?.map(Number) ?? [],
      intercept: Number(paramsData?.intercept) ?? 0
    };

    console.log("✅ 【SARIMA】参数加载成功：", sarimaParams.value);

  } catch (error) {
    console.error("❌ 【SARIMA】参数加载失败详情：", error);
    ElMessage.warning(`SARIMA参数加载失败，使用默认参数：${(error as Error).message}`);
  }
};

const difference = (data: number[], d: number): number[] => {
  let diffData = [...data];
  for (let i = 0; i < d; i++) {
    const newDiff = [];
    for (let j = 1; j < diffData.length; j++) {
      newDiff.push(diffData[j] - diffData[j - 1]);
    }
    diffData = newDiff;
  }
  return diffData;
};

const inverseDifference = (data: number[], diffData: number[], d: number): number[] => {
  let invData = [...diffData];
  for (let i = 0; i < d; i++) {
    const newInv = [data[data.length - 1]];
    for (let j = 0; j < invData.length; j++) {
      newInv.push(newInv[j] + invData[j]);
    }
    invData = newInv.slice(1);
  }
  return invData;
};

const seasonalDifference = (data: number[], D: number, S: number): number[] => {
  let diffData = [...data];
  for (let i = 0; i < D; i++) {
    const newDiff = [];
    for (let j = S; j < diffData.length; j++) {
      newDiff.push(diffData[j] - diffData[j - S]);
    }
    diffData = newDiff;
  }
  return diffData;
};

const inverseSeasonalDifference = (data: number[], diffData: number[], D: number, S: number): number[] => {
  let invData = [...diffData];
  for (let i = 0; i < D; i++) {
    const newInv = [...data.slice(-S)];
    for (let j = 0; j < invData.length; j++) {
      newInv.push(newInv[j] + invData[j]);
    }
    invData = newInv.slice(S);
  }
  return invData;
};

const sarimaPredict = async (data: number[], predictDays: number): Promise<number[]> => {
  console.log("【SARIMA】预测输入：", { data, predictDays });

  const { 
    order = { p: 1, d: 1, q: 1 },
    seasonal_order = { P: 0, D: 1, Q: 1, S: 7 },
    ar_params = [], 
    ma_params = [], 
    seasonal_ar_params = [], 
    seasonal_ma_params = [], 
    intercept = 0
  } = sarimaParams.value;

  const p = Number(order.p) || 1;
  const d = Number(order.d) || 1;
  const q = Number(order.q) || 1;
  const P = Number(seasonal_order.P) || 0;
  const D = Number(seasonal_order.D) || 1;
  const Q = Number(seasonal_order.Q) || 1;
  const S = Number(seasonal_order.S) || 7;

  const minLen = Math.max(S, p + P * S);
  if (data.length < minLen) {
    const errorMsg = `【SARIMA】数据长度不足，至少需要${minLen}个数据（当前：${data.length}）`;
    console.error(errorMsg);
    ElMessage.error(errorMsg);
    return [];
  }

  try {
    let predictions: number[] = [];
    let currentData = [...data];
    let residuals = Array(q).fill(0);
    let seasonalResiduals = Array(Q * S).fill(0);

    for (let step = 0; step < predictDays; step++) {
      let arTerm = 0;
      for (let i = 0; i < ar_params.length && i < currentData.length; i++) {
        arTerm += ar_params[i] * currentData[currentData.length - 1 - i];
      }

      let seasonalArTerm = 0;
      for (let i = 0; i < seasonal_ar_params.length; i++) {
        const lag = (i + 1) * S;
        if (currentData.length > lag) {
          seasonalArTerm += seasonal_ar_params[i] * currentData[currentData.length - 1 - lag];
        }
      }

      let maTerm = 0;
      for (let i = 0; i < ma_params.length && i < residuals.length; i++) {
        maTerm += ma_params[i] * residuals[residuals.length - 1 - i];
      }

      let seasonalMaTerm = 0;
      for (let i = 0; i < seasonal_ma_params.length; i++) {
        const lagIndex = seasonalResiduals.length - 1 - i;
        if (lagIndex >= 0) {
          seasonalMaTerm += seasonal_ma_params[i] * seasonalResiduals[lagIndex];
        }
      }

      let predValue = intercept + arTerm + seasonalArTerm + maTerm + seasonalMaTerm;

      if (d > 0 || D > 0) {
        const recentData = currentData.slice(-Math.max(d, D * S));
        let diffPred = [predValue];
        
        if (D > 0) {
          diffPred = inverseSeasonalDifference(recentData, diffPred, D, S);
        }
        if (d > 0) {
          diffPred = inverseDifference(recentData, diffPred, d);
        }
        
        predValue = diffPred[0];
      }

      predValue = Math.max(0, Number(predValue.toFixed(2)));
      
      const residual = predValue - (currentData[currentData.length - 1] || 0);
      residuals.push(residual);
      if (residuals.length > q) residuals.shift();
      
      seasonalResiduals.push(residual);
      if (seasonalResiduals.length > Q * S) seasonalResiduals.shift();
      
      predictions.push(predValue);
      currentData.push(predValue);

      console.log(`【SARIMA】第${step + 1}天预测值：${predValue}`);
    }

    console.log("✅ 【SARIMA】最终预测结果：", predictions);
    return predictions;

  } catch (error) {
    console.error("❌ 【SARIMA】预测过程出错：", error);
    ElMessage.error(`SARIMA预测失败：${(error as Error).message}`);
    return [];
  }
};

// ===================== LSTM预测模块（纯前端，无IPC） =====================
let lstmModel: tf.LayersModel | null = null

// 加载LSTM模型（纯前端路径适配）
const loadLSTMModel = async () => {
  console.log("【LSTM】开始加载模型（纯前端方案）")
  try {
    let modelPath: string
    if (window.electronAPI) {
      console.log("【LSTM】当前为Electron环境")
      // 核心：使用import.meta.url拼接相对路径（无IPC）
      modelPath = new URL(
        '../../public/models/consumable-lstm-model/model.json', 
        import.meta.url
      ).href;
      console.log("【LSTM】Electron模型路径：", modelPath)
    } else {
      // Web环境路径
      modelPath = '/models/consumable-lstm-model/model.json'
      console.log("【LSTM】Web端模型路径：", modelPath)
    }
    
    // 验证模型文件可访问
    const testResponse = await fetch(modelPath)
    if (!testResponse.ok) throw new Error(`模型文件访问失败，状态码：${testResponse.status}，路径：${modelPath}`)
    
    // 加载模型（增加超时控制）
    const loadPromise = tf.loadLayersModel(modelPath);
    const timeoutPromise = new Promise<tf.LayersModel>((_, reject) => {
      setTimeout(() => reject(new Error("模型加载超时（10秒）")), 10000);
    });
    lstmModel = await Promise.race([loadPromise, timeoutPromise]);
    console.log("✅ 【LSTM】模型加载成功，输入形状：", lstmModel.inputs[0].shape)
  } catch (error) {
    console.error("❌ 【LSTM】模型加载失败详情：", error)
    ElMessage.error(`LSTM模型加载失败：${(error as Error).message}`)
    lstmModel = null;
  }
}

// LSTM预测核心函数（纯前端张量运算）
const lstmPredict = async (data: number[], predictDays: number): Promise<number[]> => {
  console.log("【LSTM】预测输入：", { data, predictDays })
  
  // 数据长度校验
  if (data.length < 7) {
    const errorMsg = "【LSTM】数据长度不足，至少需要7天历史数据";
    console.error(errorMsg);
    ElMessage.error(errorMsg);
    return [];
  }
  
  // 模型加载校验（无IPC降级）
  if (!lstmModel) {
    const errorMsg = "【LSTM】模型未加载完成，尝试重新加载...";
    console.error(errorMsg);
    ElMessage.warning(errorMsg);
    await loadLSTMModel();
    if (!lstmModel) {
      ElMessage.error("【LSTM】模型加载失败，无法进行预测");
      return [];
    }
  }

  try {
    const seqLen = 7;
    // 数据清洗：替换NaN为0
    let inputSeq = [...data.slice(-seqLen)].map(v => isNaN(v) ? 0 : v);
    console.log("【LSTM】初始输入序列（清洗后）：", inputSeq)
    
    const predictions: number[] = []
    
    for (let i = 0; i < predictDays; i++) {
      console.log(`【LSTM】第${i+1}次预测，当前序列：`, inputSeq)
      
      // 张量运算（异常捕获+安全释放）
      let input: tf.Tensor | null = null;
      let predTensor: tf.Tensor | null = null;
      try {
        // 创建符合模型要求的张量：[1, 7, 1]
        input = tf.tensor2d(inputSeq, [1, seqLen]).reshape([1, seqLen, 1]);
        predTensor = lstmModel!.predict(input) as tf.Tensor;
        const predData = await predTensor.data();
        
        // 预测值清洗：NaN/负数处理
        let predValue = Number(predData[0].toFixed(2));
        predValue = isNaN(predValue) ? 0 : Math.max(0, predValue);
        console.log(`【LSTM】第${i+1}次预测值：${predValue}`)
        
        predictions.push(predValue);
        
        // 更新输入序列（滚动预测）
        inputSeq.shift();
        inputSeq.push(predValue);
      } catch (tensorErr) {
        console.error(`【LSTM】第${i+1}次预测张量运算失败：`, tensorErr);
        predictions.push(0); // 兜底值
      } finally {
        // 确保张量释放，避免内存泄漏
        if (input) input.dispose();
        if (predTensor) predTensor.dispose();
      }
    }
    
    console.log("✅ 【LSTM】最终预测结果：", predictions)
    return predictions;
  } catch (error) {
    console.error("❌ 【LSTM】预测过程出错：", error);
    ElMessage.error(`LSTM预测失败：${(error as Error).message}`);
    return [];
  }
}

// ===================== 页面状态与通用方法 =====================
const inputForm = reactive({
  historyData: '',
  method: 'linear',
  predictDays: 1
})

const loading = ref(false)
const predictionResult = ref<number[]>([])
const resultTableData = ref<{ day: string; value: number }[]>([])
const chartRef = ref<HTMLDivElement | null>(null)
let myChart: echarts.ECharts | null = null
const chartKey = ref(0)
const cacheChartData = ref<{ history: number[], predict: number[] }>({
  history: [],
  predict: []
})

// 销毁旧图表实例
const destroyChart = () => {
  if (myChart) {
    myChart.dispose()
    myChart = null
    console.log("【图表】旧实例已销毁")
  }
}

// 初始化图表
const initChart = (force = false) => {
  if (force) {
    destroyChart()
  }
  
  if (chartRef.value && !myChart) {
    myChart = echarts.init(chartRef.value)
    console.log("✅ 【图表】初始化完成")
    window.addEventListener('resize', () => {
      if (myChart) myChart.resize()
    })
  } else if (!chartRef.value) {
    console.warn("【图表】DOM元素未挂载，无法初始化")
  } else if (myChart && !force) {
    console.log("【图表】实例已存在，无需重复初始化")
  }
}

// 刷新图表方法
const refreshChart = async () => {
  console.log("【图表】开始刷新...")
  try {
    chartKey.value += 1
    await nextTick()
    initChart(true)
    if (cacheChartData.value.history.length > 0 && cacheChartData.value.predict.length > 0) {
      updateChart(cacheChartData.value.history, cacheChartData.value.predict)
      ElMessage.success("图表刷新成功！")
    } else {
      ElMessage.warning("无缓存数据，无法刷新图表")
    }
  } catch (error) {
    console.error("【图表】刷新失败：", error)
    ElMessage.error(`图表刷新失败：${(error as Error).message}`)
  }
}

// 监听chartRef变化
watch(chartRef, () => {
  initChart()
}, { immediate: true })

// 页面挂载初始化
onMounted(async () => {
  console.log("【页面】初始化开始")
  // 并行加载LSTM模型和SARIMA参数
  await Promise.all([
    loadLSTMModel(),
    loadSARIMAParams()
  ])
  await nextTick()
  initChart()
  console.log("【页面】初始化完成")
})

// 页面销毁清理资源
onUnmounted(() => {
  console.log("【页面】开始销毁资源")
  destroyChart()
  if (lstmModel) {
    lstmModel.dispose()
    console.log("【LSTM】模型已销毁")
  }
  tf.disposeVariables()
  console.log("【TFJS】张量已释放")
})

// 重置预测结果
const resetPrediction = () => {
  console.log("【页面】重置预测结果")
  predictionResult.value = []
  resultTableData.value = []
  cacheChartData.value = { history: [], predict: [] }
  destroyChart()
  chartKey.value += 1
}

// 重置表单
const resetForm = () => {
  console.log("【页面】重置表单")
  inputForm.historyData = ''
  inputForm.method = 'linear'
  inputForm.predictDays = 1
  resetPrediction()
}

// 处理预测逻辑
const handlePredict = async () => {
  console.log("【页面】开始预测流程")
  loading.value = true
  predictionResult.value = []
  resultTableData.value = []
  
  try {
    const historyStr = inputForm.historyData.trim()
    console.log("【页面】原始输入字符串：", historyStr)
    
    if (!historyStr) {
      throw new Error("请输入历史出库数据")
    }
    
    const historyData = historyStr
      .split(',')
      .map(item => {
        const num = Number(item.trim())
        if (isNaN(num)) throw new Error(`无效数字：${item}`)
        return num
      })
    
    console.log("【页面】解析后的历史数据：", historyData)
    
    // 根据模型类型设置最小数据长度
    let minLen = 2;
    if (inputForm.method === 'lstm') {
      minLen = 7;
    } else if (inputForm.method === 'arima') {
      const S = sarimaParams.value?.seasonal_order?.S ?? 7;
      const p = sarimaParams.value?.order?.p ?? 1;
      const P = sarimaParams.value?.seasonal_order?.P ?? 0;
      minLen = Math.max(S, p + P * S);
    }
    
    if (historyData.length < minLen) {
      throw new Error(`${inputForm.method === 'lstm' ? 'LSTM' : (inputForm.method === 'arima' ? 'SARIMA' : '线性回归')}需要至少${minLen}个数据（当前：${historyData.length}）`)
    }
    
    const predictDays = inputForm.predictDays
    console.log("【页面】预测配置：", { method: inputForm.method, predictDays })
    
    let predictions: number[] = []
    switch (inputForm.method) {
      case 'linear':
        const x = historyData.map((_, index) => index + 1)
        const predictX = Array.from({ length: predictDays }, (_, i) => x.length + 1 + i)
        predictions = linearRegression(x, historyData, predictX)
        break
      case 'arima':
        predictions = await sarimaPredict(historyData, predictDays)
        break
      case 'lstm':
        predictions = await lstmPredict(historyData, predictDays)
        break
      default:
        throw new Error(`不支持的预测方法：${inputForm.method}`)
    }
    
    if (predictions.length === 0) {
      throw new Error("预测结果为空")
    }
    
    console.log("【页面】预测结果：", predictions)
    
    cacheChartData.value = {
      history: historyData,
      predict: predictions
    }
    
    predictionResult.value = predictions
    
    resultTableData.value = predictions.map((value, index) => ({
      day: `未来第${index + 1}天`,
      value: Number(value.toFixed(2))
    }))
    
    await nextTick()
    initChart(true)
    updateChart(historyData, predictions)
    
    ElMessage.success(`预测完成！共预测${predictDays}天`)
    
  } catch (error) {
    console.error("❌ 【页面】预测流程出错：", error)
    ElMessage.error(`预测失败：${(error as Error).message}`)
  } finally {
    loading.value = false
    console.log("【页面】预测流程结束")
  }
}

// 更新图表逻辑
const updateChart = (historyData: number[], predictions: number[]) => {
  console.log("【图表】更新图表，数据：", { historyData, predictions })
  
  if (!myChart) {
    console.warn("【图表】实例未初始化，尝试立即创建")
    initChart(true)
    if (!myChart) {
      console.error("【图表】初始化失败，无法更新图表")
      ElMessage.warning("图表初始化失败，无法显示趋势图")
      return
    }
  }

  // 合并历史+预测数据，实现折线连续
  const allData = [...historyData, ...predictions]
  const allLabels = allData.map((_, i) => `${i + 1}天`)
  
  const historySeriesData = allData.map((v, i) => i < historyData.length ? v : null)
  const predictSeriesData = allData.map((v, i) => i >= historyData.length ? v : null)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: 12 },
      formatter: (params: any[]) => {
        const day = params[0].axisValue
        const historyVal = params[0].value !== null ? params[0].value : '-'
        const predictVal = params[1].value !== null ? params[1].value : '-'
        return `第${day}：<br/>历史出库：${historyVal} 件<br/>预测出库：${predictVal} 件`
      }
    },
    legend: {
      show: false
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '6%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: allLabels,
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#666', formatter: '{value}' },
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      min: Math.floor(Math.min(...allData) * 0.9),
      max: Math.ceil(Math.max(...allData) * 1.1)
    },
    series: [
      {
        name: '历史出库量',
        type: 'line',
        data: historySeriesData,
        symbol: 'circle',
        symbolSize: 4,
        symbolKeepAspect: true,
        lineStyle: {
          color: '#409EFF',
          width: 2,
          type: 'solid'
        },
        itemStyle: {
          color: '#409EFF',
          borderColor: '#fff',
          borderWidth: 1
        },
        areaStyle: { show: false },
        smooth: false
      },
      {
        name: '预测出库量',
        type: 'line',
        data: predictSeriesData,
        symbol: 'circle',
        symbolSize: 4,
        symbolKeepAspect: true,
        lineStyle: {
          color: '#F56C6C',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#F56C6C',
          borderColor: '#fff',
          borderWidth: 1
        },
        areaStyle: { show: false },
        smooth: false,
        connectNulls: true
      }
    ]
  }

  myChart!.clear()
  myChart!.setOption(option, true)
  console.log("【图表】更新完成（折线连续+简化样式）")
}
</script>

<style scoped>
.prediction-card {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
}

.input-form {
  margin-bottom: 30px;
}

.card-header {
  font-size: 16px;
  font-weight: bold;
}

.result-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e6e6e6;
}

.chart-container {
  margin-top: 20px;
  height: 400px !important;
}

:deep(.chart-container > div) {
  height: 350px !important;
  width: 100% !important;
  min-width: 300px !important;
}

:deep(.el-button) {
  margin-right: 8px;
}
</style>