<script setup lang="ts">
defineProps<{ pct: number; tone?: "warn" | "danger" }>();
</script>

<template>
	<div class="h-2 min-w-0 overflow-hidden rounded-full bg-black/[0.06]">
		<div
			class="h-full rounded-full"
			:class="tone === 'danger' ? 'bg-danger' : tone === 'warn' ? 'bg-warn' : 'bg-accent'"
			:style="{ width: `${pct}%` }"
		/>
	</div>
</template>
