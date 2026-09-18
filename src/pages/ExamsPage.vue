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
</script>

<template>
	<div>
		<PageHeader
			title="Exams & Results"
			:subtitle="role === 'student' ? 'Your results' : 'Assessment results across your Student Groups'"
		/>

		<EmptyState v-if="role === 'accounts'" label="Exams & Results is not part of the Accounts view." />
		<template v-else>
			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="!results" />
			<EmptyState v-else-if="results.length === 0" label="No results recorded yet." />
			<table v-else class="w-full text-left text-sm">
				<thead class="text-black/50">
					<tr>
						<th v-if="role !== 'student'" class="py-2">Student</th>
						<th class="py-2">Course</th>
						<th class="py-2">Group</th>
						<th class="py-2">Score</th>
						<th class="py-2">Grade</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="r in results" :key="r.name" class="border-t border-black/10">
						<td v-if="role !== 'student'" class="py-2">{{ r.student_name }}</td>
						<td class="py-2">{{ r.course }}</td>
						<td class="py-2">{{ r.student_group }}</td>
						<td class="py-2">{{ r.total_score }} / {{ r.maximum_score }}</td>
						<td class="py-2">{{ r.grade }}</td>
					</tr>
				</tbody>
			</table>
		</template>
	</div>
</template>
