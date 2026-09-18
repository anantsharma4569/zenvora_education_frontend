<script setup lang="ts">
import { onMounted, ref } from "vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";
import EmptyState from "@/components/EmptyState.vue";

const props = defineProps<{
	fetch: () => Promise<object[]>;
	columns: { label: string; key: string }[];
	empty: string;
}>();

const rows = ref<Record<string, unknown>[] | null>(null);
const error = ref<string | null>(null);

onMounted(() =>
	props
		.fetch()
		.then((v) => (rows.value = v as Record<string, unknown>[]))
		.catch((err) => (error.value = err.message)),
);
</script>

<template>
	<ErrorState v-if="error" :message="error" />
	<LoadingState v-else-if="!rows" />
	<EmptyState v-else-if="rows.length === 0" :label="empty" />
	<table v-else class="w-full text-left text-sm">
		<thead class="text-black/50">
			<tr>
				<th v-for="c in columns" :key="c.key" class="py-2">{{ c.label }}</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="(row, i) in rows" :key="String(row.name ?? i)" class="border-t border-black/10">
				<td v-for="c in columns" :key="c.key" class="py-2">{{ row[c.key] }}</td>
			</tr>
		</tbody>
	</table>
</template>
