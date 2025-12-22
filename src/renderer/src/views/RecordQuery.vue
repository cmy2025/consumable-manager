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
                <el-option label="入库" value="入库" />
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
    <!-- 表格左上角添加排序按钮 -->
    <div class="table-header">
      <div style="margin-left: auto">
        <el-radio-group v-model="sortOrder">
          <el-radio :label="1">升序</el-radio>
          <el-radio :label="-1">降序</el-radio>
        </el-radio-group>
      </div>
    </div>
    <!-- 表格展示区域 -->
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
      <el-table-column label="日期">
        <template #default="scope">
          {{ formatDate(scope.row.time) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="operator" label="操作者" />
    </el-table>
    <!-- 分页控件 -->
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
    <!-- 退出按钮 -->
    <div class="back-button-container">
      <img src="../assets/exit.png" alt="Exit" class="exit-icon" @click="goBack" />
    </div>
  </el-card>
</template>
<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { apiService } from '../api/index'
import type { RecordsDataQuery } from '../types'
import moment from 'moment'

const router = useRouter()

interface Record {
  id: number
  itemid: string
  name: string
  type: string
  quantity: number
  remain: number
  time: Date | string
  status: string
  operator: string
}

const queryForm = ref({
  id: '',
  itemid: '',
  name: '',
  type: '',
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
const sortOrder = ref(1)

const fetchRecords = async (): Promise<void> => {
  loading.value = true
  const query: RecordsDataQuery = {}

  if (queryForm.value.id) {
    query.id = queryForm.value.id
  }
  if (queryForm.value.itemid) {
    query.itemid = queryForm.value.itemid
  }
  if (queryForm.value.name) {
    query.name = queryForm.value.name
  }
  if (queryForm.value.type) {
    query.type = queryForm.value.type
  }
  if (queryForm.value.status) {
    query.status = queryForm.value.status
  }
  if (queryForm.value.operator) {
    query.operator = queryForm.value.operator
  }
  if (queryForm.value.timeRange) {
    query.startTime = moment(queryForm.value.timeRange[0]).format('YYYY-MM-DD 00:00:00.000')
    query.endTime = moment(queryForm.value.timeRange[1]).format('YYYY-MM-DD 23:59:59.999')
  }

  try {
    const records = await apiService.getRecordsData(query)
    console.log('获取到的记录:', records)
    allRecords.value = records as Record[]
    currentPage.value = 1
    sortRecords()
    total.value = allRecords.value.length
    updatePaginatedRecords()
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    ElMessage.error('查询记录失败: ' + errorMessage)
    console.error('查询记录失败:', e)
  } finally {
    loading.value = false
  }
}

const sortRecords = (): void => {
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

const updatePaginatedRecords = (): void => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  paginatedRecords.value = allRecords.value.slice(start, end)
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

const handleQuery = (): void => {
  currentPage.value = 1
  fetchRecords()
}

const handleRefresh = (): void => {
  queryForm.value = {
    id: '',
    itemid: '',
    name: '',
    type: '',
    timeRange: null,
    status: '',
    operator: ''
  }
  currentPage.value = 1
  fetchRecords()
}

const goBack = (): void => {
  router.push('/')
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

const formatDate = (date: Date | string): string => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

watch(sortOrder, () => {
  sortRecords()
  currentPage.value = 1
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
  font-size: 15px;
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

/* 确保控件占满列宽 */
.el-col .el-input,
.el-col .el-select,
.el-col .el-date-picker {
  width: 100%;
}
</style>