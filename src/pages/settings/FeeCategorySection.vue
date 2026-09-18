<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(api.listFeeCategories);

const fields: FieldDef[] = [
	{ key: "category_name", label: "Fee Category Name", type: "text", required: true, placeholder: "e.g. Tuition Fee", full: true },
];
</script>

<template>
	<ResourcePage
		title="Fee Categories"
		singular="Fee Category"
		description="Types of fee, e.g. Tuition, Transport, Exam"
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="(r) => r.category_name"
		search-placeholder="Search fee categories..."
		:search-value="(r) => r.category_name"
		empty-label="No fee categories yet."
		:columns="[{ key: 'category_name', label: 'Fee Category', sortable: true, value: (r) => r.category_name }]"
		:fields="fields"
		:empty-values="(): Values => ({ category_name: '' })"
		:reload="load"
		:on-create="(v) => api.createFeeCategory({ category_name: v.category_name as string })"
		:load-for-edit="async (r) => ({ category_name: r.category_name })"
		:on-update="(r, v) => api.updateRecord('fee_category', r.name, { category_name: v.category_name })"
		:on-delete="(list) => api.deleteRecords('fee_category', list.map((r) => r.name))"
	/>
</template>
