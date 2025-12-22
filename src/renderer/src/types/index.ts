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
