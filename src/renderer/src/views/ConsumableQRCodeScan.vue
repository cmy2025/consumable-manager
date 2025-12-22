<template>
  <el-card>
    <!-- 扫描二维码按钮 -->
    <div class="table-header">
      <el-button type="primary" @click="openScanDialog">扫描二维码</el-button>
    </div>

    <!-- 扫描对话框 -->
    <el-dialog
      v-model="scanDialogVisible"
      title="扫描二维码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="scanForm" label-width="80px">
        <el-form-item label="二维码内容">
          <el-input v-model="scanForm.qrCodeContent" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scanDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleScan">扫描</el-button>
      </template>
    </el-dialog>

    <!-- 耗材信息展示与录入对话框 -->
    <el-dialog
      v-model="infoDialogVisible"
      title="耗材信息"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="infoForm" label-width="80px">
        <el-form-item label="耗材ID">
          <el-input v-model="infoForm.itemid" autocomplete="off" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="infoForm.name" autocomplete="off" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="infoForm.quantity" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="infoForm.unit" autocomplete="off" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-input v-model="infoForm.company" autocomplete="off" />
        </el-form-item>
        <el-form-item label="状态">
          <el-input v-model="infoForm.status" autocomplete="off" />
        </el-form-item>
        <el-form-item label="登记者">
          <el-input v-model="infoForm.registrant" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="infoDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="infoFormLoading" @click="handleAddConsumable"
          >提交</el-button
        >
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '../api/index' // 确保路径正确
// 扫描对话框相关
const scanDialogVisible = ref(false)
const scanForm = ref({
  qrCodeContent: ''
})

// 耗材信息对话框相关
const infoDialogVisible = ref(false)
const infoForm = ref({
  itemid: '',
  name: '',
  quantity: 0,
  unit: '',
  company: '',
  status: '',
  registrant: ''
})
const infoFormLoading = ref(false)

const openScanDialog = (): void => {
  scanForm.value.qrCodeContent = ''
  scanDialogVisible.value = true
}

const handleScan = async (): Promise<void> => {
  if (!scanForm.value.qrCodeContent) {
    ElMessage.error('请输入二维码内容')
    return
  }
  try {
    // 假设二维码内容就是耗材ID
    const itemid = scanForm.value.qrCodeContent
    const consumable = (await apiService.getConsumableByItemid(itemid)) as {
      itemid: string
      name: string
      quantity: number
      unit: string
      company: string
      status: string
      registrant: string
    } | null
    if (consumable) {
      infoForm.value = { ...consumable } as {
        itemid: string
        name: string
        quantity: number
        unit: string
        company: string
        status: string
        registrant: string
      }
    } else {
      infoForm.value = {
        itemid,
        name: '',
        quantity: 0,
        unit: '',
        company: '',
        status: '',
        registrant: ''
      }
    }
    scanDialogVisible.value = false
    infoDialogVisible.value = true
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('扫描失败: ' + errorMessage)
  }
}

const handleAddConsumable = async (): Promise<void> => {
  if (
    !infoForm.value.itemid ||
    !infoForm.value.name ||
    !infoForm.value.unit ||
    !infoForm.value.company ||
    !infoForm.value.registrant
  ) {
    ElMessage.error('请补全耗材ID、名称、单位、供应商和登记者信息')
    return
  }
  if (infoForm.value.quantity <= 0) {
    ElMessage.error('数量必须大于0')
    return
  }
  infoFormLoading.value = true
  try {
    await window.electron.ipcRenderer.invoke('add-consumable', { ...infoForm.value })
    ElMessage.success('添加成功')
    infoDialogVisible.value = false
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('添加失败: ' + errorMessage)
  }
  infoFormLoading.value = false
}
</script>

<style scoped>
.table-header {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.exit-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
}
</style>
