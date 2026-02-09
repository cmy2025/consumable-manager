<template>
  <div class="home-view">
    <!-- 新增：右上角登录/退出按钮 -->
    <div class="user-actions">
      <span v-if="isLoggedIn" class="user-name">
        欢迎，{{ realName || username }}
      </span>
      <el-button
        v-if="!isLoggedIn"
        type="primary"
        size="small"
        @click="toLogin"
      >
        登录
      </el-button>
      <el-button
        v-else
        type="danger"
        size="small"
        @click="handleLogout"
      >
        退出登录
      </el-button>
    </div>

    <!-- 顶部统计卡片 -->
    <div class="stats-container">
      <div v-for="stat in stats" :key="stat.name" class="stat-card">
        <div class="icon">{{ stat.icon }}</div>
        <div class="content">
          <h3>{{ stat.name }}</h3>
          <p class="value">{{ stat.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { apiService } from '../api/index'

const router = useRouter()

// 新增：登录状态相关
const isLoggedIn = computed(() => !!sessionStorage.getItem('userId'))
const username = computed(() => sessionStorage.getItem('username') || '')
const realName = computed(() => sessionStorage.getItem('realName') || '')

// 跳转到登录页
const toLogin = () => {
  router.push('/login')
}

// 退出登录
const handleLogout = async () => {
  try {
    await apiService.logout()
    sessionStorage.clear()
    ElMessage.success('退出成功！')
    router.push('/login')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '退出失败'
    ElMessage.error(errMsg)
  }
}

// 统计数据
const stats = ref([
  { name: '总耗材数', value: '0', icon: '📦' },
  { name: '今日入库', value: '0', icon: '📥' },
  { name: '今日出库', value: '0', icon: '📤' },
  { name: '库存预警', value: '0', icon: '⚠️' }
])

// 获取统计数据
const fetchStats = async (): Promise<void> => {
  try {
    const consumables = await apiService.getConsumables()
    const totalConsumables = Array.isArray(consumables) ? consumables.length : 0
    const todayInRecords = (await apiService.getTodayInRecords()) as number
    const todayOutRecords = (await apiService.getTodayOutRecords()) as number
    const inventoryWarnings = (await apiService.getInventoryWarnings()) as number

    stats.value[0].value = totalConsumables.toString()
    stats.value[1].value = todayInRecords.toString()
    stats.value[2].value = todayOutRecords.toString()
    stats.value[3].value = inventoryWarnings.toString()
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? e.message : String(e)
    ElMessage.error('获取统计数据失败: ' + msg)
  }
}

let intervalId

onMounted(() => {
  fetchStats()
  intervalId = setInterval(fetchStats, 60000)
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<style scoped>
.home-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  box-sizing: border-box;
  position: relative; /* 新增：为按钮定位做准备 */
}

/* 新增：用户操作按钮样式 */
.user-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  color: #303133;
  font-size: 14px;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 800px;
  margin: 20px auto 0;
  padding: 0 20px;
  margin-top: 60px; /* 新增：避免按钮遮挡统计卡片 */
}

.stat-card {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
}

.icon {
  font-size: 36px;
  margin-right: 15px;
}

.content {
  flex: 1;
}

.content h3 {
  font-size: 16px;
  color: #606266;
  margin-bottom: 5px;
}

.content .value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
</style>