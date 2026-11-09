<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import { formatDate } from "@/lib/format";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.academicTerms.list());
const { rows: years } = useList(() => api.academicYears.list());

const yearOf = (v: Values) => years.value.find((y) => y.id === v.academicYearId);

const fields = (): FieldDef[] => [
	{
		key: "academicYearId",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.id, label: y.name })),
	},
	{ key: "name", label: "Term Name", type: "text", required: true, placeholder: "e.g. Term 1" },
	{ key: "startDate", label: "Start Date", type: "date", required: true, min: (v) => yearOf(v)?.startDate, max: (v) => yearOf(v)?.endDate },
	{
		key: "endDate",
		label: "End Date",
		type: "date",
		required: true,
		min: (v) => yearOf(v)?.startDate,
		max: (v) => yearOf(v)?.endDate,
		help: (v) => {
			const y = yearOf(v);
			return y ? `Within ${y.name}: ${formatDate(y.startDate)} to ${formatDate(y.endDate)}.` : undefined;
		},
		validate: (v) =>
			v.startDate && v.endDate && (v.endDate as string) <= (v.startDate as string) ? "End date must be after the start date" : null,
	},
];
</script>

<template>
	<ResourcePage
		title="Academic Terms"
		singular="Academic Term"
		description="Terms or semesters within an Academic Year"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => `${r.name} (${r.academicYear.name})`"
		search-placeholder="Search terms..."
		:search-value="(r) => `${r.name} ${r.academicYear.name}`"
		empty-label="No academic terms yet."
		:columns="[
			{ key: 'name', label: 'Term', sortable: true, value: (r) => r.name },
			{ key: 'academicYear', label: 'Academic Year', sortable: true, value: (r) => r.academicYear.name },
			{ key: 'startDate', label: 'Starts', sortable: true, value: (r) => r.startDate },
			{ key: 'endDate', label: 'Ends', sortable: true, value: (r) => r.endDate },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ academicYearId: '', name: '', startDate: '', endDate: '' })"
		:reload="load"
		:on-create="
			(v) =>
				api.academicTerms.create({
					academicYearId: v.academicYearId as string,
					name: v.name as string,
					startDate: v.startDate as string,
					endDate: v.endDate as string,
				})
		"
		:load-for-edit="async (r) => ({ academicYearId: r.academicYearId, name: r.name, startDate: r.startDate, endDate: r.endDate })"
		:on-update="(r, v) => api.academicTerms.update(r.id, { name: v.name as string, startDate: v.startDate as string, endDate: v.endDate as string })"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.academicTerms.remove(r.id))"
	>
		<template #cell-startDate="{ row }">{{ formatDate(row.startDate) }}</template>
		<template #cell-endDate="{ row }">{{ formatDate(row.endDate) }}</template>
	</ResourcePage>
</template>
