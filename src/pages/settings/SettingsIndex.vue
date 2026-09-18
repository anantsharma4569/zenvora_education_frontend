<script setup lang="ts">
import PageHeader from "@/components/PageHeader.vue";
import { SETTINGS_GROUPS } from "./nav";
</script>

<template>
	<div>
		<PageHeader title="Settings" subtitle="Configure your school's setup, academics, and fees" />
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div v-for="group in SETTINGS_GROUPS" :key="group.label" class="rounded-lg border border-black/10 p-4">
				<div class="mb-2 text-sm font-semibold">{{ group.label }}</div>
				<ul class="flex flex-col gap-1">
					<li v-for="item in group.items" :key="item.slug">
						<RouterLink :to="`/settings/${item.slug}`" class="text-sm text-black/70 hover:text-black hover:underline">
							{{ item.label }}
						</RouterLink>
					</li>
				</ul>
			</div>
		</div>
	</div>
</template>
