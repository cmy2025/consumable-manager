<template>
  <div class="register-container">
    <div class="register-card">
      <h2 class="register-title">耗材管理系统 - 注册</h2>
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-width="80px"
        class="register-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            auto-complete="off"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            auto-complete="off"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            auto-complete="off"
          />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input
            v-model="registerForm.realName"
            placeholder="请输入真实姓名"
            auto-complete="off"
          />
        </el-form-item>
        <!-- 仅管理员可见的角色选择（可选） -->
        <el-form-item label="角色" prop="role" v-if="isAdmin">
          <el-select v-model="registerForm.role" placeholder="请选择角色">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            class="register-btn"
            @click="handleRegister"
            :loading="isLoading"
          >
            注册
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button
            type="text"
            class="back-login-btn"
            @click="goBackLogin"
          >
            返回登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElForm, ElFormItem, ElInput, ElButton, ElSelect, ElOption } from 'element-plus'
import { useRouter } from 'vue-router'
import { ipcApiService } from '../api/ipc-api'
import type { RegisterForm } from '../types'

const router = useRouter()
const registerFormRef = ref<InstanceType<typeof ElForm>>()
const isLoading = ref(false)

// 判断当前用户是否是管理员（注册页面如果是游客访问则隐藏角色选择）
const isAdmin = computed(() => {
  return sessionStorage.getItem('role') === 'admin'
})

// 注册表单数据
const registerForm = reactive<RegisterForm>({
  username: '',
  password: '',
  confirmPassword: '',
  realName: '',
  role: isAdmin.value ? 'user' : 'user'  // 默认普通用户
})

// 表单校验规则
const registerRules = reactive({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { 
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致!'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ]
})

// 注册处理函数
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  // 表单校验
  const valid = await registerFormRef.value.validate()
  if (!valid) return

  try {
    isLoading.value = true
    // 调用注册接口
    const res = await ipcApiService.register(registerForm)
    if (res.success) {
      ElMessage.success('注册成功！请登录')
      // 注册成功后跳回登录页
      router.push('/login')
    } else {
      ElMessage.error(res.error || '注册失败')
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '网络异常，注册失败'
    ElMessage.error(errMsg)
  } finally {
    isLoading.value = false
  }
}

// 返回登录页面
const goBackLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.register-card {
  width: 400px;
  padding: 30px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.register-title {
  text-align: center;
  margin-bottom: 20px;
  color: #303133;
}

.register-form {
  margin-top: 20px;
}

.register-btn {
  width: 100%;
}

.back-login-btn {
  color: #409eff;
  padding: 0;
  margin-top: 10px;
  font-size: 14px;
}
.back-login-btn:hover {
  color: #66b1ff;
}
</style>