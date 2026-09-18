<script setup lang="ts">
import { SETTINGS_GROUPS } from "./nav";
</script>

<template>
	<div class="flex flex-col gap-6 sm:flex-row sm:gap-8">
		<nav class="w-56 shrink-0">
			<RouterLink to="/settings" class="mb-3 block text-sm font-medium text-black/60">← All Settings</RouterLink>
			<div class="flex flex-col gap-4">
				<div v-for="group in SETTINGS_GROUPS" :key="group.label">
					<div class="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-black/40">{{ group.label }}</div>
					<div class="flex flex-col gap-0.5">
						<RouterLink
							v-for="item in group.items"
							:key="item.slug"
							:to="`/settings/${item.slug}`"
							class="rounded-md px-2 py-1.5 text-sm text-black/70 hover:bg-black/5"
							active-class="bg-accent! text-white! hover:bg-accent!"
						>
							{{ item.label }}
						</RouterLink>
					</div>
				</div>
			</div>
		</nav>
		<div class="min-w-0 flex-1"><RouterView /></div>
	</div>
</template>
