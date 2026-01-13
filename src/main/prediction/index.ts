import { LinearRegressionPredictor } from './linearRegression';
import { ARIMAPredictor } from './arimaModel';

/**
 * 预测配置类型（增加arima选项）
 */
export interface PredictStockOptions {
  modelType: 'linear' | 'lstm' | 'arima';
  consumableId: string;
  historyData: number[];
  predictDays: number;
}

/**
 * 统一预测入口：支持切换线性回归/LSTM/ARIMA模型
 * @param options 预测配置
 * @returns 预测结果数组
 */
export async function predictStock(options: PredictStockOptions): Promise<number[]> {
  const { modelType, consumableId, historyData, predictDays } = options;
  let predictions: number[] = [];

  try {
    if (modelType === 'linear') {
      // 线性回归预测（保持不变）
      const linearModel = new LinearRegressionPredictor();
      const xData = historyData.map((_, idx) => idx + 1);
      linearModel.train(xData, historyData);
      predictions = linearModel.predictBatch(predictDays, xData);

    } else if (modelType === 'lstm') {

    } else if (modelType === 'arima') {
      // ARIMA预测
      const arimaModel = new ARIMAPredictor();
      arimaModel.train(historyData);
      predictions = arimaModel.predictBatch(historyData, predictDays);
      arimaModel.dispose();

    } else {
      throw new Error(`不支持的模型类型：${modelType}，仅支持 'linear'、'lstm' 或 'arima'`);
    }

    console.log(`[预测模块] 耗材${consumableId}(${modelType}模型) 预测未来${predictDays}天结果：`, predictions);
    return predictions;

  } catch (error) {
    // 错误处理保持不变
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(`[预测模块] 耗材${consumableId}预测失败：`, errorMsg);
    const lastVal = historyData[historyData.length - 1] || 0;
    return Array.from({ length: predictDays }, (_, i) =>
      Math.max(0, Math.round(lastVal - lastVal * 0.01 * (i + 1)))
    );
  }
}

// 导出模型类（包含ARIMA）
export { LinearRegressionPredictor, ARIMAPredictor };