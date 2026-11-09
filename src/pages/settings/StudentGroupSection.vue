<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.sections.list());
const { rows: classes } = useList(() => api.classes.list());
const { rows: years } = useList(() => api.academicYears.list());
const { rows: terms } = useList(() => api.academicTerms.list());

const fields = (): FieldDef[] => [
	{ key: "name", label: "Section Name", type: "text", required: true, placeholder: "e.g. Grade 10 - A", full: true },
	{
		key: "classId",
		label: "Class",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: classes.value.map((c) => ({ value: c.id, label: c.name })),
	},
	{
		key: "academicYearId",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.id, label: y.name })),
	},
	{
		key: "academicTermId",
		label: "Academic Term",
		type: "select",
		placeholder: "Whole year",
		options: (v) => terms.value.filter((t) => t.academicYearId === v.academicYearId).map((t) => ({ value: t.id, label: t.name })),
		disabled: (v) => !v.academicYearId,
		help: (v) => (v.academicYearId ? "Only if the section runs for one term." : "Pick an Academic Year first."),
	},
	{ key: "maxStrength", label: "Maximum Students", type: "number", placeholder: "Empty = no limit" },
	{ key: "isActive", label: "Active", type: "checkbox", placeholder: "Section is in use", hidden: (_v, editing) => !editing },
];

const maxOf = (v: Values) => (v.maxStrength ? Number(v.maxStrength) : null);
</script>

<template>
	<ResourcePage
		title="Sections"
		singular="Section"
		description="Class sections, e.g. Grade 10 - A. Students are placed into a section for the year."
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search sections..."
		:search-value="(r) => `${r.name} ${r.class.name}`"
		empty-label="No sections yet."
		:columns="[
			{ key: 'name', label: 'Section', sortable: true, value: (r) => r.name },
			{ key: 'class', label: 'Class', sortable: true, value: (r) => r.class.name },
			{ key: 'academicYear', label: 'Academic Year', value: (r) => r.academicYear.name },
			{ key: 'academicTerm', label: 'Term', value: (r) => r.academicTerm?.name ?? 'Whole year' },
			{ key: 'studentCount', label: 'Students', sortable: true, align: 'right', value: (r) => r.studentCount },
			{ key: 'maxStrength', label: 'Max', align: 'right', value: (r) => r.maxStrength || '-' },
			{ key: 'isActive', label: 'Status', value: (r) => (r.isActive ? 'Active' : 'Inactive') },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ name: '', classId: '', academicYearId: '', academicTermId: '', maxStrength: '', isActive: true })"
		:on-change-field="(key, next) => (key === 'academicYearId' ? { ...next, academicTermId: '' } : next)"
		:reload="load"
		:on-create="
			(v) =>
				api.sections.create({
					name: v.name as string,
					classId: v.classId as string,
					academicYearId: v.academicYearId as string,
					academicTermId: (v.academicTermId as string) || null,
					maxStrength: maxOf(v),
				})
		"
		:load-for-edit="
			async (r) => ({
				name: r.name,
				classId: r.classId,
				academicYearId: r.academicYearId,
				academicTermId: r.academicTermId ?? '',
				maxStrength: r.maxStrength ? String(r.maxStrength) : '',
				isActive: r.isActive,
			})
		"
		:on-update="
			(r, v) =>
				api.sections.update(r.id, {
					name: v.name as string,
					academicTermId: (v.academicTermId as string) || null,
					maxStrength: maxOf(v),
					isActive: v.isActive === true,
				})
		"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.sections.remove(r.id))"
	/>
</template>
