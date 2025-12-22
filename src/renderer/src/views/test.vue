<template>
 <el-card>
  <div class="表单容器">
   <el-form：model=queryForm label-width="80">
    <el-row :gutter="20">
     <!--耗材ID列-->
     <el-col :span="">
      <el-form-item lable="耗材ID">
       <el-input v-model="queryForm.itemid" autocomplete="off"/>
      </el-form-item>
     </el-col>
     <!--名称列-->
     <el-col>
      <el-form-item lable="耗材ID">
        
      </el-form-item>
     </el-col>
     <!--公司列-->
     <el-col>
      <el-form-item lable="耗材ID">
        
      </el-form-item>
     </el-col>
     <!--按钮列-->
     <el-col>
      <el-form-item>
        <div class="按钮容器">
         <!--第一个按钮-->
         <el-button type="info" @click="handleQuery">查询
         </el-button>
         <!--第二个自定义按钮-->
         <img src="../../refresh.png" alt="Refresh" class="refresh" @click="handleRefresh">
        </div>
      </el-form-item>
     </el-col>
    </el-row>
   </el-form>
  </div>
  <!--添加新耗材的按钮-->
  <div class="table-header">
    <el-bottom type="primary" @click="oppenAddDialog">添加新耗材</el-bottom>
  </div>
  <!--编辑和删除的按钮-->
  <el-table
    v-loading="loading"
    :data="currentConsumables"
    style=""
    :row-style=""
    :cell-style="{}"
  >
    <el-table-column prop="itemid" lable="耗材ID"  />
    <el-table-column prop="name" lable="名称" />
    。。。
    <el-table-column label="操作" fixed="right">
      <template #default="scope">
        <div style="display:flex;..">
          <el-button type="primary" size=small @click="editItem(scope.row)">编辑</el-button>
          <el-button type="danger" size=small @click="deleteItem(scope.row)">删除</el-button>
      </template>
    <el-table-column>
  </el-table>

  <!--分页功能-->
  <!--注意:xxx=""的写法是[：属性="属性值"]的意思-->
  <!--注意@xxx=""的写法是[@事件名="调用函数名"]的意思-->
  <el-pagination
    :current-page="currentPage"
    :page-sizes="[5,10,20,30,50]"
    :page-size="pageSize"
    layout="total,sizes."
    :total="total"
    @current-change="handleCurrentChange"
    @size-change="handleSizeChange"
  >
  </el-pagination>

  <!--返回按钮-->

  <!--添加新耗材对话框-->
  <el-dialog v-modal='addDialogVisible' title='添加耗材' :close-on-click-model='false'>
    <el-form>
      <!--耗材ID-->
      <el-form-item label="耗材ID">
        <el-input v-model="addForm.item"></el-input>
      </el-form-item>
      <!--耗材名称-->
      <el-form-item label="名称">
        <el-input></el-input>
      </el-form-item>
      <!--耗材数量-->
      <el-form-item label="数量">
        <el-input v-model="addForm.quantity" :min="0" ></el-input>
      </el-form-item>
     .... 
    </el-form>
    <template #footer>
      <el-button @click='editDialogVisible=false' >取消</el-button>
      <el-button type="primary" :loading='addFormLoading' @click='handleAddConsumable' >提交</el-button>
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



</script>

<style scoped>




</style>