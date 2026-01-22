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

// ===================== 原有工具函数：线性回归 =====================
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

// ===================== SARIMA预测模块（基于JSON参数） =====================
// SARIMA参数类型定义
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

// 全局SARIMA参数（修正默认值为JSON文件中的正确值）
const sarimaParams = ref<SARIMAParams>({
  order: { p: 1, d: 1, q: 1 },
  seasonal_order: { P: 0, D: 1, Q: 1, S: 7 }, // 修正默认值
  ar_params: [],
  ma_params: [],
  seasonal_ar_params: [],
  seasonal_ma_params: [],
  intercept: 0
});

// 加载SARIMA参数文件
const loadSARIMAParams = async () => {
  console.log("【SARIMA】开始加载参数文件...");
  try {
    let paramsPath: string;
    
    // 适配Electron/Web环境路径
    if (window.electronAPI) {
      console.log("【SARIMA】当前为Electron环境");
      try {
        const appPath = await window.electronAPI.getAppPath();
        paramsPath = `file://${appPath}/public/models/arima/sarima_params.json`;
      } catch (e) {
        paramsPath = './models/arima/sarima_params.json';
      }
    } else {
      console.log("【SARIMA】当前为Web环境");
      paramsPath = '/models/arima/sarima_params.json';
    }

    // 验证文件可访问性
    const response = await fetch(paramsPath);
    if (!response.ok) {
      throw new Error(`参数文件加载失败，状态码：${response.status}`);
    }
    
    // 解析JSON参数（增加异常捕获）
    let paramsData: any = {};
    try {
      paramsData = await response.json();
    } catch (e) {
      throw new Error(`JSON解析失败：${(e as Error).message}`);
    }
    
    // 合并参数（使用默认值兜底，确保数值类型正确）
    sarimaParams.value = {
      // 默认值（与JSON文件一致）
      order: { p: 1, d: 1, q: 1 },
      seasonal_order: { P: 0, D: 1, Q: 1, S: 7 },
      ar_params: [],
      ma_params: [],
      seasonal_ar_params: [],
      seasonal_ma_params: [],
      intercept: 0,
      // 覆盖为加载的值（空值保护+强制数值转换）
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

    console.log("✅ 【SARIMA】参数加载成功：", {
      order: `${sarimaParams.value.order.p},${sarimaParams.value.order.d},${sarimaParams.value.order.q}`,
      seasonal_order: `${sarimaParams.value.seasonal_order.P},${sarimaParams.value.seasonal_order.D},${sarimaParams.value.seasonal_order.Q},${sarimaParams.value.seasonal_order.S}`,
      ar_params: sarimaParams.value.ar_params,
      ma_params: sarimaParams.value.ma_params,
      seasonal_ma_params: sarimaParams.value.seasonal_ma_params
    });

  } catch (error) {
    console.error("❌ 【SARIMA】参数加载失败详情：", error);
    ElMessage.warning(`SARIMA参数加载失败，使用默认参数：${(error as Error).message}`);
    // 保持默认参数不变
  }
};

// 差分运算（d阶差分）
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

// 逆差分运算（恢复d阶差分）- 修正初始值逻辑
const inverseDifference = (data: number[], diffData: number[], d: number): number[] => {
  let invData = [...diffData];
  for (let i = 0; i < d; i++) {
    const newInv = [data[data.length - 1]]; // 修正：使用最后一个原始值作为初始值
    for (let j = 0; j < invData.length; j++) {
      newInv.push(newInv[j] + invData[j]);
    }
    invData = newInv.slice(1);
  }
  return invData;
};

// 季节差分运算
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

// 逆季节差分运算 - 修正初始值逻辑
const inverseSeasonalDifference = (data: number[], diffData: number[], D: number, S: number): number[] => {
  let invData = [...diffData];
  for (let i = 0; i < D; i++) {
    const newInv = [...data.slice(-S)]; // 最后S个原始值
    for (let j = 0; j < invData.length; j++) {
      newInv.push(newInv[j] + invData[j]);
    }
    invData = newInv.slice(S);
  }
  return invData;
};

// SARIMA核心预测函数 - 修复MA项计算逻辑
const sarimaPredict = async (data: number[], predictDays: number): Promise<number[]> => {
  console.log("【SARIMA】预测输入：", { data, predictDays });

  // 提取参数（增加空值保护）
  const { 
    order = { p: 1, d: 1, q: 1 },
    seasonal_order = { P: 0, D: 1, Q: 1, S: 7 },
    ar_params = [], 
    ma_params = [], 
    seasonal_ar_params = [], 
    seasonal_ma_params = [], 
    intercept = 0
  } = sarimaParams.value;

  // 解构参数（强制类型转换）
  const p = Number(order.p) || 1;
  const d = Number(order.d) || 1;
  const q = Number(order.q) || 1;
  const P = Number(seasonal_order.P) || 0; // 修正默认值为0
  const D = Number(seasonal_order.D) || 1;
  const Q = Number(seasonal_order.Q) || 1;
  const S = Number(seasonal_order.S) || 7;

  // 校验数据长度（至少需要季节周期长度）
  const minLen = Math.max(S, p + P * S);
  if (data.length < minLen) {
    const errorMsg = `【SARIMA】数据长度不足，至少需要${minLen}个数据（当前：${data.length}）`;
    console.error(errorMsg);
    ElMessage.error(errorMsg);
    return [];
  }

  try {
    let predictions: number[] = [];
    let currentData = [...data]; // 复制原始数据用于滚动预测
    // 初始化残差数组（用于MA项计算）
    let residuals = Array(q).fill(0);
    // 初始化季节残差数组
    let seasonalResiduals = Array(Q * S).fill(0);

    // 逐天预测
    for (let step = 0; step < predictDays; step++) {
      // 1. 计算AR项（自回归项）
      let arTerm = 0;
      for (let i = 0; i < ar_params.length && i < currentData.length; i++) {
        arTerm += ar_params[i] * currentData[currentData.length - 1 - i];
      }

      // 2. 计算季节AR项
      let seasonalArTerm = 0;
      for (let i = 0; i < seasonal_ar_params.length; i++) {
        const lag = (i + 1) * S;
        if (currentData.length > lag) {
          seasonalArTerm += seasonal_ar_params[i] * currentData[currentData.length - 1 - lag];
        }
      }

      // 3. 计算MA项（移动平均项）- 修复：使用残差数组而非预测误差
      let maTerm = 0;
      for (let i = 0; i < ma_params.length && i < residuals.length; i++) {
        maTerm += ma_params[i] * residuals[residuals.length - 1 - i];
      }

      // 4. 计算季节MA项 - 修复：正确计算滞后索引
      let seasonalMaTerm = 0;
      for (let i = 0; i < seasonal_ma_params.length; i++) {
        const lagIndex = seasonalResiduals.length - 1 - i;
        if (lagIndex >= 0) {
          seasonalMaTerm += seasonal_ma_params[i] * seasonalResiduals[lagIndex];
        }
      }

      // 5. 计算基础预测值
      let predValue = intercept + arTerm + seasonalArTerm + maTerm + seasonalMaTerm;

      // 6. 应用差分逆变换（如果有差分阶数）
      if (d > 0 || D > 0) {
        // 简化的逆差分处理
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

      // 7. 确保预测值非负
      predValue = Math.max(0, Number(predValue.toFixed(2)));
      
      // 8. 更新残差数组（用于下一次预测的MA项计算）
      const residual = predValue - (currentData[currentData.length - 1] || 0);
      residuals.push(residual);
      if (residuals.length > q) residuals.shift();
      
      // 9. 更新季节残差数组
      seasonalResiduals.push(residual);
      if (seasonalResiduals.length > Q * S) seasonalResiduals.shift();
      
      // 10. 保存预测结果并更新当前数据
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

// ===================== LSTM（TFJS）预测函数 =====================
let lstmModel: tf.LayersModel | null = null

// 加载LSTM模型
const loadLSTMModel = async () => {
  console.log("【LSTM】开始加载模型...")
  try {
    let modelPath: string
    if (window.electronAPI) {
      console.log("【LSTM】当前为Electron环境")
      try {
        const appPath = await window.electronAPI.getAppPath()
        modelPath = `file://${appPath}/models/consumable-lstm-model/model.json`
        console.log("【LSTM】Electron模型路径：", modelPath)
      } catch (e) {
        modelPath = './models/consumable-lstm-model/model.json'
        console.log("【LSTM】Electron降级路径：", modelPath)
      }
    } else {
      modelPath = '/models/consumable-lstm-model/model.json'
      console.log("【LSTM】Web端模型路径：", modelPath)
    }
    
    const testResponse = await fetch(modelPath)
    if (!testResponse.ok) throw new Error(`模型文件访问失败，状态码：${testResponse.status}`)
    console.log("【LSTM】模型配置文件可访问")

    lstmModel = await tf.loadLayersModel(modelPath)
    console.log("✅ 【LSTM】模型加载成功")
  } catch (error) {
    console.error("❌ 【LSTM】模型加载失败详情：", error)
    ElMessage.error(`LSTM模型加载失败：${(error as Error).message}`)
  }
}

// LSTM预测核心函数
const lstmPredict = async (data: number[], predictDays: number): Promise<number[]> => {
  console.log("【LSTM】预测输入：", { data, predictDays })
  
  if (data.length < 7) {
    const errorMsg = "【LSTM】数据长度不足，至少需要7天历史数据"
    console.error(errorMsg)
    ElMessage.error(errorMsg)
    return []
  }
  
  if (!lstmModel) {
    const errorMsg = "【LSTM】模型未加载完成"
    console.error(errorMsg)
    ElMessage.error(errorMsg)
    await loadLSTMModel()
    if (!lstmModel) return []
  }

  try {
    const seqLen = 7
    let inputSeq = [...data.slice(-seqLen)]
    console.log("【LSTM】初始输入序列：", inputSeq)
    
    const predictions: number[] = []
    
    for (let i = 0; i < predictDays; i++) {
      console.log(`【LSTM】第${i+1}次预测，当前序列：`, inputSeq)
      
      const input = tf.tensor2d(inputSeq, [1, seqLen]).reshape([1, seqLen, 1])
      console.log(`【LSTM】输入张量形状：`, input.shape)
      
      const predTensor = lstmModel.predict(input) as tf.Tensor
      const predData = await predTensor.data()
      const predValue = Number(predData[0].toFixed(2))
      console.log(`【LSTM】第${i+1}次预测值：`, predValue)
      
      predictions.push(predValue)
      
      inputSeq.shift()
      inputSeq.push(predValue)
      
      input.dispose()
      predTensor.dispose()
      console.log(`【LSTM】第${i+1}次预测后内存释放完成`)
    }
    
    console.log("✅ 【LSTM】最终预测结果：", predictions)
    return predictions
  } catch (error) {
    console.error("❌ 【LSTM】预测过程出错：", error)
    ElMessage.error(`LSTM预测失败：${(error as Error).message}`)
    return []
  }
}

// ===================== 页面状态与方法 =====================
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

// onMounted初始化
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

// 销毁资源
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
      // 安全获取参数
      const S = sarimaParams.value?.seasonal_order?.S ?? 7;
      const p = sarimaParams.value?.order?.p ?? 1;
      const P = sarimaParams.value?.seasonal_order?.P ?? 0; // 修正默认值为0
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
    console.log("【页面】表格数据：", resultTableData.value)
    
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

// 核心优化：更新图表（折线不断连+简化样式）
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

  // 关键优化1：合并历史+预测数据，实现折线连续
  const allData = [...historyData, ...predictions]
  // 关键优化2：统一X轴标签（历史+预测）
  const allLabels = allData.map((_, i) => `${i + 1}天`)
  
  // 关键优化3：拆分系列数据（历史数据全量，预测数据从历史最后一位开始）
  const historySeriesData = allData.map((v, i) => i < historyData.length ? v : null)
  const predictSeriesData = allData.map((v, i) => i >= historyData.length ? v : null)

  const option: echarts.EChartsOption = {
    // 简化tooltip，只保留核心信息
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
    // 隐藏图例（如需保留可注释）
    legend: {
      show: false
    },
    // 简化网格，只保留必要内边距
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
      // 简化X轴样式
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#666' }
    },
    yAxis: {
      type: 'value',
      // 简化Y轴样式
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#666', formatter: '{value}' },
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      // 自适应Y轴范围
      min: Math.floor(Math.min(...allData) * 0.9),
      max: Math.ceil(Math.max(...allData) * 1.1)
    },
    series: [
      {
        name: '历史出库量',
        type: 'line',
        data: historySeriesData,
        // 关键优化4：只保留点和线，移除所有多余装饰
        symbol: 'circle', // 圆点标记
        symbolSize: 4,    // 标记大小
        symbolKeepAspect: true,
        // 线样式
        lineStyle: {
          color: '#409EFF', // 历史数据蓝色
          width: 2,         // 线宽
          type: 'solid'     // 实线
        },
        // 点样式
        itemStyle: {
          color: '#409EFF',
          borderColor: '#fff',
          borderWidth: 1
        },
        // 隐藏区域填充
        areaStyle: { show: false },
        // 禁用平滑（如需平滑可设为true）
        smooth: false
      },
      {
        name: '预测出库量',
        type: 'line',
        data: predictSeriesData,
        // 只保留点和线
        symbol: 'circle',
        symbolSize: 4,
        symbolKeepAspect: true,
        // 预测数据线样式（红色虚线）
        lineStyle: {
          color: '#F56C6C', // 预测数据红色
          width: 2,
          type: 'dashed'    // 虚线区分预测
        },
        itemStyle: {
          color: '#F56C6C',
          borderColor: '#fff',
          borderWidth: 1
        },
        areaStyle: { show: false },
        smooth: false,
        // 关键优化5：连接历史最后一个点和预测第一个点
        connectNulls: true
      }
    ]
  }

  // 清空并强制设置新配置
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

/* 强制图表容器样式，确保渲染正常 */
:deep(.chart-container > div) {
  height: 350px !important;
  width: 100% !important;
  min-width: 300px !important;
}

/* 优化按钮间距 */
:deep(.el-button) {
  margin-right: 8px;
}
</style>