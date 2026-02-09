import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import './assets/main.css'

//创建Vue实例
const app = createApp(App)

app.use(ElementPlus)
app.use(router)
//挂载到DOM
app.mount('#app')
