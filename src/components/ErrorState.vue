<script setup lang="ts">
defineProps<{ message: string }>();
</script>

<template>
	<div class="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">{{ message }}</div>
</template>
