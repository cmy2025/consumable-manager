<template>
  <el-card class="settings-card">
    <div class="settings-container">
      <h3 class="settings-title">系统设置</h3>

      <!-- 数据库配置 -->
      <el-divider content-position="left">数据库配置</el-divider>
      <el-form label-width="150px">
        <el-form-item label="服务器地址">
          <el-input v-model="databaseConfig.server" placeholder="localhost" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number
            v-model="databaseConfig.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="数据库名">
          <el-input v-model="databaseConfig.database" placeholder="consumables" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="databaseConfig.username" placeholder="sa" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="databaseConfig.password" type="password" show-password />
        </el-form-item>
      </el-form>

      <!-- API 连接测试 -->
      <el-divider content-position="left">连接测试</el-divider>
      <div class="api-test-container">
        <el-button type="primary" :loading="testLoading" @click="testConnection">
          测试数据库连接
        </el-button>
        <div v-if="testResult" class="test-result">
          <el-alert
            :title="testResult.message"
            :type="testResult.success ? 'success' : 'error'"
            :closable="false"
          />
        </div>
      </div>

      <!-- UI 设置 -->
      <el-divider content-position="left">界面设置</el-divider>
      <el-form label-width="150px">
        <el-form-item label="库存低于10警告色">
          <el-color-picker v-model="uiConfig.warningColor10" show-alpha />
        </el-form-item>
        <el-form-item label="库存低于100警告色">
          <el-color-picker v-model="uiConfig.warningColor100" show-alpha />
        </el-form-item>
        <el-form-item label="全局字体大小">
          <el-slider v-model="uiConfig.fontSize" :min="12" :max="24" :step="1" show-tooltip />
          <div class="mt-2 text-center">{{ uiConfig.fontSize }}px</div>
        </el-form-item>
        <el-form-item label="主题模式">
          <el-radio-group v-model="uiConfig.darkMode">
            <el-radio :label="false">明亮模式</el-radio>
            <el-radio :label="true">暗黑模式</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <!-- 操作按钮 -->
      <div class="button-group">
        <el-button type="primary" :loading="saveLoading" @click="saveAllSettings">
          保存所有设置
        </el-button>
        <el-button type="info" @click="restoreDefaultSettings">恢复默认设置</el-button>
      </div>
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import {
  initConfig,
  updateConfig,
  appConfig,
  DEFAULT_CONFIG,
  testApiConnectionWithConfig
} from '../utils/configUtils'
import type { AppConfig } from '../utils/configUtils'

// 响应式数据
const databaseConfig = reactive({ ...DEFAULT_CONFIG.database })
const uiConfig = reactive({ ...DEFAULT_CONFIG.ui })

// 加载和保存状态
const saveLoading = ref(false)
const testLoading = ref(false)

// API 测试结果
const testResult = ref<{ message: string; success: boolean } | null>(null)

// 测试数据库连接
const testConnection = async (): Promise<void> => {
  testLoading.value = true
  testResult.value = null

  try {
    // 使用当前页面上的配置进行测试，不保存配置
    const testConfig: AppConfig = {
      database: { ...databaseConfig },
      ui: { ...uiConfig }
    }
    // 直接测试配置，不保存
    const result = await testApiConnectionWithConfig(testConfig)
    testResult.value = result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    testResult.value = {
      success: false,
      message: `测试失败: ${errorMessage}`
    }
  }

  testLoading.value = false
}

// 保存所有设置
const saveAllSettings = async (): Promise<void> => {
  saveLoading.value = true

  try {
    const newConfig: AppConfig = {
      database: { ...databaseConfig },
      ui: { ...uiConfig }
    }

    await updateConfig(newConfig)
    ElMessage.success('设置保存成功')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage.error('保存设置失败: ' + errorMessage)
  }

  saveLoading.value = false
}

// 恢复默认设置
const restoreDefaultSettings = async (): Promise<void> => {
  try {
    Object.assign(databaseConfig, DEFAULT_CONFIG.database)
    Object.assign(uiConfig, DEFAULT_CONFIG.ui)

    await saveAllSettings()
    ElMessage.success('已恢复默认设置')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage.error('恢复默认设置失败: ' + errorMessage)
  }
}

// 页面加载时初始化配置
onMounted(async () => {
  try {
    await initConfig()
    Object.assign(databaseConfig, appConfig.value.database)
    Object.assign(uiConfig, appConfig.value.ui)
  } catch (error) {
    console.error('初始化配置失败:', error)
  }
})
</script>

<style scoped>
.settings-card {
  margin: 0;
  height: 100%;
  box-sizing: border-box;
}

.settings-container {
  padding: 20px;
}

.settings-title {
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: bold;
}

.api-test-container {
  margin-bottom: 20px;
}

.test-result {
  margin-top: 15px;
}

.button-group {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.mt-2 {
  margin-top: 8px;
}

.text-center {
  text-align: center;
}
</style>
