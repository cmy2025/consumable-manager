<template>
  <div class="home-view">
    <div class="home">
    <h1>{{ title }}</h1>
    <!-- 原index.pug内容转换 -->
    <div class="container">
      <p>欢迎使用SOAP服务查询系统</p>
      <router-link to="/list" class="btn btn-primary">进入查询页面</router-link>
    </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
  data() {
    return {
      title: 'Express SOAP 服务'
    }
  }
}
</script>

<style scoped>
.home-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  box-sizing: border-box;
}
.container {
  margin: 20px;
  padding: 20px;
}
</style>