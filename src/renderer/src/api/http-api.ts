// src/renderer/src/api/http-api.ts - 使用 HTTP 的 API 服务 (Web 环境)
import axios from 'axios'
import type {
  ConsumableData,
  UpdateConsumableData,
  RecordData,
  RecordsQuery,
  RecordsDataQuery,
  StatisticsQuery,
  LineChartQuery
} from '../types'

// HTTP API 基础配置
const httpClient = axios.create({
  baseURL: '/api', // 通过代理访问后端
  timeout: 10000,
  withCredentials: true, // 允许携带Cookie
  headers: {
    'Content-Type': 'application/json'
  }
})
export const httpApiService = {
  // 获取耗材
  getConsumables: async (queryParams: Record<string, string> = {}) => {
    const response = await httpClient.get('/consumables', {
      params: queryParams
    })
    return response.data
  },

  // 添加耗材
  addConsumable: async (consumableData: ConsumableData) => {
    const response = await httpClient.post('/consumables', consumableData)
    return response.data
  },

  // 更新耗材
  updateConsumable: async (itemid: string, data: UpdateConsumableData) => {
    const response = await httpClient.put(`/consumables/${itemid}`, data)
    
    return response.data
  },

  // 删除耗材
  deleteConsumable: async (itemid: string) => {
    const response = await httpClient.delete(`/consumables/${itemid}`)
    return response.data
  },

  // 根据ID获取耗材
  getConsumableByItemid: async (itemid: string) => {
    const response = await httpClient.get(`/consumables/${itemid}`)
    return response.data
  },

  // 更新耗材数量
  updateConsumableQuantity: async (itemid: string, quantity: number, status?: string) => {
    const response = await httpClient.put(`/consumables/${itemid}/quantity`, {
      quantity,
      status
    })
    return response.data
  },

  // 获取记录
  getRecords: async (query: RecordsQuery) => {
    const response = await httpClient.get('/records', { params: query })
    return response.data
  },

  // 获取记录数据
  getRecordsData: async (query: RecordsDataQuery) => {
    const response = await httpClient.get('/records/data', { params: query })
    return response.data
  },

  // 添加记录
  addRecord: async (recordData: RecordData) => {
    const response = await httpClient.post('/records', recordData)
    return response.data
  },

  // 删除入库记录
  deleteInRecord: async (recordId: number) => {
    const response = await httpClient.delete(`/records/in/${recordId}`)
    return response.data
  },

  // 删除出库记录
  deleteOutRecord: async (recordId: number) => {
    const response = await httpClient.delete(`/records/out/${recordId}`)
    return response.data
  },

  // 获取统计数据
  getConsumableStatistics: async (query: StatisticsQuery) => {
    const response = await httpClient.get('/statistics', { params: query })
    return response.data
  },

  // 获取折线图数据
  getConsumableLineChartData: async (query: LineChartQuery) => {
    const response = await httpClient.get('/statistics/linechart', { params: query })
    return response.data
  },

  // 获取今日入库记录数
  getTodayInRecords: async () => {
    const response = await httpClient.get('/stats/today-in-records')
    return response.data
  },

  // 获取今日出库记录数
  getTodayOutRecords: async () => {
    const response = await httpClient.get('/stats/today-out-records')
    return response.data
  },

  // 获取库存预警数
  getInventoryWarnings: async () => {
    const response = await httpClient.get('/stats/inventory-warnings')
    return response.data
  },

  // 获取总耗材数
  getTotalConsumables: async () => {
    const response = await httpClient.get('/stats/total-consumables')
    return response.data
  },

  // 获取主页统计信息
  getMainPageStats: async () => {
    const response = await httpClient.get('/statistics/main')
    return response.data
  },

  // 测试API连接
  testApiConnection: async () => {
    try {
      const response = await httpClient.get('/health')
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
  insertLog: async (logType: string, logModule: string, logMessage: string, logUser: string, logExt0?: string, logExt1?: string, logExt2?: string, logExt3?: string, logExt4?: string) => {
    const response = await httpClient.post('/log', {
        logType,
        logModule,
        logMessage,
        logUser,
        logExt0,
        logExt1,
        logExt2,
        logExt3,
        logExt4
    });
    return response.data;
  },
  predictStock: (params: {
    modelType: string;
    consumableId: string;
    historyData: number[];
    predictDays: number;
  }) => {
    return httpClient.post('/predict/stock', params);
  }
}
