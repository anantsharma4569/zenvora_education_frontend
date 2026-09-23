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
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";

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

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const columns = (studentColumn: boolean): DataTableColumn<FeeRow>[] => [
	...(studentColumn ? [{ key: "student_name", label: "Student", sortable: true, value: (f: FeeRow) => f.student_name }] : []),
	{ key: "due_date", label: "Due Date", sortable: true, value: (f) => f.due_date },
	{ key: "grand_total", label: "Total", sortable: true, align: "right" as const, value: (f) => f.grand_total },
	{ key: "outstanding_amount", label: "Outstanding", sortable: true, align: "right" as const, value: (f) => f.outstanding_amount },
];
</script>

<template>
	<div>
		<PageHeader title="Fees / Billing" :subtitle="role === 'student' ? 'Your fee balance' : 'Invoices, payments and dues'" />

		<EmptyState v-if="role === 'teacher'" label="Fees / Billing is not part of the Teacher view." />
		<template v-else>
			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="!fees" />
			<DataTable
				v-else
				:rows="fees"
				:row-key="(f) => f.name"
				:columns="columns(role !== 'student')"
				:search-placeholder="role === 'student' ? undefined : 'Search by student name...'"
				:search-value="role === 'student' ? undefined : (f) => f.student_name"
				empty-label="No fee invoices yet."
			>
				<template #cell-grand_total="{ row }">{{ money(row.grand_total) }}</template>
				<template #cell-outstanding_amount="{ row }">
					<span :class="row.outstanding_amount > 0 ? 'font-medium text-danger' : 'text-accent'">{{ money(row.outstanding_amount) }}</span>
				</template>
			</DataTable>
		</template>
	</div>
</template>
