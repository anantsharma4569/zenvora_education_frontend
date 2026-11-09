<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api, deleteEach } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import type { Subject } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import ErrorState from "@/components/ErrorState.vue";
import DataTable from "@/components/DataTable.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const { role } = storeToRefs(useSession());
const subjects = ref<Subject[]>([]);
const error = ref<string | null>(null);
const { rows: departments, load: loadDepartments } = useList(() => api.departments.list(), false);

const load = () => {
	error.value = null;
	return api.subjects
		.list()
		.then((v) => (subjects.value = v))
		.catch((err) => (error.value = err.message));
};

onMounted(load);
watch(role, (r) => r === "admin" && loadDepartments(), { immediate: true });

const columns = [
	{ key: "name", label: "Subject", sortable: true, value: (c: Subject) => c.name },
	{ key: "department", label: "Department", sortable: true, value: (c: Subject) => c.department?.name ?? "-" },
	{ key: "description", label: "Description", value: (c: Subject) => c.description || "-" },
];

const fields = (): FieldDef[] => [
	{ key: "name", label: "Subject Name", type: "text", required: true, placeholder: "e.g. Mathematics", full: true },
	{
		key: "departmentId",
		label: "Department",
		type: "select",
		placeholder: "No department",
		options: departments.value.map((d) => ({ value: d.id, label: d.name })),
	},
	{ key: "description", label: "Description", type: "textarea", placeholder: "What this subject covers" },
];

const values = (v: Values) => ({
	name: v.name as string,
	departmentId: (v.departmentId as string) || null,
	description: (v.description as string).trim() || null,
});
</script>

<template>
	<div>
		<template v-if="error">
			<PageHeader title="Subjects" subtitle="Subjects taught across classes" />
			<ErrorState :message="error" />
		</template>
		<template v-else-if="role !== 'admin'">
			<PageHeader title="Subjects" subtitle="Subjects taught across classes" />
			<DataTable
				:rows="subjects"
				:row-key="(c) => c.id"
				search-placeholder="Search subjects..."
				:search-value="(c) => c.name"
				empty-label="No subjects yet."
				:columns="columns"
			/>
		</template>
		<ResourcePage
			v-else
			title="Subjects"
			singular="Subject"
			description="Subjects taught across classes"
			:rows="subjects"
			:row-key="(c) => c.id"
			:row-label="(c) => c.name"
			search-placeholder="Search subjects..."
			:search-value="(c) => c.name"
			empty-label="No subjects yet."
			:columns="columns"
			:fields="fields()"
			:empty-values="(): Values => ({ name: '', departmentId: '', description: '' })"
			:reload="load"
			:on-create="(v) => api.subjects.create(values(v))"
			:load-for-edit="async (c) => ({ name: c.name, departmentId: c.departmentId ?? '', description: c.description ?? '' })"
			:on-update="(c, v) => api.subjects.update(c.id, values(v))"
			:on-delete="(list) => deleteEach(list, (c) => c.name, (c) => api.subjects.remove(c.id))"
		/>
	</div>
</template>
