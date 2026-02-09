<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">耗材管理系统 - 登录</h2>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
        class="login-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            auto-complete="off"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            auto-complete="off"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            class="login-btn"
            @click="handleLogin"
            :loading="isLoading"
          >
            登录
          </el-button>
        </el-form-item>
        <!-- 新增注册按钮 -->
        <el-form-item>
          <el-button
            type="text"
            class="register-btn"
            @click="handleRegister"
          >
            没有账号？立即注册
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'
import { useRouter } from 'vue-router'
import { ipcApiService } from '../api/ipc-api'  // 注意：原代码是apiService，这里改为ipcApiService
import type { LoginForm as LoginFormType } from '../types'

const router = useRouter()
const loginFormRef = ref<InstanceType<typeof ElForm>>()
const isLoading = ref(false)

// 登录表单数据
const loginForm = reactive<LoginFormType>({
  username: '',
  password: ''
})

// 表单校验规则
const loginRules = reactive({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
})

// 登录处理函数
const handleLogin = async () => {
  if (!loginFormRef.value) return
  // 表单校验
  const valid = await loginFormRef.value.validate()
  if (!valid) return

  try {
    isLoading.value = true
    // 调用登录接口
    const res = await ipcApiService.login(loginForm)  // 改为ipcApiService
    if (res.success && res.data) {
      // 保存登录态到sessionStorage
      sessionStorage.setItem('userId', res.data.id.toString())
      sessionStorage.setItem('username', res.data.username)
      sessionStorage.setItem('realName', res.data.realName)
      sessionStorage.setItem('role', res.data.role)
      
      ElMessage.success('登录成功！')
      // 跳转到首页
      router.push('/')
    } else {
      ElMessage.error(res.error || '登录失败，请检查用户名或密码')
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '网络异常，登录失败'
    ElMessage.error(errMsg)
  } finally {
    isLoading.value = false
  }
}

// 新增：跳转到注册页面
const handleRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.login-card {
  width: 400px;
  padding: 30px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.login-title {
  text-align: center;
  margin-bottom: 20px;
  color: #303133;
}

.login-form {
  margin-top: 20px;
}

.login-btn {
  width: 100%;
}

/* 注册按钮样式：无边框、蓝色字体 */
.register-btn {
  color: #409eff;  /* Element Plus 主色调 */
  padding: 0;
  margin-top: 10px;
  font-size: 14px;
}
.register-btn:hover {
  color: #66b1ff;  /* hover 效果 */
}
</style>