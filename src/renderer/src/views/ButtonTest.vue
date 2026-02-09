<template>
  <div class="main-page">
    <!-- 基础使用：无需写click事件，组件内置了日志+alert -->
    <Button btn-id="base-btn" type="default">基础默认按钮</Button>

    <!-- 带业务数据：组件内置处理customData，父组件可选监听 -->
    <Button 
      btn-id="custom-btn"
      type="primary"
      :custom-data="customBtnData"
      @btn-click="handleCustomData"
      style="margin-top: 20px;"
    >
      携带业务数据的按钮
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const customBtnData = ref({
  id: 1001,
  name: '耗材申请',
  action: 'submit'
})
// 仅处理特殊业务逻辑，通用逻辑已内置
const handleCustomData = (data) => {
  console.log('父组件处理业务数据：', data);
  // 比如提交表单、调用接口等特殊逻辑
}
</script>