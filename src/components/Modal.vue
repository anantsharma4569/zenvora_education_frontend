<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

const props = withDefaults(defineProps<{ title: string; size?: "md" | "lg"; busy?: boolean }>(), {
	size: "lg",
	busy: false,
});
const emit = defineEmits<{ close: [] }>();

const onKey = (e: KeyboardEvent) => {
	if (e.key === "Escape" && !props.busy) emit("close");
};
let previousOverflow = "";

onMounted(() => {
	document.addEventListener("keydown", onKey);
	previousOverflow = document.body.style.overflow;
	document.body.style.overflow = "hidden";
});
onBeforeUnmount(() => {
	document.removeEventListener("keydown", onKey);
	document.body.style.overflow = previousOverflow;
});
</script>

<template>
	<div
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
		@mousedown.self="!busy && emit('close')"
	>
		<div
			role="dialog"
			aria-modal="true"
			:aria-label="title"
			class="my-6 w-full rounded-2xl bg-white shadow-2xl"
			:class="size === 'lg' ? 'max-w-2xl' : 'max-w-md'"
		>
			<div class="flex items-center justify-between border-b border-line px-6 py-4">
				<h2 class="text-[17px] font-semibold tracking-[-0.01em]">{{ title }}</h2>
				<button
					type="button"
					aria-label="Close"
					:disabled="busy"
					class="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-black/50 hover:bg-mint hover:text-accent disabled:opacity-40"
					@click="emit('close')"
				>
					×
				</button>
			</div>
			<div class="px-6 py-5"><slot /></div>
			<div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-6 py-4">
				<slot name="footer" />
			</div>
		</div>
	</div>
</template>
