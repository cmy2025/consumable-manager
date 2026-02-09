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
import Settings from '../src/views/Settings.vue'
import TestConnection from '../src/views/TestConnection.vue'
import HomeView from '../src/views/Home.vue'
import ListView from '../src/views/List.vue'
import ListAllView from '../src/views/ListAll.vue'
import Prediction from '../src/views/Prediction.vue';
// 新增：引入登录组件（需自行创建Login.vue）
import Login from '../src/views/Login.vue'
// src/renderer/src/router/index.ts
import Register from '../src/views/Register.vue'

const routes = [
  { path: '/register',  name: 'register',component: Register,meta: { requiresAuth: false }},
  // 新增：登录页路由（独立于AppLayout外）
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false } // 无需登录即可访问
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true }, // 需要登录才能访问
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

// 新增：路由守卫 - 登录验证
router.beforeEach((to, from, next) => {
  console.log('导航开始:', from.path, '->', to.path)
  // 判断当前页面是否需要登录
  const requiresAuth = to.meta.requiresAuth !== false
  // 从sessionStorage获取登录态
  const isLoggedIn = !!sessionStorage.getItem('userId')

  if (requiresAuth && !isLoggedIn) {
    // 未登录且需要权限，跳转到登录页
    ElMessage.warning('请先登录')
    next('/login')
  } else if (to.path === '/login' && isLoggedIn) {
    // 已登录但访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

router.afterEach((to, from) => {
  console.log('导航完成:', from.path, '->', to.path)
})

export default router