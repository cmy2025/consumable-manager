import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 配置文件相关
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  readConfigFile: (configPath: string) => ipcRenderer.invoke('read-config-file', configPath),
  writeConfigFile: (configPath: string, config: unknown) =>
    ipcRenderer.invoke('write-config-file', configPath, config),

  // API 连接测试
  testApiConnection: () => ipcRenderer.invoke('test-api-connection'),
  testConnectionWithConfig: (dbConfig: unknown) =>
    ipcRenderer.invoke('test-connection-with-config', dbConfig),

  // 数据库操作相关
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
})
