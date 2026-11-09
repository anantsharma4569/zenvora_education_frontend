<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import { formatDate } from "@/lib/format";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.academicYears.list());

const endAfterStart = (v: Values) =>
	v.startDate && v.endDate && (v.endDate as string) <= (v.startDate as string) ? "End date must be after the start date" : null;

const fields: FieldDef[] = [
	{ key: "name", label: "Academic Year Name", type: "text", required: true, placeholder: "e.g. 2026-27", full: true },
	{ key: "startDate", label: "Start Date", type: "date", required: true },
	{ key: "endDate", label: "End Date", type: "date", required: true, validate: endAfterStart },
];

const values = (v: Values) => ({ name: v.name as string, startDate: v.startDate as string, endDate: v.endDate as string });
</script>

<template>
	<ResourcePage
		title="Academic Years"
		singular="Academic Year"
		description="A school session, e.g. 2026-27 (April to March)"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search academic years..."
		:search-value="(r) => r.name"
		empty-label="No academic years yet."
		:columns="[
			{ key: 'name', label: 'Academic Year', sortable: true, value: (r) => r.name },
			{ key: 'startDate', label: 'Starts', sortable: true, value: (r) => r.startDate },
			{ key: 'endDate', label: 'Ends', sortable: true, value: (r) => r.endDate },
		]"
		:fields="fields"
		:empty-values="(): Values => ({ name: '', startDate: '', endDate: '' })"
		:reload="load"
		:on-create="(v) => api.academicYears.create(values(v))"
		:load-for-edit="async (r) => ({ name: r.name, startDate: r.startDate, endDate: r.endDate })"
		:on-update="(r, v) => api.academicYears.update(r.id, values(v))"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.academicYears.remove(r.id))"
	>
		<template #cell-startDate="{ row }">{{ formatDate(row.startDate) }}</template>
		<template #cell-endDate="{ row }">{{ formatDate(row.endDate) }}</template>
	</ResourcePage>
</template>
