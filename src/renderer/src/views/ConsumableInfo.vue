<template>
  <el-card>
    <!-- 查询条件：使用栅格系统调整为一行5个控件 -->
    <div class="query-form-container">
      <el-form :model="queryForm" label-width="80px">
        <!-- 第一行：5个控件，最后添加查询和刷新按钮 -->
        <el-row :gutter="20">
          <el-col :span="4">
            <el-form-item label="耗材ID">
              <el-input v-model="queryForm.itemid" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="名称">
              <el-input v-model="queryForm.name" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="公司">
              <el-input v-model="queryForm.company" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="状态">
              <el-input v-model="queryForm.status" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="登记人">
              <el-input v-model="queryForm.registrant" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item>
              <div class="button-container">
                <el-button type="info" @click="handleQuery">查询</el-button>
                <img src="../assets/refresh.png" alt="Refresh" class="refresh-icon" @click="handleRefresh" />
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>
    <!-- 表格左上部分添加添加新耗材按钮 -->
    <div class="table-header">
      <el-button type="primary" @click="openAddDialog">添加新耗材</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="currentConsumables"
      style="width: 1200%; margin-top: 16px"
      :row-style="getRowStyle"
      :cell-style="{ padding: '13px 0' }"
    >
      <el-table-column prop="itemid" label="耗材ID"  />
      <el-table-column prop="name" label="名称"/>
      <el-table-column prop="quantity" label="数量" />
      <el-table-column prop="unit" label="单位"  />
      <el-table-column prop="company" label="公司"  />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="registrant" label="登记人"  />
      <el-table-column label="操作"  fixed="right">
        <template #default="scope">
          <div style="display: flex; justify-content: space-around">
            <el-button type="primary" size="small" @click="editItem(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="deleteItem(scope.row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      :current-page="currentPage"
      :page-sizes="[5, 10, 20, 30, 50, 100]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    >
    </el-pagination>

    <div class="exit-button-container">
      <img src="../assets/exit.png" alt="Exit" class="exit-icon" @click="goBack" />
    </div>

    <!-- 添加新耗材对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加新耗材"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="addForm">
        <el-form-item label="耗材ID">
          <el-input v-model="addForm.itemid" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="addForm.name" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="addForm.quantity" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="addForm.unit" />
        </el-form-item>
        <el-form-item label="公司">
          <el-input v-model="addForm.company" />
        </el-form-item>
        <el-form-item label="状态">
          <el-input v-model="addForm.status" />
        </el-form-item>
        <el-form-item label="登记人">
          <el-input v-model="addForm.registrant" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addFormLoading" @click="handleAddConsumable">
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑耗材对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑耗材"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm">
        <el-form-item label="耗材ID">
          <el-input v-model="editForm.itemid" disabled />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="editForm.unit" />
        </el-form-item>
        <el-form-item label="公司">
          <el-input v-model="editForm.company" />
        </el-form-item>
        <el-form-item label="状态">
          <el-input v-model="editForm.status" />
        </el-form-item>
        <el-form-item label="登记人">
          <el-input v-model="editForm.registrant" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editFormLoading" @click="handleEditConsumable">
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="deleteDialogVisible" title="确认删除" width="300px">
      <template #default>
        <div>确定要删除该耗材吗？</div>
      </template>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deleteLoading" @click="handleDeleteConsumable">
          确认
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { apiService } from '../api/index'
import type { UpdateConsumableData } from '../types'

const router = useRouter()

// 响应式数据
const allConsumables = ref<UpdateConsumableData[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

const queryForm = ref({
  itemid: '',
  name: '',
  company: '',
  status: '',
  registrant: ''
})

const addDialogVisible = ref(false)
const addFormLoading = ref(false)
const editDialogVisible = ref(false)
const editFormLoading = ref(false)

const addForm = ref({
  itemid: '',
  name: '',
  quantity: 0,
  unit: '',
  company: '',
  status: '',
  registrant: ''
})

const editForm = ref({
  id: 0,
  itemid: '',
  name: '',
  quantity: 0,
  unit: '',
  company: '',
  status: '',
  registrant: ''
})

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteItemId = ref('')

// 计算属性
const currentConsumables = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return allConsumables.value.slice(start, end)
})

// 行样式
const getRowStyle = ({ row }: { row: UpdateConsumableData }): Record<string, string> => {
  if (row.quantity <= 5) {
    return { b
    ackgroundColor: '#ffcccc' }
  }
  return { backgroundColor: '#ffffff' }
}

// 方法
const fetchConsumables = async (): Promise<void> => {
  loading.value = true
  try {
    console.log('开始获取耗材数据...')
    const data = await apiService.getConsumables()
    console.log('获取到的耗材数据:', data)

    if (Array.isArray(data)) {
      allConsumables.value = data
      total.value = data.length
      console.log('耗材数据设置成功，共', total.value, '条记录')
    } else {
      console.warn('返回的数据不是数组格式:', data)
      allConsumables.value = []
      total.value = 0
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('获取耗材数据失败:', error)
    ElMessage.error('获取数据失败: ' + errorMessage)
    allConsumables.value = []
    total.value = 0
  }
  loading.value = false
}

const handleRefresh = (): void => {
  fetchConsumables()
}

const handleCurrentChange = (page: number): void => {
  currentPage.value = page
}

const handleSizeChange = (size: number): void => {
  pageSize.value = size
  currentPage.value = 1
}

const openAddDialog = (): void => {
  addForm.value = {
    itemid: '',
    name: '',
    quantity: 0,
    unit: '',
    company: '',
    status: '',
    registrant: ''
  }
  addDialogVisible.value = true
}

const handleQuery = async (): void => {
  console.log('开始查询耗材信息，查询条件:', queryForm.value);
  loading.value = true;
  try {
    const queryParams = Object.fromEntries(
      Object.entries(queryForm.value).filter(([_, value]) => value)
    );
    console.log('发送查询请求，查询参数:', queryParams);
    const data = await apiService.getConsumables(queryParams);
    console.log('获取到的耗材数据:', data);
    if (Array.isArray(data)) {
      allConsumables.value = data;
      total.value = data.length;
    } else {
      console.warn('返回的数据不是数组格式:', data);
      allConsumables.value = [];
      total.value = 0;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('获取耗材数据失败:', error);
    ElMessage.error('获取数据失败: ' + errorMessage);
    allConsumables.value = [];
    total.value = 0;
  }
  loading.value = false;
}

const handleAddConsumable = async (): Promise<void> => {
  addFormLoading.value = true
  try {
    await apiService.addConsumable(addForm.value)
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    fetchConsumables()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage.error('添加失败: ' + errorMessage)
  }
  addFormLoading.value = false
}

const editItem = (row: UpdateConsumableData): void => {
  editForm.value = { ...row }
  editDialogVisible.value = true
}

const handleEditConsumable = async (): Promise<void> => {
  editFormLoading.value = true;
  try {
    await apiService.updateConsumable(editForm.value.itemid, { ...editForm.value });
    ElMessage.success('更新成功');
    editDialogVisible.value = false;
    fetchConsumables();
    // 添加日志记录
    await apiService.insertLog('编辑', '耗材信息管理', `编辑耗材信息，耗材ID: ${editForm.value.itemid}`, sessionStorage.getItem('username'));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ElMessage.error('更新失败: ' + errorMessage);
  }
  editFormLoading.value = false;
}

const deleteItem = (row: UpdateConsumableData): void => {
  deleteItemId.value = row.itemid
  deleteDialogVisible.value = true
}

const handleDeleteConsumable= async (): Promise<void> => {
  deleteLoading.value = true;
  try {
    await apiService.deleteConsumable(deleteItemId.value);
    ElMessage.success('删除成功');
    deleteDialogVisible.value = false;
    fetchConsumables();
    // 添加日志记录
    await apiService.insertLog('删除', '耗材信息管理', `删除耗材信息，耗材ID: ${deleteItemId.value}`, sessionStorage.getItem('username'));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ElMessage.error('删除失败: ' + errorMessage);
  }
  deleteLoading.value = false;

}

const goBack = (): void => {
  router.push('/')
}

// 组件挂载时获取数据
onMounted(() => {
  fetchConsumables()
})
</script>

<style scoped>
/* 表格头部容器样式：弹性布局，垂直居中，间距16px，底部外边距16px */
.table-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

/* 刷新/退出图标样式：固定宽高，鼠标悬浮变透明 */
.refresh-icon,
.exit-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
}
/* 刷新/退出图标样式：hover是伪类，鼠标悬浮变透明 */
.refresh-icon:hover,
.exit-icon:hover {
  opacity: 0.7;
}
//不透明度opacity70%

/* 退出按钮容器：固定在页面右下角，提高层级 */
.exit-button-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

/* 查询表单容器：底部外边距20px */
.query-form-container {
  margin-bottom: 20px;
}

/* 按钮容器：弹性布局，垂直居中，间距16px */
.button-container {
  display: flex;
  align-items: center;
  gap: 16px; /* 调整按钮之间的间距 */
}
</style>