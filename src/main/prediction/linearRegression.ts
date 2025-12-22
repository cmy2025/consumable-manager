/**
 * 纯原生TS实现线性回归预测（无任何第三方依赖）
 * 适用于简单趋势预测，轻量、易解释
 */
 export class LinearRegressionPredictor {
  slope: number = 0; // 斜率 m
  intercept: number = 0; // 截距 b
  isTrained: boolean = false;

  /**
   * 训练线性回归模型
   * @param xData 自变量数组（如时间序列 [1,2,3,...]）
   * @param yData 因变量数组（如库存数据 [100,95,90,...]）
   */
  train(xData: number[], yData: number[]): void {
    if (xData.length !== yData.length || xData.length < 2) {
      throw new Error("训练数据长度不匹配或数据量不足（至少需要2组数据）");
    }

    const n = xData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    // 计算最小二乘法所需的求和项
    for (let i = 0; i < n; i++) {
      sumX += xData[i];
      sumY += yData[i];
      sumXY += xData[i] * yData[i];
      sumXX += xData[i] * xData[i];
    }

    // 计算斜率和截距
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
      throw new Error("数据存在共线性，无法训练线性回归模型");
    }

    this.slope = (n * sumXY - sumX * sumY) / denominator;
    this.intercept = (sumY - this.slope * sumX) / n;
    this.isTrained = true;
  }

  /**
   * 预测单个值
   * @param x 自变量（如预测第N天）
   * @returns 预测结果（非负）
   */
  predictSingle(x: number): number {
    if (!this.isTrained) {
      throw new Error("模型未训练，请先调用train方法");
    }
    return Math.max(0, Math.round(this.slope * x + this.intercept));
  }

  /**
   * 批量预测
   * @param predictDays 预测天数
   * @param historyX 历史自变量数组（用于确定预测起点）
   * @returns 预测结果数组
   */
  predictBatch(predictDays: number, historyX: number[]): number[] {
    const lastX = historyX[historyX.length - 1];
    const predictions: number[] = [];
    for (let i = 1; i <= predictDays; i++) {
      predictions.push(this.predictSingle(lastX + i));
    }
    return predictions.map(num => Math.max(0, Math.round(Number(num))));
  }
}