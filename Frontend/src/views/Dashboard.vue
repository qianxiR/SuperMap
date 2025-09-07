<template>
  <div class="dashboard">
    <!-- 主要内容区域 -->
    <main class="dashboard-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// Dashboard作为容器，通过router-view渲染子路由组件
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.dashboard-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
