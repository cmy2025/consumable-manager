import { ElMessage } from 'element-plus'
import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../src/layouts/AppLayout.vue'
import MainPage from '../src/views/MainPage.vue'
import ConsumableInfo from '../src/views/ConsumableInfo.vue'
import ConsumableInRecord from '../src/views/ConsumableInRecord.vue'
import ConsumableOutRecord from '../src/views/ConsumableOutRecord.vue'
import RecordQuery from '../src/views/RecordQuery.vue'
import ConsumableStatistics from '../src/views/ConsumableStatistics.vue'
import ConsumableQRCodeScan from '../src/views/ConsumableQRCodeScan.vue'
import Settings from '../src/views/Settings.vue' // 引入设置页面
import TestConnection from '../src/views/TestConnection.vue'
import HomeView from '../src/views/Home.vue'
import ListView from '../src/views/List.vue'
import ListAllView from '../src/views/ListAll.vue'
import Prediction from '../src/views/Prediction.vue';
const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'MainPage',
        component: MainPage
      },
      {
        path: 'consumable-info',
        name: 'ConsumableInfo',
        component: ConsumableInfo
      },
      {
        path: 'consumable-in-record',
        name: 'ConsumableInRecord',
        component: ConsumableInRecord
      },
      {
        path: 'consumable-out-record',
        name: 'ConsumableOutRecord',
        component: ConsumableOutRecord
      },
      {
        path: 'record-query',
        name: 'RecordQuery',
        component: RecordQuery
      },
      {
        path: '/consumable-statistics',
        component: ConsumableStatistics
      },
      {
        path: '/consumable-qr-code-scan',
        component: ConsumableQRCodeScan
      },
      {
        path: '/settings',
        name: 'Settings',
        component: Settings
      },
      {
        path: '/test-connection',
        name: 'TestConnection',
        component: TestConnection
      },
      {
        path: 'main',
        name: 'home',
        component: HomeView
      },
      {
        path: '/list',
        name: 'list',
        component: ListView
      },
      {
        path: '/listAll',
        name: 'listAll',
        component: ListAllView
      },
      {
        path: '/prediction',
        name: 'Prediction',
        component: Prediction
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  ElMessage.error('导航失败: ' + error.message)
})

router.beforeEach((to, from, next) => {
  console.log('导航开始:', from.path, '->', to.path)
  next()
})

router.afterEach((to, from) => {
  console.log('导航完成:', from.path, '->', to.path)
})

export default router