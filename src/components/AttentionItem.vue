<script setup lang="ts">
withDefaults(
	defineProps<{ title: string; meta: string; tone?: "warn" | "danger" | "neutral"; href: string }>(),
	{ tone: "neutral" },
);
</script>

<template>
	<RouterLink
		:to="href"
		class="-mx-2.5 grid grid-cols-[7px_1fr] items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-black/[0.035]"
	>
		<span
			class="mt-[5px] h-[7px] w-[7px] rounded-full"
			:class="tone === 'danger' ? 'bg-danger' : tone === 'warn' ? 'bg-warn' : 'bg-black/30'"
		/>
		<span>
			<span class="block text-[13px] font-medium leading-snug text-pretty">{{ title }}</span>
			<span class="mt-0.5 block text-xs text-black/50">{{ meta }}</span>
		</span>
	</RouterLink>
</template>
