<template>
  <!-- 商品卡片容器：加点击事件，鼠标悬浮变手型提升体验 -->
  <div 
    class="goods-card" 
    @click="handleBuyClick"
    style="padding: 10px; border: 1px solid #ccc; text-align: center; cursor: pointer;"
  >
    <img style="width: 100%; " :src="imgUrl" :alt="goodsName">
    <div style="margin: 8px 0;">{{ goodsName }}</div>
    <div style="color: red;">价格 {{ price }}</div>

    <!-- Element Plus 确认弹窗：默认隐藏，点击后显示 -->
    <el-dialog 
      v-model="dialogVisible" 
      title="确认购买" 
      width="30%"
      :before-close="handleClose"
    >
      <p>你确定要购买 {{ goodsName }} 吗？</p>
      <p>价格：{{ price }}</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmBuy">确认购买</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<!-- 核心修改：改用 <script setup> 组合式 API -->
<script setup>
// 1. 导入组合式 API 所需的核心方法（ref 用于定义响应式变量）
import { ref } from 'vue'

// 2. 定义接收父组件的参数（替代选项式 API 的 props 选项）
// defineProps 是 <script setup> 内置方法，无需导入
const props = defineProps({
  goodsName: {
    type: String,
    required: true, // 必传：商品名称
  },
  price: {
    type: String,
    required: true, // 必传：商品价格
  },
  imgUrl: {
    type: String,
    required: true, // 必传：商品图片地址
  }
})

// 3. 定义响应式数据（替代选项式 API 的 data 选项）
// ref 包裹的变量，修改时要通过 .value 操作
const dialogVisible = ref(false)

// 4. 定义方法（替代选项式 API 的 methods 选项）
// 直接定义普通函数即可，无需包裹在 methods 对象中
const handleBuyClick = () => {
  dialogVisible.value = true // 组合式 API 中修改响应式变量需加 .value
}

const handleClose = () => {
  dialogVisible.value = false
}

const confirmBuy = () => {
  // 访问父组件传的参数：props.xxx
  alert(`已确认购买 ${props.goodsName}，价格：${props.price}`);
  dialogVisible.value = false;
}
</script>

<style scoped>
/* 可选：给卡片加 hover 效果，提升交互体验 */
.goods-card:hover {
  border-color: #409eff; /* 鼠标悬浮时边框变蓝色 */
  box-shadow: 0 0 5px rgba(64, 158, 255, 0.5); /* 加轻微阴影 */
}
</style>