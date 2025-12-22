import { ref } from 'vue'
import type { Ref } from 'vue'
import { isElectron } from './environmentUtils'

// 配置文件接口
export interface AppConfig {
  database: {
    server: string
    username: string
    password: string
    database: string
    port: number
  }
  ui: {
    warningColor10: string
    warningColor100: string
    fontSize: number
    darkMode: boolean
  }
}

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  database: {
    username: 'ruogu',
    password: '123',
    server: '192.168.2.41',
    database: 'SeRis',
    port: 1433
  },
  ui: {
    warningColor10: '#ff4444',
    warningColor100: '#ffaa00',
    fontSize: 14,
    darkMode: false
  }
}

// 配置文件路径（仅 Electron 环境使用）
const getConfigPath = async (): Promise<string> => {
  if (!isElectron()) {
    throw new Error('getConfigPath is only available in Electron environment')
  }
  return await window.electronAPI.getConfigPath()
}

// 加载配置
export const loadConfig = async (): Promise<AppConfig> => {
  try {
    if (isElectron()) {
      // Electron 环境：从文件系统加载
      const configPath = await getConfigPath()
      const configData = (await window.electronAPI.readConfigFile(configPath)) as AppConfig | null

      if (configData) {
        return { ...DEFAULT_CONFIG, ...configData }
      }
    } else {
      // Web 环境：从后端服务器加载
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const configData = await response.json()
          return { ...DEFAULT_CONFIG, ...configData }
        } else {
          console.warn('从后端加载配置失败，使用默认配置')
        }
      } catch (error) {
        console.warn('连接后端失败，使用默认配置:', error)
      }
    }

    return DEFAULT_CONFIG
  } catch (error) {
    console.warn('加载配置文件失败，使用默认配置:', error)
    return DEFAULT_CONFIG
  }
}
// 保存配置
export const saveConfig = async (config: AppConfig): Promise<void> => {
  try {
    if (isElectron()) {
      // Electron 环境：保存到文件系统
      const configPath = await getConfigPath()
      await window.electronAPI.writeConfigFile(configPath, config)
    } else {
      // Web 环境：保存到后端服务器
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      if (!response.ok) {
        throw new Error(`保存配置失败: ${response.statusText}`)
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '保存配置失败')
      }
      console.log('配置已保存到后端服务器')
    }
  } catch (error) {
    console.error('保存配置文件失败:', error)
    throw error
  }
}

// 响应式配置状态
export const appConfig: Ref<AppConfig> = ref(DEFAULT_CONFIG)

// 初始化配置
export const initConfig = async (): Promise<void> => {
  try {
    const config = await loadConfig()
    appConfig.value = config
  } catch (error) {
    console.error('初始化配置失败:', error)
    appConfig.value = DEFAULT_CONFIG
  }
}

// 更新配置
export const updateConfig = async (newConfig: Partial<AppConfig>): Promise<void> => {
  const updatedConfig = {
    ...appConfig.value,
    ...newConfig,
    database: { ...appConfig.value.database, ...newConfig.database },
    ui: { ...appConfig.value.ui, ...newConfig.ui }
  }

  await saveConfig(updatedConfig)
  appConfig.value = updatedConfig
}

// 测试 API 连接
export const testApiConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (isElectron()) {
    // Electron 环境：通过 IPC
    return await window.electronAPI.testApiConnection()
  } else {
    // Web 环境：直接 HTTP 请求
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        return { success: true, message: '连接成功' }
      } else {
        return { success: false, message: `连接失败: ${response.statusText}` }
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

// 使用指定配置测试 API 连接
export const testApiConnectionWithConfig = async (
  config: AppConfig
): Promise<{ success: boolean; message: string }> => {
  if (isElectron()) {
    // Electron 环境：直接使用新的 IPC 方法测试配置，不保存
    return await window.electronAPI.testConnectionWithConfig(config.database)
  } else {
    // Web 环境：发送配置到后端进行测试
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config.database)
      })

      if (response.ok) {
        const result = await response.json()
        return result
      } else {
        return { success: false, message: `连接失败: ${response.statusText}` }
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
