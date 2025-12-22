import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// 在 Electron 主进程中设置 UTF-8 编码
if (process.platform === 'win32') {
  // 设置进程环境变量
  process.env.LANG = 'zh_CN.UTF-8'
  process.env.LC_ALL = 'zh_CN.UTF-8'
}

// src/main/index.ts
import { testDatabaseConnection } from './db'
import { setupIpcHandlers } from './ipc-handlers'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // 自动隐藏菜单栏
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 测试数据库连接
  const isDatabaseConnected = await testDatabaseConnection()
  if (isDatabaseConnected) {
    console.log('数据库连接成功')
  } else {
    console.warn('数据库连接失败，应用仍将启动，可在设置页面配置数据库')
  }

  // 设置 IPC 处理器（无论数据库是否连接都要设置）
  setupIpcHandlers()

  // 创建窗口（无论数据库是否连接都要创建）
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 处理应用退出事件
app.on('will-quit', () => {
  // 可以在这里添加清理代码
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
