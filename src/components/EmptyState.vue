<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
	<div class="rounded-lg border border-dashed border-black/10 p-6 text-sm text-black/50">{{ label }}</div>
</template>
