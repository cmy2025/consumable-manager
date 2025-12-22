/**
 * 纯TS实现简易时序预测（模拟LSTM效果，无任何第三方依赖）
 * 基于指数平滑+滑动窗口，适配耗材库存的周期性/非线性特征
 */
 export class LSTMPredictor {
    windowSize: number = 7; // 时间窗口（前7天预测后1天）
    alpha: number = 0.3; // 指数平滑系数（0-1，越大越重视近期数据）
    isTrained: boolean = false;
    smoothedData: number[] = []; // 平滑后的历史数据
  
    /**
     * 指数平滑预处理（模拟LSTM的特征提取）
     * @param data 原始历史数据
     * @returns 平滑后的数据
     */
    exponentialSmoothing(data: number[]): number[] {
      const smoothed: number[] = [data[0]]; // 初始值为第一个数据点
      for (let i = 1; i < data.length; i++) {
        smoothed.push(this.alpha * data[i] + (1 - this.alpha) * smoothed[i - 1]);
      }
      return smoothed;
    }
  
    /**
     * 训练模型（实际是预处理数据）
     * @param historyData 历史时序数据
     */
    train(historyData: number[]): void {
      if (historyData.length < this.windowSize + 1) {
        throw new Error(`历史数据量不足，至少需要${this.windowSize + 1}个数据点`);
      }
      // 指数平滑预处理
      this.smoothedData = this.exponentialSmoothing(historyData);
      this.isTrained = true;
    }
  
    /**
     * 批量预测（滑动窗口+加权平均，模拟LSTM的时序预测）
     * @param historyData 原始历史数据
     * @param predictDays 预测天数
     * @returns 预测结果
     */
    predictBatch(historyData: number[], predictDays: number): number[] {
      if (!this.isTrained) {
        throw new Error("模型未训练，请先调用train方法");
      }
  
      const predictions: number[] = [];
      // 合并原始数据和平滑数据，加权计算（模拟LSTM的多特征融合）
      const combinedData = historyData.map((val, idx) => {
        return idx < this.smoothedData.length 
          ? (val * 0.7 + this.smoothedData[idx] * 0.3) // 原始数据权重70%，平滑数据30%
          : val;
      });
  
      // 初始窗口：最后windowSize天的合并数据
      let windowData = combinedData.slice(-this.windowSize);
      
      // 迭代预测每一天
      for (let i = 0; i < predictDays; i++) {
        // 窗口内数据加权平均（近期数据权重更高）
        let weightedSum = 0;
        let weightSum = 0;
        windowData.forEach((val, idx) => {
          const weight = idx + 1; // 越新的数据权重越大（1-7）
          weightedSum += val * weight;
          weightSum += weight;
        });
        const predVal = weightedSum / weightSum;
  
        // 加入趋势修正（基于历史整体趋势）
        const trend = this.calculateTrend(combinedData);
        const finalVal = predVal + trend;
  
        // 确保非负并取整
        const result = Math.max(0, Math.round(finalVal));
        predictions.push(result);
  
        // 滑动窗口：移除最旧数据，加入新预测值
        windowData.shift();
        windowData.push(result);
      }
  
      return predictions.map(num => Math.max(0, Math.round(Number(num))));
    }
  
    /**
     * 计算历史数据的整体趋势（模拟LSTM的趋势学习）
     * @param data 历史数据
     * @returns 趋势值（正=增长，负=下降）
     */
    private calculateTrend(data: number[]): number {
      if (data.length < 2) return 0;
      // 线性拟合计算趋势斜率
      const n = data.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
      // 趋势修正：斜率*0.5（避免过度预测）
      return slope * 0.5;
    }
  
    /**
     * 销毁模型（空方法，保持接口统一）
     */
    dispose(): void {
      this.smoothedData = [];
      this.isTrained = false;
    }
  }