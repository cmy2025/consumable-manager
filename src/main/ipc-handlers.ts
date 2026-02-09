// src/main/ipc-handlers.ts - 主进程 IPC 处理器
import { ipcMain, BrowserWindow, app } from 'electron'
import * as mssql from 'mssql'
import { join } from 'path'
import { promises as fs } from 'fs'
import type {
  ConsumableData,
  UpdateConsumableData,
  RecordData,
  StatisticsQuery,
  LineChartQuery,
  QueryParams,
  UpdateConsumableQuantityParams,
  LoginForm, 
  LoginResponse,
  RegisterForm,  // 新增导入
  RegisterResponse  // 新增导入
} from './types'
import {
  addConsumable,
  getConsumables as getConsumablesBase,
  getRecords,
  addRecord,
  updateConsumableQuantity,
  updateConsumable,
  deleteConsumable,
  deleteInRecord,
  deleteOutRecord,
  getRecordsData,
  getConnection,
  getTotalConsumables,
  getTodayInRecords,
  getTodayOutRecords,
  getInventoryWarnings,
  getConsumableLineChartData,
  getConsumableStatistics,
  testConnectionWithConfig,
  verifyUserLogin, 
  handleUserLogout, 
  registerUser,  // 新增导入：用户注册函数
  insertLog
} from './db'
import { predictStock, PredictStockOptions } from './prediction/index'; // 导入预测核心函数

/**
 * IPC处理器类型
 */
 interface IpcResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}


// 带查询参数的获取耗材函数
async function getConsumablesWithQuery(queryString: string): Promise<unknown[]> {
  const pool = await getConnection()
  let query = 'SELECT * FROM Consumables'
  const queryParams: QueryParams = {}
  const conditions: string[] = []

  // 解析查询字符串
  const urlParams = new URLSearchParams(queryString)

  const itemid = urlParams.get('itemid')
  if (itemid) {
    conditions.push('itemid = @itemid')
    queryParams.itemid = itemid
  }

  const name = urlParams.get('name')
  if (name) {
    conditions.push('name LIKE @name')
    queryParams.name = `%${name}%`
  }

  const company = urlParams.get('company')
  if (company) {
    conditions.push('company LIKE @company')
    queryParams.company = `%${company}%`
  }

  const status = urlParams.get('status')
  if (status) {
    conditions.push('status = @status')
    queryParams.status = status
  }

  const registrant = urlParams.get('registrant')
  if (registrant) {
    conditions.push('registrant LIKE @registrant')
    queryParams.registrant = `%${registrant}%`
  }

  const quantity = urlParams.get('quantity')
  if (quantity) {
    conditions.push('quantity = @quantity')
    queryParams.quantity = parseInt(quantity, 10)
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  const request = pool.request()
  for (const key in queryParams) {
    request.input(key, mssql.NVarChar, queryParams[key])
  }

  const result = await request.query(query)
  return result.recordset
}

export function setupIpcHandlers(): void {
   // ========== 新增：用户注册 IPC 处理器 ==========
   ipcMain.handle('auth-register', async (_event, registerData: RegisterForm): Promise<RegisterResponse> => {
    try {
      const { username, password, realName, role } = registerData

      // 1. 基础参数校验
      if (!username || !password || !realName) {
        return {
          success: false,
          error: '用户名、密码和真实姓名不能为空'
        }
      }

      // 2. 调用 db 层注册用户
      const result = await registerUser({
        username,
        password,
        realName,
        role: role || 'user'
      })

      if (result.success) {
        // 注册成功：插入日志
        await insertLog(
          'OPERATE',
          'REGISTER',
          `用户 ${username} 注册成功`,
          username
        )
        
        return {
          success: true,
          data: result.data
        }
      } else {
        // 注册失败：插入日志
        await insertLog(
          'ERROR',
          'REGISTER',
          `用户 ${username} 注册失败：${result.error}`,
          username
        )
        
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('处理注册请求失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '注册服务异常，请重试'
      }
    }
  })
   // ========== 新增：用户登录 IPC 处理器 ==========
   ipcMain.handle('auth-login', async (_event, loginData: LoginForm): Promise<LoginResponse> => {
    try {
      const { username, password } = loginData

      // 1. 基础参数校验
      if (!username || !password) {
        return {
          success: false,
          error: '用户名和密码不能为空'
        }
      }

      // 2. 调用 db 层验证用户
      const user = await verifyUserLogin(username, password)
      if (!user) {
        // 登录失败：插入日志
        await insertLog(
          'ERROR',
          'LOGIN',
          `用户 ${username} 登录失败：用户名或密码错误`,
          username
        )
        return {
          success: false,
          error: '用户名或密码错误'
        }
      }

      // 3. 登录成功：插入操作日志
      await insertLog(
        'OPERATE',
        'LOGIN',
        `用户 ${username} 登录系统成功`,
        username
      )

      // 4. 返回用户信息（不含密码）
      return {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          role: user.role
        }
      }
    } catch (error) {
      console.error('处理登录请求失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录服务异常，请重试'
      }
    }
  })

  // ========== 新增：用户登出 IPC 处理器 ==========
  ipcMain.handle('auth-logout', async (_event, username?: string): Promise<{
    success: boolean
    error?: string
  }> => {
    try {
      if (username) {
        await handleUserLogout(username) // 调用 db 层登出逻辑
      }
      return { success: true }
    } catch (error) {
      console.error('处理登出请求失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '登出失败，请重试'
      }
    }
  })

  // 获取耗材
  ipcMain.handle('get-consumables', async (_event, queryString: string) => {
    try {
      const result = queryString
        ? await getConsumablesWithQuery(queryString)
        : await getConsumablesBase()
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取耗材失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 添加耗材
  ipcMain.handle('add-consumable', async (_event, data: ConsumableData) => {
    try {
      await addConsumable(data)
      return { success: true, message: '添加成功' }
    } catch (error: unknown) {
      console.error('添加耗材失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取记录数据
  ipcMain.handle('get-records-data', async (_event, query: Record<string, unknown>) => {
    try {
      // 解析并转换参数
      const { startTime, endTime, id, itemid, name, type, status, operator } = query

      const parsedQuery = {
        startTime: typeof startTime === 'string' ? new Date(startTime) : null,
        endTime: typeof endTime === 'string' ? new Date(endTime) : null,
        id: typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? id : undefined,
        itemid: typeof itemid === 'string' ? itemid : undefined,
        name: typeof name === 'string' ? name : undefined,
        type: typeof type === 'string' ? type : undefined,
        status: typeof status === 'string' ? status : undefined,
        operator: typeof operator === 'string' ? operator : undefined
      }

      const result = await getRecordsData(parsedQuery)
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取记录数据失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取记录
  ipcMain.handle('get-records', async (_event, query?: Record<string, unknown>) => {
    try {
      const allRecords = await getRecords()
      if (query) {
        const filteredRecords = allRecords.filter((record) => {
          for (const key in query) {
            if (key === 'time') {
              if (typeof record[key] === 'string' && typeof query[key] === 'string') {
                const recordTime = new Date(record[key] as string)
                const queryTime = new Date(query[key] as string)
                if (recordTime.getTime() !== queryTime.getTime()) {
                  return false
                }
              } else {
                return false
              }
            } else if (record[key] !== query[key]) {
              return false
            }
          }
          return true
        })
        return { success: true, data: filteredRecords }
      } else {
        return { success: true, data: allRecords }
      }
    } catch (error: unknown) {
      console.error('获取记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 添加记录
  ipcMain.handle('add-record', async (_event, data: RecordData) => {
    try {
      // 构造完整参数对象
      const recordToAdd = {
        itemid: data.itemid,
        name: data.name,
        type: data.type,
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        remain: typeof data.remain === 'number' ? data.remain : 0,
        time: data.time ? new Date(data.time) : new Date(),
        status: typeof data.status === 'string' ? data.status : '',
        operator: data.operator
      }
      const result = await addRecord(recordToAdd)
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('添加记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 更新耗材数量
  ipcMain.handle(
    'update-consumable-quantity',
    async (_event, { itemid, quantity, status }: UpdateConsumableQuantityParams) => {
      console.log('开始更新耗材数量')
      console.log('收到更新耗材数量请求:', _event);
      try {
        await updateConsumableQuantity({ itemid, quantity, status })
        return { success: true, message: '更新成功' }
      } catch (error: unknown) {
        console.error('更新耗材数量失败:', error)
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  // 更新耗材
  ipcMain.handle('update-consumable', async (_event, data: UpdateConsumableData) => {
    try {
      await updateConsumable(data)
      return { success: true, message: '更新成功' }
    } catch (error: unknown) {
      console.error('更新耗材失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 删除耗材
  ipcMain.handle('delete-consumable', async (_event, itemid: string) => {
    try {
      await deleteConsumable(itemid)
      return { success: true, message: '删除成功' }
    } catch (error: unknown) {
      console.error('删除耗材失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 删除入库记录
  ipcMain.handle('delete-in-record', async (_event, id: number) => {
    try {
      await deleteInRecord(id)
      return { success: true, message: '删除成功' }
    } catch (error: unknown) {
      console.error('删除入库记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 删除出库记录
  ipcMain.handle('delete-out-record', async (_event, id: number) => {
    try {
      await deleteOutRecord(id)
      return { success: true, message: '删除成功' }
    } catch (error: unknown) {
      console.error('删除出库记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取统计数据
  ipcMain.handle('get-total-consumables', async () => {
    try {
      const result = await getTotalConsumables()
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取总耗材数失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('get-today-in-records', async () => {
    try {
      const result = await getTodayInRecords()
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取今日入库记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('get-today-out-records', async () => {
    try {
      const result = await getTodayOutRecords()
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取今日出库记录失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('get-inventory-warnings', async () => {
    try {
      const result = await getInventoryWarnings()
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取库存预警失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取耗材统计
  ipcMain.handle('get-consumable-statistics', async (_event, query: StatisticsQuery) => {
    try {
      const result = await getConsumableStatistics(query)
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取耗材统计失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取折线图数据
  ipcMain.handle('get-consumable-line-chart-data', async (_event, query: LineChartQuery) => {
    try {
      const result = await getConsumableLineChartData(query)
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('获取折线图数据失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 根据 itemid 获取耗材
  ipcMain.handle('get-consumable-by-itemid', async (_event, itemid: string) => {
    try {
      const pool = await getConnection()
      const result = await pool
        .request()
        .input('itemid', mssql.NVarChar, itemid)
        .query('SELECT * FROM Consumables WHERE itemid = @itemid')

      if (result.recordset.length > 0) {
        return { success: true, data: result.recordset[0] }
      } else {
        return { success: false, error: '耗材不存在' }
      }
    } catch (error: unknown) {
      console.error('获取耗材失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 窗口控制
  ipcMain.handle('minimize-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.minimize()
    }
  })

  ipcMain.handle('close-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.close()
    }
  })

  // 配置文件相关处理器
  ipcMain.handle('get-config-path', async () => {
    const userDataPath = app.getPath('userData')
    return join(userDataPath, 'settings.json')
  })

  ipcMain.handle('read-config-file', async (_event, configPath: string) => {
    try {
      const data = await fs.readFile(configPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.log('配置文件不存在或读取失败:', error)
      return null
    }
  })

  ipcMain.handle('write-config-file', async (_event, configPath: string, config: unknown) => {
    try {
      const dir = join(configPath, '..')
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
      return true
    } catch (error) {
      console.error('写入配置文件失败:', error)
      throw error
    }
  })

  // API 连接测试（使用当前保存的配置）
  ipcMain.handle('test-api-connection', async () => {
    try {
      const consumables = await getConsumablesBase()
      return {
        success: true,
        message: `连接成功！获取到 ${consumables.length} 条耗材数据`
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        message: `连接失败: ${errorMessage}`
      }
    }
  })

  // API 连接测试（使用指定配置）
  ipcMain.handle('test-connection-with-config', async (_event, dbConfig) => {
    try {
      return await testConnectionWithConfig(dbConfig)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        message: `连接测试失败: ${errorMessage}`
      }
    }
  })
  //插入日志
  ipcMain.handle('insert-log', async (
    _event, 
    logData: {
      logType: string;
      logModule: string;
      logMessage: string;
      logUser: string;
      logExt0?: string;
      logExt1?: string;
      logExt2?: string;
      logExt3?: string;
      logExt4?: string;
    }
  ) => {
    try {
      // 调用db.ts中的insertLog函数插入日志
      await insertLog(
        logData.logType,
        logData.logModule,
        logData.logMessage,
        logData.logUser,
        logData.logExt0,
        logData.logExt1,
        logData.logExt2,
        logData.logExt3,
        logData.logExt4
      );
      return { success: true, message: '日志记录成功' };
    } catch (error: unknown) {
      console.error('插入日志失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  })

  // 预测函数
  ipcMain.handle('predict-stock', async (_event, params) => {
    try {
      // 调用预测函数
      const result = await predictStock(params);
      // 确保结果是纯数字数组（强制序列化）
      const serializableResult = result.map(num => Number(num));
      return { success: true, data: serializableResult };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '预测失败' };
    }
  });
}

