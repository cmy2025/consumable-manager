import path from 'path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  server: {
    port: 5137, //前端端口
    proxy: {
      '/api': {
        target: 'http://localhost:5173', //后端端口
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      external: ['express', 'mssql', 'cors'] // 添加需要外部化的模块
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [
    electron([
      {
        entry: 'src/main/index.ts'
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload()
        }
      }
    ]),
    renderer()
  ]
})
