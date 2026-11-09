<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.designations.list());

const fields: FieldDef[] = [
	{ key: "name", label: "Designation", type: "text", required: true, placeholder: "e.g. Senior Teacher", full: true },
	{
		key: "isTeaching",
		label: "Teaching role",
		type: "checkbox",
		placeholder: "People in this role teach classes",
		help: "Used to split the staff directory into teaching and non-teaching staff.",
		full: true,
	},
];
</script>

<template>
	<ResourcePage
		title="Designations"
		singular="Designation"
		description="Job titles for staff, e.g. Principal, Teacher, Accountant"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search designations..."
		:search-value="(r) => r.name"
		empty-label="No designations yet."
		:columns="[
			{ key: 'name', label: 'Designation', sortable: true, value: (r) => r.name },
			{ key: 'isTeaching', label: 'Type', sortable: true, value: (r) => (r.isTeaching ? 'Teaching' : 'Non-teaching') },
		]"
		:fields="fields"
		:empty-values="(): Values => ({ name: '', isTeaching: false })"
		:reload="load"
		:on-create="(v) => api.designations.create({ name: v.name as string, isTeaching: v.isTeaching === true })"
		:load-for-edit="async (r) => ({ name: r.name, isTeaching: r.isTeaching })"
		:on-update="(r, v) => api.designations.update(r.id, { name: v.name as string, isTeaching: v.isTeaching === true })"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.designations.remove(r.id))"
	/>
</template>
