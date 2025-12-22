// 环境检测工具
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

export const isWeb = (): boolean => {
  return !isElectron()
}

// Web 环境下的配置管理
export const webConfigManager = {
  // 使用 localStorage 存储配置
  getConfig: (): {
    database: {
      server: string
      database: string
      user: string
      password: string
      port: number
    }
    ui: {
      warningColor10: string
      warningColor100: string
    }
  } | null => {
    try {
      const config = localStorage.getItem('app-config')
      return config ? JSON.parse(config) : null
    } catch (error) {
      console.error('读取配置失败:', error)
      return null
    }
  },

  saveConfig: (config: {
    database: {
      server: string
      database: string
      user: string
      password: string
      port: number
    }
    ui: {
      warningColor10: string
      warningColor100: string
    }
  }): void => {
    try {
      localStorage.setItem('app-config', JSON.stringify(config))
    } catch (error) {
      console.error('保存配置失败:', error)
    }
  },

  // 默认配置
  getDefaultConfig: () => ({
    database: {
      server: 'localhost',
      database: 'consumable_db',
      user: 'sa',
      password: '',
      port: 1433
    },
    ui: {
      warningColor10: 'rgba(255, 0, 0, 0.1)',
      warningColor100: 'rgba(255, 255, 0, 0.05)'
    }
  })
}
