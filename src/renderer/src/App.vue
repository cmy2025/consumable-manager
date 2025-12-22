<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  console.log('App.vue onMounted hook started');
  console.log('当前 URL:', window.location.href); // 打印当前 URL

  // 直接从 window.location.hash 解析查询参数
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  if (queryIndex !== -1) {
    const queryString = hash.slice(queryIndex + 1);
    const urlParams = new URLSearchParams(queryString);

    const userid = urlParams.get('userid');
    const username = urlParams.get('username');

    console.log('Userid from query:', userid);
    console.log('Username from query:', username);

    // 保存到 sessionStorage
    if (userid) {
      sessionStorage.setItem('userid', userid);
      console.log('Userid saved to sessionStorage:', userid);
    }
    if (username) {
      sessionStorage.setItem('username', username);
      console.log('Username saved to sessionStorage:', username);
    }

    // 可选：测试读取
    const savedUserid = sessionStorage.getItem('userid');
    const savedUsername = sessionStorage.getItem('username');
    console.log('Userid from session:', savedUserid);
    console.log('Username from session:', savedUsername);
  }

  console.log('App.vue onMounted hook finished');
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 0px;
}
</style>