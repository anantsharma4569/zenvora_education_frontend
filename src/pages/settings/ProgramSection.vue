<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.classes.list());
const { rows: departments } = useList(() => api.departments.list());

const fields = (): FieldDef[] => [
	{ key: "name", label: "Class Name", type: "text", required: true, placeholder: "e.g. Grade 10" },
	{
		key: "departmentId",
		label: "Department",
		type: "select",
		placeholder: "No department",
		options: departments.value.map((d) => ({ value: d.id, label: d.name })),
	},
];

const values = (v: Values) => ({ name: v.name as string, departmentId: (v.departmentId as string) || null });
</script>

<template>
	<ResourcePage
		title="Classes"
		singular="Class"
		description="The class or grade a student is enrolled in, e.g. Grade 1 to Grade 10"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search classes..."
		:search-value="(r) => r.name"
		empty-label="No classes yet."
		:columns="[
			{ key: 'name', label: 'Class', sortable: true, value: (r) => r.name },
			{ key: 'department', label: 'Department', sortable: true, value: (r) => r.department?.name ?? '-' },
			{ key: 'sectionCount', label: 'Sections', sortable: true, align: 'right', value: (r) => r.sectionCount },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ name: '', departmentId: '' })"
		:reload="load"
		:on-create="(v) => api.classes.create(values(v))"
		:load-for-edit="async (r) => ({ name: r.name, departmentId: r.departmentId ?? '' })"
		:on-update="(r, v) => api.classes.update(r.id, values(v))"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.classes.remove(r.id))"
	/>
</template>
