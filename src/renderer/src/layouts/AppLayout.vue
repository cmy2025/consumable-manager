<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <div class="sidebar-container" :class="{ collapsed: isCollapsed }">
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical-demo"
        router
        background-color="#303133"
        text-color="#fff"
        active-text-color="#ffd04b"
      >
        <!-- 原有的菜单项 -->
        <el-menu-item index="/">
          <img
            src="../assets/catalog.png"
            alt="Home"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '首页' }}</template>
        </el-menu-item>
        <el-menu-item index="/consumable-info">
          <img
            src="../assets/catalog.png"
            alt="Document"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '耗材信息管理' }}</template>
        </el-menu-item>
        <el-menu-item index="/consumable-in-record">
          <img
            src="../assets/catalog.png"
            alt="Upload"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '耗材入库记录管理' }}</template>
        </el-menu-item>
        <el-menu-item index="/consumable-out-record">
          <img
            src="../assets/catalog.png"
            alt="Download"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '耗材出库记录管理' }}</template>
        </el-menu-item>
        <el-menu-item index="/record-query">
          <img
            src="../assets/catalog.png"
            alt="Search"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '耗材出入库记录查询' }}</template>
        </el-menu-item>
        <el-menu-item index="/consumable-statistics">
          <img
            src="../assets/catalog.png"
            alt="Pie Chart"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '统计分析' }}</template>
        </el-menu-item>
        <el-menu-item index="/prediction">
          <img
            src="../assets/catalog.png"
            alt="Pie Chart"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '预测库存' }}</template>
        </el-menu-item>
        <!-- 新增的设置菜单项 -->
        <el-menu-item index="/settings">
          <img
            src="../assets/catalog.png"
            alt="Setting"
            style="width: 16px; height: 16px; margin-right: 8px"
          />
          <template #title>{{ isCollapsed ? '' : '设置' }}</template>
        </el-menu-item>
        
      </el-menu>

      <!-- 折叠按钮，替换成图片 -->
      <div class="collapse-btn" @click="toggleCollapse">
        <img src="../assets/cat3.png" alt="Collapse" style="width: 45px; height: 45px" />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content" :class="{ expanded: isCollapsed }">
      <div class="header">
        <h1 class="title">耗材管理系统</h1>
      </div>
      <div class="content-wrapper">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isCollapsed = ref(false)

// 计算属性：根据当前路由动态设置激活的菜单项
const activeMenu = computed(() => {
  return route.path
})

// 切换侧边栏折叠状态
const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebarCollapsed', isCollapsed.value.toString())
}

onMounted(() => {
  console.log('当前路由:', route.path)

  // 从本地存储恢复折叠状态
  const storedCollapsed = localStorage.getItem('sidebarCollapsed')
  if (storedCollapsed !== null) {
    isCollapsed.value = storedCollapsed === 'true'
  }
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

.sidebar-container {
  position: relative;
  transition: width 0.1s ease;
  z-index: 10;
}

.el-menu-vertical-demo {
  height: 100vh;
  border-right: 1px solid #e6e6e6;
  transition: width 0.1s ease;
}

/* 展开状态 */
.sidebar-container:not(.collapsed) {
  width: 200px;
}

.sidebar-container:not(.collapsed) .el-menu-vertical-demo {
  width: 200px;
}

/* 折叠状态，留少一点侧边 */
.sidebar-container.collapsed {
  width: 10px;
  
}

.sidebar-container.collapsed .el-menu-vertical-demo {
  width: 5px;
}

.sidebar-container.collapsed .el-menu-item {
  text-align: center;
  overflow: hidden;
  width: 5px;
  padding: 0;
}

.sidebar-container.collapsed .el-menu-item img {
  display: block;
  margin: 0 auto;
  width: 16px;
  height: 16px;
}

.sidebar-container.collapsed .el-menu-item span {
  display: none;
  /* 隐藏菜单项文字 */
}

.sidebar-container.collapsed .el-submenu__title span {
  display: none;
}
.collapse-btn {
  position: absolute;
  top: 0px;
  right: -30px;
  width: 60px;
  height: 43px;
  border-radius: 50%;
  /* 核心修改：移除背景色，设置完全透明 */
  background-color: transparent;
  /* 移除默认边框（可选，避免出现边框） */
  border: none;
  /* 移除内边距（可选，避免影响图片居中） */
  padding: 0;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* 移除阴影（可选，透明背景下阴影会显得突兀） */
  box-shadow: none;
  z-index: 20;
  /* 确保点击区域生效（可选） */
  pointer-events: auto;
}

.collapse-btn img {
  opacity: 1;
  /* 默认不透明 */
  transition: opacity 0.1s ease;
  /* 添加过渡效果 */
  /* 可选：让图片填满按钮区域，保持圆形 */
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
}

.collapse-btn img:hover {
  opacity: 1;
  /* 调整悬停透明度（0.3太淡，建议0.7更友好，可自行修改） */
}

/* 可选：如果需要保留点击反馈，添加:active状态 */
.collapse-btn:active img {
  opacity: 0.5;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: padding-left 0.3s ease;
  height: 100vh;
  box-sizing: border-box;
}

/* 当侧边栏折叠时，主内容区域增加左内边距 */
.main-content.expanded {
  padding-left: 0px;
}

.header {
  flex-shrink: 0;
  padding: 10px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
}

.header .title {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.main-content > .router-view {
  flex: 1;
  overflow-y: auto;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  height: 100%;
}
/* 侧边栏展开时的行高 */
.main-content:not(.expanded) .el-table tr {
  line-height: 13px; /* 设置展开时的行高 */
}

/* 侧边栏收起时的行高 */
.main-content.expanded .el-table tr {
  line-height: 13px; /* 设置收起时的行高 */
}
/* 确保所有子页面都能正确填充空间 */
.content-wrapper > * {
  min-height: 100%;
  width: 100%;
}
</style>
