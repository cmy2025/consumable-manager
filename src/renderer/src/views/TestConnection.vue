<template>
  <el-card>
    <el-button @click="testConnection">测试前后端连接</el-button>
    <div v-if="responseMessage">{{ responseMessage }}</div>
  </el-card>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const responseMessage = ref('')

const testConnection = async () => {
  try {
    const response = await axios.get('http://localhost:5173/api/consumables')
    responseMessage.value = `前后端连接测试成功，响应数据长度: ${response.data.length}`
  } catch (error) {
    const errorMessage = (error as { message?: string }).message || '未知错误'
    responseMessage.value = `前后端连接测试失败: ${errorMessage}`
    ElMessage.error(`前后端连接测试失败: ${errorMessage}`)
  }
}
</script>
