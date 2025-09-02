<template>
  <div class="coordinate-text">{{ mapStore.formattedCoordinate }}</div>
  
</template>

<script setup lang="ts">
import { useMapStore } from '@/stores/mapStore'

const mapStore = useMapStore()
</script>

<style scoped>
.coordinate-text {
  position: absolute;
  right: 16px;
  bottom: 50px;
  z-index: 1000;
  font-family: monospace;
  font-size: 12px;
  color: var(--text);
  text-shadow: 0 0 8px rgba(var(--accent-rgb),0.35);
  background: transparent;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
}
</style>
