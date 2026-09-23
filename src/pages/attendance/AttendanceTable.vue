<script setup lang="ts">
import { onMounted, ref } from "vue";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";

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

const tableColumns: DataTableColumn<Record<string, unknown>>[] = props.columns.map((c) => ({
	key: c.key,
	label: c.label,
	sortable: true,
	value: (row) => String(row[c.key] ?? "-"),
}));
</script>

<template>
	<ErrorState v-if="error" :message="error" />
	<LoadingState v-else-if="!rows" />
	<DataTable v-else :rows="rows" :row-key="(row) => String(row.name ?? rows!.indexOf(row))" :columns="tableColumns" :empty-label="empty" />
</template>
