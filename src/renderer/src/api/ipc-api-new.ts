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

interface IpcResult {
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
  updateConsumableQuantity: async (itemid: string, quantity: number, status?: string) => {
    try {
      const result = (await window.electronAPI.invoke('update-consumable-quantity', {
        itemid,
        quantity,
        status
      })) as IpcResult
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('更新耗材数量失败:', error)
      throw error
    }
  },

  // 更新耗材
  updateConsumable: async (data: UpdateConsumableData) => {
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
  }
}
