<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(api.listAcademicYears);

const endAfterStart = (v: Values) =>
	v.year_start_date && v.year_end_date && (v.year_end_date as string) <= (v.year_start_date as string)
		? "End date must be after the start date"
		: null;

const fields: FieldDef[] = [
	{ key: "academic_year_name", label: "Academic Year Name", type: "text", required: true, placeholder: "e.g. 2026-27", full: true },
	{ key: "year_start_date", label: "Start Date", type: "date", required: true },
	{ key: "year_end_date", label: "End Date", type: "date", required: true, validate: endAfterStart },
];
</script>

<template>
	<ResourcePage
		title="Academic Years"
		singular="Academic Year"
		description="A school session, e.g. 2026-27 (April to March)"
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="(r) => r.name"
		search-placeholder="Search academic years..."
		:search-value="(r) => r.name"
		empty-label="No academic years yet."
		:columns="[
			{ key: 'name', label: 'Academic Year', sortable: true, value: (r) => r.name },
			{ key: 'year_start_date', label: 'Starts', sortable: true, value: (r) => r.year_start_date || '' },
			{ key: 'year_end_date', label: 'Ends', sortable: true, value: (r) => r.year_end_date || '' },
		]"
		:fields="fields"
		:empty-values="(): Values => ({ academic_year_name: '', year_start_date: '', year_end_date: '' })"
		:reload="load"
		:on-create="
			(v) =>
				api.createAcademicYear({
					academic_year_name: v.academic_year_name as string,
					year_start_date: v.year_start_date as string,
					year_end_date: v.year_end_date as string,
				})
		"
		:load-for-edit="
			async (r) => {
				const rec = await api.getRecord('academic_year', r.name);
				return {
					academic_year_name: rec.academic_year_name as string,
					year_start_date: rec.year_start_date as string,
					year_end_date: rec.year_end_date as string,
				};
			}
		"
		:on-update="(r, v) => api.updateRecord('academic_year', r.name, v)"
		:on-delete="(list) => api.deleteRecords('academic_year', list.map((r) => r.name))"
	/>
</template>
