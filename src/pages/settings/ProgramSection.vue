<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(api.listPrograms);
const { rows: departments } = useList(api.listDepartments);

const fields = (): FieldDef[] => [
	{ key: "program_name", label: "Program Name", type: "text", required: true, placeholder: "e.g. Grade 10" },
	{
		key: "department",
		label: "Department",
		type: "select",
		options: departments.value.map((d) => ({ value: d.name, label: d.department_name })),
	},
];
</script>

<template>
	<ResourcePage
		title="Programs"
		singular="Program"
		description="The class or grade a student is enrolled in, e.g. Grade 1 to Grade 10"
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="(r) => r.program_name"
		search-placeholder="Search programs..."
		:search-value="(r) => r.program_name"
		empty-label="No programs yet."
		:columns="[
			{ key: 'program_name', label: 'Program', sortable: true, value: (r) => r.program_name },
			{ key: 'department', label: 'Department', sortable: true, value: (r) => r.department || '-' },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ program_name: '', department: '' })"
		:reload="load"
		:on-create="(v) => api.createProgram({ program_name: v.program_name as string, department: (v.department as string) || undefined })"
		:load-for-edit="async (r) => ({ program_name: r.program_name, department: r.department || '' })"
		:on-update="(r, v) => api.updateRecord('program', r.name, { program_name: v.program_name, department: v.department })"
		:on-delete="(list) => api.deleteRecords('program', list.map((r) => r.name))"
	/>
</template>
