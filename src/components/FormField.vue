<script setup lang="ts">
/** A labelled form field: visible name, red * when mandatory, "(optional)" otherwise, inline error. */
defineProps<{ id: string; label: string; required?: boolean; error?: string; help?: string; full?: boolean }>();
</script>

<template>
	<div :class="full ? 'sm:col-span-2' : ''">
		<label :for="id" class="mb-1 block text-[12.5px] font-medium text-black/70">
			{{ label }}
			<span v-if="required" class="ml-0.5 text-danger" title="Required">*</span>
			<span v-else class="ml-1 font-normal text-black/40">(optional)</span>
		</label>
		<slot />
		<p v-if="help && !error" class="mt-1 text-[11.5px] text-black/45">{{ help }}</p>
		<p v-if="error" role="alert" class="mt-1 text-[12px] font-medium text-danger">{{ error }}</p>
	</div>
</template>
