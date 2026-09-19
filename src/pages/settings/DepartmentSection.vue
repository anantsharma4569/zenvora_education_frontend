<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(api.listDepartments);
const { rows: companies } = useList(api.listCompanies);

const fields = (): FieldDef[] => [
	{ key: "department_name", label: "Department Name", type: "text", required: true, placeholder: "e.g. Science" },
	{
		key: "company",
		label: "Company",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: companies.value.map((c) => ({ value: c.name, label: c.name })),
	},
];
</script>

<template>
	<ResourcePage
		title="Departments"
		singular="Department"
		description="Groups staff and classes, e.g. Academics, Administration"
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="(r) => r.department_name"
		search-placeholder="Search departments..."
		:search-value="(r) => r.department_name"
		empty-label="No departments yet."
		:columns="[
			{ key: 'department_name', label: 'Department', sortable: true, value: (r) => r.department_name },
			{ key: 'company', label: 'Company', sortable: true, value: (r) => r.company },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ department_name: '', company: '' })"
		:open-values="(): Values => (companies.length === 1 ? { company: companies[0].name } : {})"
		:reload="load"
		:on-create="(v) => api.createDepartment({ department_name: v.department_name as string, company: (v.company as string) || undefined })"
		:load-for-edit="async (r) => ({ department_name: r.department_name, company: r.company })"
		:on-update="(r, v) => api.updateRecord('department', r.name, { department_name: v.department_name })"
		:on-delete="(list) => api.deleteRecords('department', list.map((r) => r.name))"
	/>
</template>
