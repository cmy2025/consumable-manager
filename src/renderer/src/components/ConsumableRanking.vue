<template>
  <div class="ranking-card">
    <div class="ranking-header">
      <h3>{{ getTitle() }}</h3>
      <span class="month-tag">{{ month }}月</span>
    </div>
    <div class="ranking-list">
      <!-- 排行榜项 -->
      <div 
        v-for="(item, index) in rankingList" 
        :key="item.id" 
        class="ranking-item"
        :class="{ 'first-item': index === 0 }"
      >
        <!-- 排名标识 -->
        <div class="rank-number">
          {{ index + 1 }}
          <span v-if="index === 0" class="top-icon">🏆</span>
        </div>
        <!-- 耗材信息 -->
        <div class="consumable-info">
          <p class="name">{{ item.name }}</p>
          <p class="count">数量：{{ item.count }} 件</p>
        </div>
      </div>
      <!-- 空数据提示 -->
      <div v-if="!rankingList.length" class="empty-tip">
        暂无{{ type === 'in' ? '入库' : '出库' }}数据
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { apiService } from '@/api/index'

// 定义组件props
const props = defineProps({
  // 类型：in-入库，out-出库
  type: {
    type: String,
    required: true,
    validator: (val: string) => ['in', 'out'].includes(val)
  },
  // 月份（数字，1-12）
  month: {
    type: Number,
    required: true,
    validator: (val: number) => val >= 1 && val <= 12
  }
})

// 排行榜数据
const rankingList = ref<Array<{
  id: string | number
  name: string
  count: number
}>>([])

// 动态生成标题
const getTitle = computed(() => {
  return `${props.month}月${props.type === 'in' ? '入库' : '出库'}量排行榜`
})

// 获取排行榜数据
const fetchRankingData = async () => {
  try {
    // 调用接口获取对应月份、类型的排行榜数据
    const data = await apiService.getConsumableRanking({
      type: props.type,
      month: props.month
    })
    rankingList.value = data || []
  } catch (e) {
    console.error('获取排行榜数据失败：', e)
    rankingList.value = []
  }
}

// 监听props变化，重新请求数据
watch([() => props.type, () => props.month], fetchRankingData, { immediate: true })
onMounted(fetchRankingData)
</script>

<style scoped>
.ranking-card {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.ranking-header h3 {
  font-size: 18px;
  color: #303133;
  margin: 0;
}

.month-tag {
  background-color: #409eff;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background-color: #f9f9f9;
  transition: background-color 0.2s;
}

.ranking-item:hover {
  background-color: #f0f9ff;
}

/* 第一名特殊样式 */
.first-item {
  background-color: #fff7e6;
  border: 1px solid #ffd591;
}

.rank-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #e5e6eb;
  color: #303133;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  margin-right: 15px;
  position: relative;
}

/* 第一名排名数字样式 */
.first-item .rank-number {
  background-color: #ff9d00;
  color: white;
  font-size: 20px;
  width: 40px;
  height: 40px;
}

/* 第一名奖杯图标 */
.top-icon {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 14px;
}

.consumable-info {
  flex: 1;
}

/* 第一名耗材名称样式 */
.first-item .consumable-info .name {
  font-size: 18px;
  font-weight: bold;
  color: #ff9d00;
  margin: 0 0 4px 0;
}

/* 普通项名称样式 */
.consumable-info .name {
  font-size: 16px;
  color: #303133;
  margin: 0 0 4px 0;
}

.consumable-info .count {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

/* 空数据提示 */
.empty-tip {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 14px;
}
</style>