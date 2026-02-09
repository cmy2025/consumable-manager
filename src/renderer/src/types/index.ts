// src/renderer/src/types/index.ts - 渲染进程类型定义文件

// 耗材相关类型
export interface ConsumableData {
  itemid: string
  name: string
  quantity: number
  unit: string
  company?: string
  status?: string
  registrant: string
}

export interface UpdateConsumableData {
  id: number
  itemid: string
  name: string
  quantity: number
  unit: string
  company: string
  status: string
  registrant: string
}

// 记录相关类型
export interface RecordData {
  id?: number
  itemid: string
  name: string
  type: string
  status?: string
  operator: string
  time?: string
  quantity?: number
  remain?: number
}

// 查询相关类型
export interface RecordsQuery {
  time?: string
  id?: number | string
  itemid?: string
  name?: string
  type?: string
  status?: string
  operator?: string
}

export interface RecordsDataQuery {
  startTime?: string
  endTime?: string
  id?: string
  itemid?: string
  name?: string
  type?: string
  status?: string
  operator?: string
}

export interface ConsumableQuery {
  itemid?: string
  name?: string
  company?: string
  status?: string
  registrant?: string
  quantity?: string
}

// 统计相关类型
export interface StatisticsQuery {
  startTime?: Date | string | null
  endTime?: Date | string | null
  itemid?: string
  type?: string
}

export interface LineChartQuery {
  startTime?: Date | string | null
  endTime?: Date | string | null
  itemid?: string
  name?: string
  operator?: string
  type?: string
  status?: string
  timeGranularity?: string
}

// 参数相关类型
export interface QueryParams {
  [key: string]: string | number
}

export interface UpdateConsumableQuantityParams {
  itemid: string
  quantity: number
  status: string
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 统计数据类型
export interface StatisticsData {
  totalConsumables: number
  todayInRecords: number
  todayOutRecords: number
  inventoryWarnings: number
}

// 图表数据类型
export interface LineChartData {
  dates: string[]
  inQuantities: number[]
  outQuantities: number[]
}

// 新增：定义登录相关的类型（建议放到 ../types 中，这里先内联补充）
export interface LoginForm {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data?: {
    id: number          // 对应Users表的id
    username: string    // 对应Users表的username
    realName: string    // 对应Users表的realName
    role: string        // 对应Users表的role
  }
  error?: string        // 登录失败的错误信息
}

export interface RegisterForm {
  username: string    // 注册用户名
  password: string    // 注册密码
  confirmPassword: string // 确认密码
  realName: string    // 真实姓名
  role?: string       // 角色（默认user，仅管理员可指定admin）
}

export interface RegisterResponse {
  success: boolean
  data?: {
    id: number
    username: string
    realName: string
    role: string
  }
  error?: string
}