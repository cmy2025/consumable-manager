<template>
  <el-card>
    <!-- 查询条件：使用栅格系统调整为一行4个控件 -->
    <div class="query-form-container">
      <el-form :model="queryForm" label-width="80px">
        <!-- 第一行：4个控件 -->
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="记录ID">
              <el-input v-model="queryForm.id" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="耗材ID">
              <el-input v-model="queryForm.itemid" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="名称">
              <el-input v-model="queryForm.name" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="类型">
              <el-select v-model="queryForm.type" placeholder="请选择类型">
                <el-option label="出库" value="出库" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 第二行：4个控件，最后添加查询和刷新按钮 -->
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="queryForm.timeRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态">
              <el-input v-model="queryForm.status" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="操作者">
              <el-input v-model="queryForm.operator" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <el-button type="info" @click="handleQuery">查询</el-button>
              <img src="../assets/refresh.png" alt="Refresh" class="refresh-icon" @click="handleRefresh" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>
    <!-- 表格左上角添加出库按钮和排序按钮 -->
    <div class="table-header">
      <el-button type="danger" @click="openDialog">出库</el-button>
      <div style="margin-left: auto">
        <el-radio-group v-model="sortOrder">
          <el-radio :label="1">升序</el-radio>
          <el-radio :label="-1">降序</el-radio>
        </el-radio-group>
      </div>
    </div>

    <!-- 修改这里：添加row-style属性 -->
    <el-table
      v-loading="loading"
      :data="paginatedRecords"
      style="width: 1200%"
      :row-style="getRowStyle"
      :cell-style="{ padding: '13px 0' }"
    >
      <el-table-column prop="id" label="记录ID" />
      <el-table-column prop="itemid" label="耗材ID" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="type" label="类型" />
      <el-table-column prop="quantity" label="数量" />
      <el-table-column prop="remain" label="剩余数量" />
      <el-table-column label="日期" width="200">
        <template #default="scope">
          {{ formatDate(scope.row.time) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="operator" label="操作者" />
      <el-table-column label="操作">
        <template #default="scope">
          <el-button type="text" size="small" @click="deleteRecord(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      :current-page="currentPage"
      :page-sizes="[5, 10, 20, 30, 50, 100]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
    </el-pagination>

    <!-- 退出按钮放在右下角 -->
    <div class="back-button-container">
      <img src="../assets/exit.png" alt="Exit" class="exit-icon" @click="goBack" />
    </div>

    <!-- 出库对话框 -->
    <el-dialog v-model="dialogVisible" title="出库" width="400px" :close-on-click-modal="false">
      <el-form :model="form" label-width="80px">
        <el-form-item label="耗材ID">
          <el-input
            v-model="form.itemid"
            placeholder="请输入或选择耗材ID"
            @keyup.enter="onItemidEnter"
            @change="onItemidChange"
          />
          <el-select
            v-model="form.itemid"
            placeholder="请选择耗材"
            filterable
            clearable
            style="width: 100%"
            @change="onItemidChange"
          >
            <el-option
              v-for="item in consumables"
              :key="item.itemid"
              :label="`${item.itemid} - ${item.name}`"
              :value="item.itemid"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="名称">
          <el-input
            v-model="form.name"
            placeholder="请输入或选择名称"
            @change="onNameChange"
          />
          <el-select
            v-model="form.name"
            placeholder="请选择名称"
            filterable
            clearable
            style="width: 100%"
            @change="onNameChange"
          >
            <el-option
              v-for="item in consumables"
              :key="item.name"
              :label="item.name"
              :value="item.name"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="当前库存">
          <el-input v-model="form.currentQuantity" disabled />
        </el-form-item>
        <el-form-item label="出库数量">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-input v-model="form.status" autocomplete="off" />
        </el-form-item>
        <el-form-item label="操作者">
          <el-input v-model="form.operator" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleAddRecord">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="确认删除" width="300px">
      <div>确定要删除该记录吗？</div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deleteLoading" @click="handleDeleteRecord"
          >确认</el-button
        >
      </template>
    </el-dialog>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '../api/index'
import { useRouter } from 'vue-router'
import moment from 'moment' // 引入 moment.js

// 定义类型 - 添加明确的属性定义
interface Record {
  id: number
  itemid: string
  name: string
  quantity: number
  remain: number
  type: string
  time: string
  status: string
  operator: string
}

interface Consumable {
  itemid: string
  name: string
  quantity: number
  unit: string
  company: string
  status: string
  registrant: string
}

const router = useRouter()
const queryForm = ref({
  id: '',
  itemid: '',
  name: '',
  type: '出库',
  timeRange: null,
  status: '',
  operator: ''
})
const allRecords = ref<Record[]>([])
const paginatedRecords = ref<Record[]>([])
const total = ref(0)
const loading = ref(false)
const pageSize = ref(10)
const currentPage = ref(1)
const dialogVisible = ref(false)
const form = ref({
  itemid: '',
  name: '',
  currentQuantity: 0,
  quantity: 1,
  status: '',
  operator: ''
})
const consumables = ref<Consumable[]>([])
const formLoading = ref(false)
const sortOrder = ref(1)
const deleteRecordId = ref('')
const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)

const fetchRecords = async (): Promise<void> => {
  loading.value = true
  const query: {
    id?: string
    itemid?: string
    name?: string
    type: string
    status?: string
    operator?: string
    startTime?: string
    endTime?: string
  } = {
    type: '出库'
  }
  // 处理查询条件
  if (queryForm.value.id) {
    query.id = queryForm.value.id
  }
  if (queryForm.value.itemid) {
    query.itemid = queryForm.value.itemid
  }
  if (queryForm.value.name) {
    query.name = queryForm.value.name
  }
  if (queryForm.value.status) {
    query.status = queryForm.value.status
  }
  if (queryForm.value.operator) {
    query.operator = queryForm.value.operator
  }
  if (queryForm.value.timeRange) {
    // 将日期转换为 YYYY-MM-DD 00:00:00.000 和 YYYY-MM-DD 23:59:59.999 的格式
    query.startTime = moment(queryForm.value.timeRange[0]).format('YYYY-MM-DD 00:00:00.000')
    query.endTime = moment(queryForm.value.timeRange[1]).format('YYYY-MM-DD 23:59:59.999')
  }
  try {
    const records = await apiService.getRecordsData(query)
    allRecords.value = records as Record[]
    // 重置当前页码为第一页
    currentPage.value = 1
    // 先排序
    sortRecords()
    total.value = allRecords.value.length
    // 更新分页数据
    updatePaginatedRecords()
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('查询记录失败: ' + errorMessage)
    console.error('查询记录失败:', e)
  }
  loading.value = false
}

const updatePaginatedRecords = (): void => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  paginatedRecords.value = allRecords.value.slice(start, end)
}

const handleAddRecord = async (): Promise<void> => {
  formLoading.value = true
  try {
    const { itemid, name } = form.value
    // 同时使用 itemid 和 name 查找耗材信息
    const consumable = consumables.value.find(
      (c: Consumable) => c.itemid === itemid && c.name === name
    )
    if (!consumable) {
      ElMessage.error('未找到对应的耗材信息')
      return
    }

    // 创建出库记录数据
    const newQuantity = Number(consumable.quantity - form.value.quantity)
    const recordData: Record = {
      id: 0, // 假设后端会自动生成，这里先设为 0
      itemid: form.value.itemid,
      name: form.value.name || consumable.name,
      type: '出库',
      quantity: form.value.quantity,
      remain: newQuantity, // 使用计算后的新库存
      time: new Date().toISOString(),
      status: form.value.status || consumable.status,
      operator: form.value.operator
    }

    // 先添加出库记录
    await apiService.addRecord(recordData)

    // 再更新耗材库存（确保顺序正确）
    const updateResult = (await apiService.updateConsumableQuantity(
      consumable.itemid,
      newQuantity,
      consumable.status
    )) as { success: boolean }
    if (updateResult.success) {
      ElMessage.success('出库操作成功，耗材数量更新操作成功')
    }

    // 关闭对话框并刷新数据
    dialogVisible.value = false

    // 确保数据刷新（使用 await 确保刷新完成）
    await Promise.all([
      fetchRecords(), // 刷新记录列表
      fetchConsumables() // 刷新耗材列表
      
    ])
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('出库操作失败: ' + errorMessage)
    console.error('出库操作失败:', e)
  } finally {
    formLoading.value = false
  }
}

const fetchConsumables = async (): Promise<void> => {
  try {
    const queryString = '' // 根据实际情况填写查询字符串
    const data = await apiService.getConsumables(queryString)
    consumables.value = data as Consumable[]
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('获取耗材信息失败: ' + errorMessage)
    console.error('获取耗材信息失败:', e)
  }
}

const deleteRecord = (row: Record): void => {
  deleteRecordId.value = row.id.toString()
  deleteDialogVisible.value = true
}

// 处理删除记录
const handleDeleteRecord = async (): Promise<void> => {
  deleteLoading.value = true
  try {
    const numericRecordId = Number(deleteRecordId.value)
    // 明确指定类型
    const recordToDelete = allRecords.value.find((record: Record) => record.id === numericRecordId)
    if (!recordToDelete) {
      ElMessage.error('未找到要删除的记录')
      return
    }

    // 删除出库记录
    const result = (await apiService.deleteOutRecord(numericRecordId)) as {
      success: boolean
      error?: string
    }
    if (result.success) {
      // 更新耗材数量（出库记录删除后，库存数量应该增加）
      // 明确指定类型
      const consumable = consumables.value.find(
        (c: Consumable) => c.itemid === recordToDelete.itemid
      )
      if (consumable) {
        const newQuantity = consumable.quantity + recordToDelete.quantity
        // 将 consumable.itemid 转换为 string 类型
        await apiService.updateConsumableQuantity(
          String(consumable.itemid),
          newQuantity,
          consumable.status
        )
        console.log(
          `已将耗材 ${consumable.itemid} 的库存从 ${consumable.quantity} 增加到 ${newQuantity}`
        )
        await apiService.insertLog('删除', '耗材出库记录', `删除耗材出库记录，耗材ID: ${consumable.itemid}`, sessionStorage.getItem('username'));
      }

      ElMessage.success('删除成功')
      deleteDialogVisible.value = false
      fetchRecords() // 刷新记录列表
      fetchConsumables() // 刷新耗材列表
    } else {
      ElMessage.error('删除失败: ' + result.error)
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('删除失败: ' + errorMessage)
  }
  deleteLoading.value = false
}

const handleSizeChange = (size: number): void => {
  pageSize.value = size
  currentPage.value = 1
  updatePaginatedRecords()
}

const handleCurrentChange = (page: number): void => {
  currentPage.value = page
  updatePaginatedRecords()
}

const openDialog = (): void => {
  form.value = { itemid: '', name: '', currentQuantity: 0, quantity: 1, status: '', operator: '' }
  dialogVisible.value = true
  fetchConsumables()
}

const handleQuery = (): void => {
  currentPage.value = 1
  fetchRecords()
}

const handleRefresh = (): void => {
  queryForm.value = {
    id: '',
    itemid: '',
    name: '',
    type: '出库',
    timeRange: null,
    status: '',
    operator: ''
  }
  currentPage.value = 1
  fetchRecords()
}

const formatDate = (date: Date | string): string => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

const getRowStyle = ({ row }: { row: Record }): { backgroundColor: string } => {
  const warningColor10 = localStorage.getItem('warningColor10') || 'rgba(255, 0, 0, 0.1)'
  const warningColor100 = localStorage.getItem('warningColor100') || 'rgba(255, 255, 0, 0.05)'

  if (row.remain < 10) {
    return { backgroundColor: warningColor10 }
  } else if (row.remain < 100) {
    return { backgroundColor: warningColor100 }
  }
  return { backgroundColor: 'transparent' }
}

const goBack = (): void => {
  router.push('/')
}

const onItemidChange = (): void => {
  updateConsumableInfo()
}

const onNameChange = (): void => {
  updateConsumableInfo()
}

// 新增：根据 itemid 和 name 两个条件更新耗材信息
const updateConsumableInfo = (): void => {
  const { itemid, name } = form.value

  // 只有当 itemid 和 name 都存在时才进行查找
  if (itemid && name) {
    const consumable = consumables.value.find(
      (c: Consumable) => c.itemid === itemid && c.name === name
    )

    if (consumable) {
      // 同时更新 name 和 currentQuantity
      form.value.name = consumable.name
      form.value.currentQuantity = consumable.quantity
    } else {
      // 未找到匹配的耗材
      form.value.name = ''
      form.value.currentQuantity = 0
      ElMessage.warning('未找到匹配的耗材信息')
    }
  } else if (itemid) {
    const consumable = consumables.value.find(
      (c: Consumable) => c.itemid === itemid
    )
    if (consumable) {
      form.value.name = consumable.name
      form.value.currentQuantity = consumable.quantity
    } else {
      form.value.name = ''
      form.value.currentQuantity = 0
      ElMessage.warning('未找到匹配的耗材信息')
    }
  } else {
    // 只要有一个条件不满足，就清空库存信息
    form.value.name = ''
    form.value.currentQuantity = 0
  }
}

// 处理回车键确认耗材 ID
const onItemidEnter = (): void => {
  updateConsumableInfo()
}

// 排序记录
const sortRecords = (): void => {
  // 明确指定数组元素类型
  allRecords.value.sort((a: Record, b: Record) => {
    if (a.id < b.id) {
      return -1 * sortOrder.value
    }
    if (a.id > b.id) {
      return 1 * sortOrder.value
    }
    return 0
  })
}

// 监听排序方式的变化，重新排序并更新分页数据
watch(sortOrder, () => {
  sortRecords()
  currentPage.value = 1 // 重置页码为第一页
  updatePaginatedRecords()
})

onMounted(fetchRecords)
</script>

<style scoped>
.table-header {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}
.el-table {
  font-size: 15px; /* 调整字体大小 */
}
.back-button-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

.exit-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.refresh-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
  margin-left: 10px;
}

.query-form-container {
  margin-bottom: 20px;
}
</style>