<script setup lang="ts">
import Label from "./Label.vue";

defineProps<{ label: string; value: string | number; note?: string; tone?: "warn" | "danger"; to?: string }>();
</script>

<template>
	<component
		:is="to ? 'RouterLink' : 'div'"
		:to="to"
		class="flex min-h-[116px] flex-col justify-between rounded-xl border border-line bg-surface p-[16px_18px]"
		:class="to ? 'cursor-pointer transition-colors hover:border-accent hover:bg-mint/40' : ''"
	>
		<Label>{{ label }}</Label>
		<div
			class="mt-2.5 text-[29px] font-semibold leading-none tracking-[-0.03em]"
			:class="tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : ''"
		>
			{{ value }}
		</div>
		<div v-if="note" class="mt-2 text-xs text-black/50">{{ note }}</div>
	</component>
</template>
