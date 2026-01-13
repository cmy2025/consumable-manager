import { spawn } from 'child_process';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// LSTM模型服务类（兼容桌面端/Web后端）
export class LSTMModel {
  private modelPath: string;
  private pythonScriptPath: string;

  constructor() {
    // 适配桌面端/Web后端的路径
    if (app) {
      // Electron桌面端路径
      this.modelPath = path.join(app.getAppPath(), 'models', 'consumable-lstm-model.h5');
      this.pythonScriptPath = path.join(app.getAppPath(), 'scripts', 'lstm_predict.py');
    } else {
      // Web后端路径
      this.modelPath = path.join(process.cwd(), 'models', 'consumable-lstm-model.h5');
      this.pythonScriptPath = path.join(process.cwd(), 'scripts', 'lstm_predict.py');
    }
  }

  // 预测函数（调用Python脚本）
  async predict(historyData: number[]): Promise<{ prediction: number; success: boolean }> {
    return new Promise((resolve, reject) => {
      // 检查Python脚本和模型是否存在
      if (!fs.existsSync(this.pythonScriptPath)) {
        reject(new Error(`Python脚本不存在：${this.pythonScriptPath}`));
        return;
      }
      if (!fs.existsSync(this.modelPath)) {
        reject(new Error(`LSTM模型不存在：${this.modelPath}`));
        return;
      }

      // 调用Python预测脚本
      const pythonProcess = spawn('python', [
        this.pythonScriptPath,
        JSON.stringify(historyData),  // 传入历史数据
        this.modelPath                // 传入模型路径
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python脚本执行失败：${error}`));
          return;
        }
        try {
          const res = JSON.parse(result);
          resolve({
            prediction: res.prediction,
            success: true
          });
        } catch (e) {
          reject(new Error(`解析预测结果失败：${e}`));
        }
      });
    });
  }

  // 销毁模型（空实现，保持和ARIMA模型接口一致）
  dispose(): void {
    // TFJS模型在前端销毁，后端仅需清理进程（此处简化）
  }
}