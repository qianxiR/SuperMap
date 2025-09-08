<template>
  <div class="button-group">
    <button
      v-for="btn in buttons"
      :key="btn.id"
      class="group-btn"
      :class="{ 'active': activeButton === btn.id }"
      @click="$emit('select', btn.id)"
    >
      {{ btn.text }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Button {
  id: string;
  text: string;
}

defineProps<{
  buttons: Button[];
  activeButton: string;
}>();

defineEmits(['select']);
</script>

<style scoped>
.button-group {
  display: flex;
  background-color: var(--panel);
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 4px;
  width: fit-content;
}

.group-btn {
  padding: 6px 16px;
  border: none;
  background-color: transparent;
  color: var(--text);
  cursor: pointer;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s ease;
  user-select: none;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
}

.group-btn.active {
  background-color: var(--accent);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.group-btn:not(.active):hover {
  background-color: var(--accent);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.group-btn:active:not(.active) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>
