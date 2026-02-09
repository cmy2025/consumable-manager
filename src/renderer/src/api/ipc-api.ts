// src/renderer/src/api/ipc-api.ts - 使用 IPC 的 API 服务
import type {
  ConsumableData,
  UpdateConsumableData,
  RecordData,
  RecordsQuery,
  RecordsDataQuery,
  StatisticsQuery,
  LineChartQuery,
  LoginForm,   // 新增导入登录表单类型
  LoginResponse, // 新增导入登录响应类型
  RegisterForm, 
  RegisterResponse
} from '../types'

export interface IpcResult {
  success: boolean
  data?: unknown
  error?: string
}

export const ipcApiService = {
   // ========== 新增：用户注册 ==========
  register: async (registerForm: RegisterForm): Promise<RegisterResponse> => {
    try {
      // 提取可序列化的字段
      const registerData = {
        username: registerForm.username || '',
        password: registerForm.password || '',
        realName: registerForm.realName || '',
        role: registerForm.role || 'user'  // 默认普通用户
      };
      
      const result = (await window.electronAPI.invoke('auth-register', registerData)) as RegisterResponse;
      return result;
    } catch (error) {
      console.error('注册失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '注册过程发生未知错误'
      };
    }
  },
  login: async (loginForm: LoginForm): Promise<LoginResponse> => {
    try {
      // 🌟 关键：提取纯JSON可序列化的基础字段，避免复杂对象
      const loginData = {
        username: loginForm.username || '',
        password: loginForm.password || ''
        // 仅保留字符串/数字/布尔等基础类型，移除函数、Symbol、循环引用等
      };
      
      // 传递纯净的基础类型数据
      const result = (await window.electronAPI.invoke('auth-login', loginData)) as LoginResponse;
      
      if (result.success && result.data) {
        sessionStorage.setItem('userId', result.data.id.toString());
        sessionStorage.setItem('username', result.data.username);
        sessionStorage.setItem('realName', result.data.realName);
        sessionStorage.setItem('role', result.data.role);
      }
      return result;
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录过程发生未知错误'
      };
    }
  },

  // ========== 新增：用户退出 ==========
  logout: async (): Promise<IpcResult> => {
    try {
      // 调用后端登出IPC接口（可选）
      const result = (await window.electronAPI.invoke('auth-logout')) as IpcResult
      
      // 清空本地存储（与http-api.ts逻辑对齐）
      sessionStorage.removeItem('userId')
      sessionStorage.removeItem('username')
      sessionStorage.removeItem('realName')
      sessionStorage.removeItem('role')
      
      return result || { success: true }
    } catch (error) {
      console.error('退出登录失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '退出登录过程发生未知错误'
      }
    }
  },

  // ========== 新增：获取当前登录用户信息 ==========
  getCurrentUser: () => {
    return {
      userId: sessionStorage.getItem('userId'),
      username: sessionStorage.getItem('username'),
      realName: sessionStorage.getItem('realName'),
      role: sessionStorage.getItem('role')
    }
  },
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
