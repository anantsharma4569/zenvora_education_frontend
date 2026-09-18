<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: "Loading..." });
</script>

<template>
	<div class="rounded-lg border border-dashed border-black/10 p-6 text-sm text-black/50">{{ label }}</div>
</template>
