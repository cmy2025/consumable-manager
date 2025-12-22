// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:5137', // 与后端端口保持一致
        changeOrigin: true
      }
    }
  }
}
