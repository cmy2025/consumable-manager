/**
 * 纯TS实现简易ARIMA模型（差分自回归移动平均）
 * 基于差分+自回归，适用于具有短期相关性的时序数据
 */
 export class ARIMAPredictor {
    p: number = 1; // 自回归项数
    d: number = 1; // 差分次数
    q: number = 1; // 移动平均项数
    isTrained: boolean = false;
    historyData: number[] = [];
    differencedData: number[] = []; // 差分后的数据
    arCoefficients: number[] = []; // 自回归系数
    maCoefficients: number[] = []; // 移动平均系数
  
    /**
     * 计算差分（d阶）
     * @param data 原始数据
     * @param d 差分阶数
     * @returns 差分后的数据
     */
    private differencing(data: number[], d: number): number[] {
      let result = [...data];
      for (let i = 0; i < d; i++) {
        const diff: number[] = [];
        for (let j = 1; j < result.length; j++) {
          diff.push(result[j] - result[j - 1]);
        }
        result = diff;
      }
      return result;
    }
  
    /**
     * 计算逆差分（还原差分数据）
     * @param differenced 差分数据
     * @param original 原始数据（用于还原）
     * @param d 差分阶数
     * @returns 还原后的数据
     */
    private inverseDifferencing(differenced: number[], original: number[], d: number): number[] {
      let result = [...differenced];
      for (let i = 0; i < d; i++) {
        const invDiff: number[] = [original[original.length - d + i]];
        for (let j = 0; j < result.length; j++) {
          invDiff.push(invDiff[j] + result[j]);
        }
        result = invDiff;
      }
      return result;
    }
  
    /**
     * 训练ARIMA模型
     * @param historyData 历史数据（至少需要10个数据点）
     */
    train(historyData: number[]): void {
      if (historyData.length < 10) {
        throw new Error("ARIMA模型需要至少10个历史数据点");
      }
  
      this.historyData = [...historyData];
      // 计算d阶差分
      this.differencedData = this.differencing(historyData, this.d);
  
      // 简化版：计算自回归系数（使用滞后p阶的简单线性回归）
      this.arCoefficients = this.calculateARCoefficients();
      // 简化版：计算移动平均系数（使用误差项的简单平均）
      this.maCoefficients = this.calculateMACoefficients();
  
      this.isTrained = true;
    }
  
    /**
     * 计算自回归系数
     */
    private calculateARCoefficients(): number[] {
      const coeffs: number[] = [];
      // 简化实现：使用滞后1阶的系数为0.7（实际应通过最小二乘法计算）
      for (let i = 0; i < this.p; i++) {
        coeffs.push(0.7 / (i + 1));
      }
      return coeffs;
    }
  
    /**
     * 计算移动平均系数
     */
    private calculateMACoefficients(): number[] {
      const coeffs: number[] = [];
      // 简化实现：使用0.3的衰减系数
      for (let i = 0; i < this.q; i++) {
        coeffs.push(0.3 / (i + 1));
      }
      return coeffs;
    }
  
    /**
     * 批量预测
     * @param historyData 历史数据
     * @param predictDays 预测天数
     * @returns 预测结果
     */
    predictBatch(historyData: number[], predictDays: number): number[] {
      if (!this.isTrained) {
        throw new Error("模型未训练，请先调用train方法");
      }
  
      let predictions: number[] = [];
      let currentData = [...this.differencedData];
      const errors: number[] = []; // 误差项
  
      // 计算历史误差
      for (let i = 1; i < currentData.length; i++) {
        errors.push(currentData[i] - currentData[i - 1]);
      }
  
      // 迭代预测每一天
      for (let i = 0; i < predictDays; i++) {
        // 自回归部分
        let arSum = 0;
        for (let j = 0; j < this.p; j++) {
          const index = currentData.length - 1 - j;
          arSum += index >= 0 ? currentData[index] * this.arCoefficients[j] : 0;
        }
  
        // 移动平均部分
        let maSum = 0;
        for (let j = 0; j < this.q; j++) {
          const index = errors.length - 1 - j;
          maSum += index >= 0 ? errors[index] * this.maCoefficients[j] : 0;
        }
  
        // 差分空间的预测值
        const diffPred = arSum + maSum;
        currentData.push(diffPred);
        // 记录误差（使用最后一个误差的衰减值）
        errors.push(errors.length > 0 ? errors[errors.length - 1] * 0.9 : 0);
  
        // 逆差分得到实际预测值
        const tempPred = this.inverseDifferencing(
          currentData.slice(currentData.length - (i + 1)),
          this.historyData,
          this.d
        );
        predictions.push(tempPred[tempPred.length - 1]);
      }
  
      // 确保非负并取整
      return predictions.map(val => Math.max(0, Math.round(val)));
    }
  
    /**
     * 销毁模型
     */
    dispose(): void {
      this.historyData = [];
      this.differencedData = [];
      this.arCoefficients = [];
      this.maCoefficients = [];
      this.isTrained = false;
    }
  }