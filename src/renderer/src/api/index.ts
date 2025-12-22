// src/renderer/src/api/index.ts - 统一 API 入口
import { ipcApiService } from './ipc-api'
import { httpApiService } from './http-api'
import { isElectron } from '../utils/environmentUtils'

// 根据环境自动选择 API 服务
export const apiService = isElectron() ? ipcApiService : httpApiService

// 导出类型
export type { IpcResult } from './ipc-api'
