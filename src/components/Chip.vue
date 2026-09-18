<script setup lang="ts">
export type ChipTone = "ok" | "warn" | "bad" | "neutral";

withDefaults(defineProps<{ tone?: ChipTone }>(), { tone: "neutral" });

const CHIP: Record<ChipTone, string> = {
	ok: "bg-[rgba(22,120,90,0.10)] text-[oklch(0.45_0.10_165)]",
	warn: "bg-[rgba(180,120,20,0.13)] text-[oklch(0.48_0.12_70)]",
	bad: "bg-[rgba(190,60,50,0.10)] text-[oklch(0.48_0.15_25)]",
	neutral: "bg-black/[0.06] text-black/60",
};
</script>

<template>
	<span class="inline-block rounded-full px-2.5 py-[3px] text-xs font-medium" :class="CHIP[tone]"><slot /></span>
</template>
