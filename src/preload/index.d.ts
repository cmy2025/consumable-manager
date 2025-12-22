import { ElectronAPI } from '@electron-toolkit/preload'

interface CustomElectronAPI {
  getConfigPath: () => Promise<string>
  readConfigFile: (configPath: string) => Promise<unknown>
  writeConfigFile: (configPath: string, config: unknown) => Promise<boolean>
  testApiConnection: () => Promise<{ success: boolean; message: string }>
  testConnectionWithConfig: (dbConfig: unknown) => Promise<{ success: boolean; message: string }>
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: CustomElectronAPI
    api: unknown
  }
}
