<template>
  <div class="home-view">
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
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '../api/index'

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
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 800px;
  margin: 20px auto 0;
  padding: 0 20px;
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
