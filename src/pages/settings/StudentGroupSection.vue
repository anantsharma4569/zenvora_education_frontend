<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(api.listStudentGroups);
const { rows: programs } = useList(api.listPrograms);
const { rows: years } = useList(api.listAcademicYears);
const { rows: terms } = useList(() => api.listAcademicTerms());

const fields = (): FieldDef[] => [
	{ key: "student_group_name", label: "Section Name", type: "text", required: true, placeholder: "e.g. Grade 10 - A", full: true },
	{
		key: "program",
		label: "Class (Program)",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: programs.value.map((p) => ({ value: p.name, label: p.program_name })),
	},
	{
		key: "academic_year",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.name, label: y.name })),
	},
	{
		key: "academic_term",
		label: "Academic Term",
		type: "select",
		options: (v) =>
			terms.value.filter((t) => t.academic_year === v.academic_year).map((t) => ({ value: t.name, label: t.term_name })),
		help: "Pick an Academic Year first.",
	},
	{ key: "max_strength", label: "Maximum Students", type: "number", placeholder: "0 = no limit" },
	{ key: "disabled", label: "Disabled", type: "checkbox", placeholder: "This section is disabled", hidden: (_v, editing) => !editing },
];
</script>

<template>
	<ResourcePage
		title="Student Groups"
		singular="Section"
		description="Class sections, e.g. Grade 10 - A. Students are placed into a section."
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="(r) => r.student_group_name"
		search-placeholder="Search sections..."
		:search-value="(r) => r.student_group_name"
		empty-label="No sections yet."
		:columns="[
			{ key: 'student_group_name', label: 'Section', sortable: true, value: (r) => r.student_group_name },
			{ key: 'program', label: 'Class', sortable: true, value: (r) => r.program },
			{ key: 'academic_year', label: 'Academic Year', value: (r) => r.academic_year },
			{ key: 'academic_term', label: 'Term', value: (r) => r.academic_term || '-' },
			{ key: 'student_count', label: 'Students', sortable: true, align: 'right', value: (r) => r.student_count ?? 0 },
			{ key: 'max_strength', label: 'Max', align: 'right', value: (r) => r.max_strength || '-' },
			{ key: 'disabled', label: 'Status', value: (r) => (r.disabled ? 'Disabled' : 'Active') },
		]"
		:fields="fields()"
		:empty-values="
			(): Values => ({
				student_group_name: '',
				program: '',
				academic_year: '',
				academic_term: '',
				max_strength: '',
				disabled: false,
			})
		"
		:on-change-field="(key, next) => (key === 'academic_year' ? { ...next, academic_term: '' } : next)"
		:reload="load"
		:on-create="
			(v) =>
				api.createStudentGroup({
					student_group_name: v.student_group_name as string,
					program: v.program as string,
					academic_year: v.academic_year as string,
					academic_term: (v.academic_term as string) || undefined,
					max_strength: v.max_strength ? Number(v.max_strength) : undefined,
				})
		"
		:load-for-edit="
			async (r) => {
				const rec = await api.getRecord('student_group', r.name);
				return {
					student_group_name: rec.student_group_name as string,
					program: r.program,
					academic_year: r.academic_year,
					academic_term: rec.academic_term as string,
					max_strength: rec.max_strength === '0' ? '' : (rec.max_strength as string),
					disabled: rec.disabled === '1',
				};
			}
		"
		:on-update="
			(r, v) =>
				api.updateRecord('student_group', r.name, {
					student_group_name: v.student_group_name,
					academic_term: v.academic_term,
					max_strength: v.max_strength || 0,
					disabled: v.disabled ? 1 : 0,
				})
		"
		:on-delete="(list) => api.deleteRecords('student_group', list.map((r) => r.name))"
	/>
</template>
