import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      sourcemap: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      sourcemap: false
    }
  },
  renderer: {
    plugins: [vue()],
    build: {
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // 使用函数形式的 manualChunks 来避免循环依赖
            if (id.includes('node_modules')) {
              if (id.includes('element-plus')) {
                return 'element-plus'
              }
              if (id.includes('echarts') || id.includes('vue-echarts')) {
                return 'echarts'
              }
              if (id.includes('vue') && !id.includes('vue-echarts')) {
                return 'vue'
              }
              return 'vendor'
            }
            return undefined
          }
        }
      }
    },
    server: {
      port: 5137,
      proxy: {
        '/api': {
          target: 'http://localhost:5173', // 后端服务器地址
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
