<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.listAcademicTerms());
const { rows: years } = useList(api.listAcademicYears);

const fields = (): FieldDef[] => [
	{
		key: "academic_year",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.name, label: y.name })),
	},
	{ key: "term_name", label: "Term Name", type: "text", required: true, placeholder: "e.g. Term 1" },
	{ key: "term_start_date", label: "Start Date", type: "date", required: true },
	{
		key: "term_end_date",
		label: "End Date",
		type: "date",
		required: true,
		validate: (v) =>
			v.term_start_date && v.term_end_date && (v.term_end_date as string) <= (v.term_start_date as string)
				? "End date must be after the start date"
				: null,
	},
];
</script>

<template>
	<ResourcePage
		title="Academic Terms"
		singular="Academic Term"
		description="Terms or semesters within an Academic Year"
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="(r) => r.name"
		search-placeholder="Search terms..."
		:search-value="(r) => r.name"
		empty-label="No academic terms yet."
		:columns="[
			{ key: 'term_name', label: 'Term', sortable: true, value: (r) => r.term_name },
			{ key: 'academic_year', label: 'Academic Year', sortable: true, value: (r) => r.academic_year },
			{ key: 'term_start_date', label: 'Starts', sortable: true, value: (r) => r.term_start_date || '' },
			{ key: 'term_end_date', label: 'Ends', sortable: true, value: (r) => r.term_end_date || '' },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ academic_year: '', term_name: '', term_start_date: '', term_end_date: '' })"
		:reload="load"
		:on-create="
			(v) =>
				api.createAcademicTerm({
					academic_year: v.academic_year as string,
					term_name: v.term_name as string,
					term_start_date: v.term_start_date as string,
					term_end_date: v.term_end_date as string,
				})
		"
		:load-for-edit="
			async (r) => ({
				academic_year: r.academic_year,
				term_name: r.term_name,
				term_start_date: r.term_start_date,
				term_end_date: r.term_end_date,
			})
		"
		:on-update="
			(r, v) =>
				api.updateRecord('academic_term', r.name, {
					term_name: v.term_name,
					term_start_date: v.term_start_date,
					term_end_date: v.term_end_date,
				})
		"
		:on-delete="(list) => api.deleteRecords('academic_term', list.map((r) => r.name))"
	/>
</template>
