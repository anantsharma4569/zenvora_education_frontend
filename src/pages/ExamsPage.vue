<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { ResultRow } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";
import EmptyState from "@/components/EmptyState.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";

const { role } = storeToRefs(useSession());
const results = ref<ResultRow[] | null>(null);
const error = ref<string | null>(null);

watch(
	role,
	(r) => {
		if (r === "accounts") return;
		error.value = null;
		(r === "student" ? api.getMyResults() : api.getResults())
			.then((v) => (results.value = v))
			.catch((err) => (error.value = err.message));
	},
	{ immediate: true },
);

const columns = (studentColumn: boolean): DataTableColumn<ResultRow>[] => [
	...(studentColumn ? [{ key: "student_name", label: "Student", sortable: true, value: (r: ResultRow) => r.student_name }] : []),
	{ key: "course", label: "Course", sortable: true, value: (r) => r.course },
	{ key: "student_group", label: "Group", sortable: true, value: (r) => r.student_group },
	{ key: "total_score", label: "Score", sortable: true, align: "right" as const, value: (r) => r.total_score },
	{ key: "grade", label: "Grade", sortable: true, value: (r) => r.grade },
];
</script>

<template>
	<div>
		<PageHeader title="Exams & Results" :subtitle="role === 'student' ? 'Your results' : 'Assessment results across your Student Groups'" />

		<EmptyState v-if="role === 'accounts'" label="Exams & Results is not part of the Accounts view." />
		<template v-else>
			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="!results" />
			<DataTable
				v-else
				:rows="results"
				:row-key="(r) => r.name"
				:columns="columns(role !== 'student')"
				:search-placeholder="role === 'student' ? undefined : 'Search by student name...'"
				:search-value="role === 'student' ? undefined : (r) => r.student_name"
				empty-label="No results recorded yet."
			>
				<template #cell-total_score="{ row }">{{ row.total_score }} / {{ row.maximum_score }}</template>
			</DataTable>
		</template>
	</div>
</template>
