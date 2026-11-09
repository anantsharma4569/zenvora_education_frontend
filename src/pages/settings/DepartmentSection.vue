<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.departments.list());

const fields: FieldDef[] = [
	{ key: "name", label: "Department Name", type: "text", required: true, placeholder: "e.g. Science", full: true },
];
</script>

<template>
	<ResourcePage
		title="Departments"
		singular="Department"
		description="Groups staff, classes and subjects, e.g. Science, Languages, Administration"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search departments..."
		:search-value="(r) => r.name"
		empty-label="No departments yet."
		:columns="[
			{ key: 'name', label: 'Department', sortable: true, value: (r) => r.name },
			{ key: 'staffCount', label: 'Staff', sortable: true, align: 'right', value: (r) => r.staffCount },
			{ key: 'classCount', label: 'Classes', sortable: true, align: 'right', value: (r) => r.classCount },
		]"
		:fields="fields"
		:empty-values="(): Values => ({ name: '' })"
		:reload="load"
		:on-create="(v) => api.departments.create({ name: v.name as string })"
		:load-for-edit="async (r) => ({ name: r.name })"
		:on-update="(r, v) => api.departments.update(r.id, { name: v.name as string })"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.departments.remove(r.id))"
	/>
</template>
