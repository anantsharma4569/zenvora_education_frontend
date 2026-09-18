<script setup lang="ts">
withDefaults(
	defineProps<{
		data: { label: string; value: number; tone?: "warn" | "danger" }[];
		max: number;
		height?: number;
		highlightLast?: boolean;
	}>(),
	{ height: 76 },
);
</script>

<template>
	<div class="flex items-end gap-1.5" :style="{ height: `${height}px` }">
		<div
			v-for="(d, i) in data"
			:key="d.label + i"
			class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
		>
			<div
				class="w-full rounded-t-[3px]"
				:class="
					d.tone === 'danger'
						? 'bg-danger'
						: d.tone === 'warn'
							? 'bg-warn'
							: (highlightLast && i === data.length - 1) || !highlightLast
								? 'bg-accent'
								: 'bg-black/[0.14]'
				"
				:style="{ height: `${(d.value / max) * 100}%` }"
			/>
			<div class="font-mono text-[9.5px] text-black/35">{{ d.label }}</div>
		</div>
	</div>
</template>
