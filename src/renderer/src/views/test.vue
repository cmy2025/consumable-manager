
<template>
  <div>
    主页
    <el-row>
      <el-col :span="6">
        <div style="width: 100%; height: 30px; background-color: deeppink"></div></el-col>
      <el-col :span="6">
        <div style="width: 100%; height: 30px; background-color: orange"></div></el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="1">
        <div style="width: 100%; height: 300px; background-color: dodgerblue"></div></el-col>
      <el-col :span="23">
        <div style="width: 100%; height: 300px; background-color: red"></div></el-col>
    </el-row>
    <el-row>
      <el-col :span="6">
        <div style="padding: 10px; border: 1px solid #ccc;text-align:center">
          <img style="width: 100%" src="../assets/refresh2.png" alt="">
          <div style="text-align: center"> 商品 1 </div>
          <div style= "color: red">价格 $99.00</div>
        </div>
      </el-col>
      <el-col :span="6">
        <GoodsCard 
          goodsName="商品 2" 
          price="$99.00" 
          :imgUrl="refreshImg"
        />
      </el-col>
      <el-col :span="6">
        <div style="padding: 10px; border: 1px solid #ccc;text-align:center">
          <img style="width: 100%" src="../assets/refresh2.png" alt="">
          <div style="text-align: center"> 商品 3 </div>
          <div style="color: red">价格 $99.00</div>
          </div>
      </el-col>
      <el-col :span="6">
        <div style="padding: 10px; border: 1px solid #ccc;text-align:center">
          <img style="width: 100%" src="../assets/refresh2.png" alt="">
          <div style="text-align: center"> 商品 4 </div>
          <div style="color: red">价格 $99.00</div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>


<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '../api/index'
import GoodsCard from '../components/GoodsCard.vue'
import refreshImg from '../assets/refresh2.png' // 这里写实际的相对路径

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
