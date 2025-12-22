// src/renderer/src/api/ipc-api.ts - 使用 IPC 的 API 服务
import type {
  ConsumableData,
  UpdateConsumableData,
  RecordData,
  RecordsQuery,
  RecordsDataQuery,
  StatisticsQuery,
  LineChartQuery
} from '../types'

export interface IpcResult {
  success: boolean
  data?: unknown
  error?: string
}

export const ipcApiService = {
  // 获取耗材
  getConsumables: async (queryString: string = '') => {
    try {
      const result = (await window.electronAPI.invoke('get-consumables', queryString)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取耗材失败:', error)
      throw error
    }
  },

  // 添加耗材
  addConsumable: async (data: ConsumableData) => {
    try {
      const result = (await window.electronAPI.invoke('add-consumable', data)) as IpcResult
      if (result.success) {
        return result
      } else {
        throw new Error(result.error)
      }
    } catch (error: unknown) {
      console.error('添加耗材失败:', error)
      throw error
    }
  },

  // 获取记录
  getRecords: async (query?: RecordsQuery) => {
    try {
      const result = (await window.electronAPI.invoke('get-records', query)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取记录失败:', error)
      throw error
    }
  },

  // 获取记录数据
  getRecordsData: async (query: RecordsDataQuery) => {
    try {
      const result = (await window.electronAPI.invoke('get-records-data', query)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取记录数据失败:', error)
      throw error
    }
  },

  // 添加记录
  addRecord: async (data: RecordData) => {
    try {
      const result = (await window.electronAPI.invoke('add-record', data)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('添加记录失败:', error)
      throw error
    }
  },

  // 更新耗材数量
// ipc-api.ts（正确示例）
updateConsumableQuantity: async (itemid: string, quantity: number, status?: string) => {
  try {
    // 确保调用的 IPC 通道名称与后端一致（'update-consumable-quantity'）
    const result = await window.electronAPI.invoke('update-consumable-quantity', {
      itemid,
      quantity,
      status
    })
    // 即使成功，也需判断 result 是否存在
    if (!result) {
      throw new Error('更新耗材数量失败：未返回结果')
    }
    return result // 直接返回后端的 { success, message/error }
  } catch (error) {
    console.error('更新失败:', error)
    throw error // 抛出错误让调用方处理
  }
},

  // 更新耗材
  updateConsumable: async (_itemid: string, data: UpdateConsumableData) => {
    try {
      const result = (await window.electronAPI.invoke('update-consumable', data)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('更新耗材失败:', error)
      throw error
    }
  },

  // 删除耗材
  deleteConsumable: async (itemid: string) => {
    try {
      const result = (await window.electronAPI.invoke('delete-consumable', itemid)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('删除耗材失败:', error)
      throw error
    }
  },

  // 删除入库记录
  deleteInRecord: async (id: number) => {
    try {
      const result = (await window.electronAPI.invoke('delete-in-record', id)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('删除入库记录失败:', error)
      throw error
    }
  },

  // 删除出库记录
  deleteOutRecord: async (id: number) => {
    try {
      const result = (await window.electronAPI.invoke('delete-out-record', id)) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('删除出库记录失败:', error)
      throw error
    }
  },

  // 获取总耗材数
  getTotalConsumables: async () => {
    try {
      const result = (await window.electronAPI.invoke('get-total-consumables')) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取总耗材数失败:', error)
      throw error
    }
  },

  // 获取今日入库数
  getTodayInRecords: async () => {
    try {
      const result = (await window.electronAPI.invoke('get-today-in-records')) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取今日入库数失败:', error)
      throw error
    }
  },

  // 获取今日出库数
  getTodayOutRecords: async () => {
    try {
      const result = (await window.electronAPI.invoke('get-today-out-records')) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取今日出库数失败:', error)
      throw error
    }
  },

  // 获取库存预警数
  getInventoryWarnings: async () => {
    try {
      const result = (await window.electronAPI.invoke('get-inventory-warnings')) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取库存预警数失败:', error)
      throw error
    }
  },

  // 获取耗材统计
  getConsumableStatistics: async (query: StatisticsQuery) => {
    try {
      const result = (await window.electronAPI.invoke(
        'get-consumable-statistics',
        query
      )) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取耗材统计失败:', error)
      throw error
    }
  },

  // 获取耗材折线图数据
  getConsumableLineChartData: async (query: LineChartQuery) => {
    try {
      const result = (await window.electronAPI.invoke(
        'get-consumable-line-chart-data',
        query
      )) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('获取耗材折线图数据失败:', error)
      throw error
    }
  },

  // 根据耗材ID获取耗材信息
  getConsumableByItemid: async (itemid: string) => {
    try {
      const result = (await window.electronAPI.invoke(
        'get-consumable-by-itemid',
        itemid
      )) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('根据耗材ID获取耗材信息失败:', error)
      throw error
    }
  },
  insertLog: async (
    logType: string,
    logModule: string,
    logMessage: string,
    logUser: string,
    logExt0?: string,
    logExt1?: string,
    logExt2?: string,
    logExt3?: string,
    logExt4?: string
  ) => {
    try {
      const result = (await window.electronAPI.invoke('insert-log', {
        logType,
        logModule,
        logMessage,
        logUser,
        logExt0,
        logExt1,
        logExt2,
        logExt3,
        logExt4
      })) as IpcResult;

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || '插入日志失败');
      }
    } catch (error) {
      console.error('调用insertLog API失败:', error);
      throw error; // 抛出错误让调用方处理
    }
  },
  // 在ipcApiService中添加
  predictStock: async (params: {
    modelType: string;
    consumableId: string;
    historyData: number[];
    predictDays: number;
  }) => {
    try {
      const result = (await window.electronAPI.invoke('predict-stock', params)) as IpcResult;
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('预测失败:', error);
      throw error;
    }
  }
}
