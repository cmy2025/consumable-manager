/**
 * 预测模型类型
 */
 export type ModelType = 'linear' | 'lstm' | 'arima';

 /**
  * 预测请求参数
  */
 export interface PredictRequest {
   consumableId: string;
   historyData: number[];
   predictDays: number;
   modelType: ModelType;
 }
 
 /**
  * 预测响应结果
  */
 export interface PredictResponse {
   success: boolean;
   data: number[];
   message: string;
 }