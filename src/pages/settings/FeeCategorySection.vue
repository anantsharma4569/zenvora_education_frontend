<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.feeCategories.list());

const fields: FieldDef[] = [
	{ key: "name", label: "Fee Category Name", type: "text", required: true, placeholder: "e.g. Tuition Fee", full: true },
];
</script>

<template>
	<ResourcePage
		title="Fee Categories"
		singular="Fee Category"
		description="Types of fee, e.g. Tuition, Transport, Exam"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search fee categories..."
		:search-value="(r) => r.name"
		empty-label="No fee categories yet."
		:columns="[{ key: 'name', label: 'Fee Category', sortable: true, value: (r) => r.name }]"
		:fields="fields"
		:empty-values="(): Values => ({ name: '' })"
		:reload="load"
		:on-create="(v) => api.feeCategories.create({ name: v.name as string })"
		:load-for-edit="async (r) => ({ name: r.name })"
		:on-update="(r, v) => api.feeCategories.update(r.id, { name: v.name as string })"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.feeCategories.remove(r.id))"
	/>
</template>
