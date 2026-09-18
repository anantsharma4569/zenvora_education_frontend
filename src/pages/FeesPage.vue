<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { FeeRow } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";
import EmptyState from "@/components/EmptyState.vue";

const { role } = storeToRefs(useSession());
const fees = ref<FeeRow[] | null>(null);
const error = ref<string | null>(null);

watch(
	role,
	(r) => {
		if (r === "teacher") return;
		error.value = null;
		(r === "student" ? api.getMyFees() : api.getFees())
			.then((v) => (fees.value = v))
			.catch((err) => (error.value = err.message));
	},
	{ immediate: true },
);
</script>

<template>
	<div>
		<PageHeader
			title="Fees / Billing"
			:subtitle="role === 'student' ? 'Your fee balance' : 'Invoices, payments and dues'"
		/>

		<EmptyState v-if="role === 'teacher'" label="Fees / Billing is not part of the Teacher view." />
		<template v-else>
			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="!fees" />
			<EmptyState v-else-if="fees.length === 0" label="No fee invoices yet." />
			<table v-else class="w-full text-left text-sm">
				<thead class="text-black/50">
					<tr>
						<th v-if="role !== 'student'" class="py-2">Student</th>
						<th class="py-2">Due Date</th>
						<th class="py-2">Total</th>
						<th class="py-2">Outstanding</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="f in fees" :key="f.name" class="border-t border-black/10">
						<td v-if="role !== 'student'" class="py-2">{{ f.student_name }}</td>
						<td class="py-2">{{ f.due_date }}</td>
						<td class="py-2">{{ f.grand_total }}</td>
						<td class="py-2">{{ f.outstanding_amount }}</td>
					</tr>
				</tbody>
			</table>
		</template>
	</div>
</template>
