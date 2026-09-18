<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<h2 class="text-[15px] font-semibold tracking-[-0.01em]">{{ title }}</h2>
		<slot name="action" />
	</div>
</template>
