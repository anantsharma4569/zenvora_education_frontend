<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import { btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import { formatDate, money, titleCase, todayIso } from "@/lib/format";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";
import EmptyState from "@/components/EmptyState.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";
import FormField from "@/components/FormField.vue";
import InvoiceDetail from "./fees/InvoiceDetail.vue";

const { role } = storeToRefs(useSession());
const isBilling = computed(() => role.value === "admin" || role.value === "accounts");

const tab = ref<"invoices" | "generate">("invoices");
const invoices = ref<Invoice[] | null>(null);
const error = ref<string | null>(null);
const openId = ref<string | null>(null);

// ── Invoice list ────────────────────────────────────────────────────────────
const statusFilter = ref<InvoiceStatus | "">("");
const classFilter = ref("");
const overdueOnly = ref(false);
const { rows: classes, load: loadClasses } = useList(() => api.classes.list(), false);
const { rows: structures, load: loadStructures } = useList(() => api.feeStructures.list(), false);

let seq = 0;
const load = () => {
	const mine = ++seq;
	error.value = null;
	const req = isBilling.value
		? api.fees.invoices({ status: statusFilter.value || undefined, classId: classFilter.value || undefined, overdue: overdueOnly.value || undefined })
		: api.fees.mine();
	req.then((v) => mine === seq && (invoices.value = v)).catch((err) => mine === seq && (error.value = err.message));
};
watch(
	role,
	(r) => {
		if (r === "teacher") return;
		if (isBilling.value) {
			loadClasses();
			loadStructures();
		}
		load();
	},
	{ immediate: true },
);
watch([statusFilter, classFilter, overdueOnly], () => {
	invoices.value = null;
	load();
});

const totals = computed(() => {
	const list = (invoices.value ?? []).filter((i) => i.status !== "CANCELLED");
	return {
		billed: list.reduce((n, i) => n + i.total, 0),
		paid: list.reduce((n, i) => n + i.paid, 0),
		outstanding: list.reduce((n, i) => n + i.outstanding, 0),
	};
});

const columns: DataTableColumn<Invoice>[] = [
	{ key: "number", label: "Invoice", sortable: true, value: (i) => i.number },
	{ key: "student", label: "Student", sortable: true, value: (i) => i.student.name },
	{ key: "class", label: "Class", sortable: true, value: (i) => i.class.name },
	{ key: "dueDate", label: "Due", sortable: true, value: (i) => i.dueDate },
	{ key: "total", label: "Total", sortable: true, align: "right", value: (i) => i.total },
	{ key: "outstanding", label: "Outstanding", sortable: true, align: "right", value: (i) => i.outstanding },
	{ key: "status", label: "Status", sortable: true, value: (i) => (i.overdue ? "OVERDUE" : i.status) },
];
const statusCls = (i: Invoice) =>
	i.overdue
		? "bg-danger/10 text-danger"
		: i.status === "PAID"
			? "bg-mint text-accent"
			: i.status === "PARTIAL"
				? "bg-amber-100 text-amber-800"
				: i.status === "CANCELLED"
					? "bg-black/[0.06] text-black/50"
					: "bg-black/[0.06] text-black/70";

// ── Generate invoices from a fee structure ─────────────────────────────────
const structureLabel = (s: (typeof structures.value)[number]) =>
	`${s.class.name} · ${s.academicYear.name}${s.academicTerm ? ` · ${s.academicTerm.name}` : ""} (${money(s.total)})`;
const gen = ref({ feeStructureId: "", issueDate: todayIso(), dueDate: "" });
const genErrors = ref<Record<string, string>>({});
const genError = ref<string | null>(null);
const genBusy = ref(false);
const genResult = ref<{ created: number; alreadyBilled: number; totalPerStudent: number } | null>(null);
const generate = async () => {
	const errs: Record<string, string> = {};
	if (!gen.value.feeStructureId) errs.feeStructureId = "Pick a fee structure";
	if (!gen.value.dueDate) errs.dueDate = "Due date is required";
	else if (gen.value.issueDate && gen.value.dueDate < gen.value.issueDate) errs.dueDate = "Due date must be on or after the issue date";
	genErrors.value = errs;
	if (Object.keys(errs).length) return;
	genBusy.value = true;
	genError.value = null;
	try {
		genResult.value = await api.fees.generate({
			feeStructureId: gen.value.feeStructureId,
			dueDate: gen.value.dueDate,
			issueDate: gen.value.issueDate || undefined,
		});
		loadStructures();
		load();
	} catch (e) {
		genError.value = (e as Error).message;
	} finally {
		genBusy.value = false;
	}
};
const tabCls = (on: boolean) =>
	`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${on ? "border-accent text-accent" : "border-transparent text-black/50 hover:text-black"}`;
</script>

<template>
	<div>
		<PageHeader title="Fees / Billing" :subtitle="role === 'student' ? 'Your fee invoices and balance' : 'Invoices, payments and dues'" />

		<EmptyState v-if="role === 'teacher'" label="Fees / Billing is not part of the Teacher view." />

		<!-- Student -->
		<template v-else-if="role === 'student'">
			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="!invoices" />
			<EmptyState v-else-if="invoices.length === 0" label="No fee invoices yet." />
			<template v-else>
				<p class="mb-4 text-sm">
					Outstanding <span class="font-semibold" :class="totals.outstanding ? 'text-danger' : 'text-accent'">{{ money(totals.outstanding) }}</span>
					<span class="text-black/50"> of {{ money(totals.billed) }} billed</span>
				</p>
				<table class="w-full text-left text-sm">
					<thead class="text-black/50">
						<tr>
							<th class="py-2">Invoice</th>
							<th class="py-2">Due</th>
							<th class="py-2 text-right">Total</th>
							<th class="py-2 text-right">Paid</th>
							<th class="py-2 text-right">Outstanding</th>
							<th class="py-2 pl-4">Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="f in invoices" :key="f.id" class="border-t border-black/10">
							<td class="py-2 font-medium">{{ f.number }}</td>
							<td class="py-2">{{ formatDate(f.dueDate) }}</td>
							<td class="py-2 text-right">{{ money(f.total) }}</td>
							<td class="py-2 text-right">{{ money(f.paid) }}</td>
							<td class="py-2 text-right font-medium">{{ money(f.outstanding) }}</td>
							<td class="py-2 pl-4">
								<span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusCls(f)">{{ f.overdue ? "Overdue" : titleCase(f.status) }}</span>
							</td>
						</tr>
					</tbody>
				</table>
			</template>
		</template>

		<!-- Admin / accounts -->
		<template v-else>
			<div class="mb-4 flex gap-2 border-b border-line">
				<button :class="tabCls(tab === 'invoices')" @click="tab = 'invoices'">Invoices</button>
				<button :class="tabCls(tab === 'generate')" @click="tab = 'generate'">Generate invoices</button>
			</div>

			<template v-if="tab === 'invoices'">
				<div v-if="invoices" class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div class="rounded-xl border border-line p-4">
						<div class="text-xs text-black/50">Billed</div>
						<div class="text-lg font-semibold">{{ money(totals.billed) }}</div>
					</div>
					<div class="rounded-xl border border-line p-4">
						<div class="text-xs text-black/50">Collected</div>
						<div class="text-lg font-semibold text-accent">{{ money(totals.paid) }}</div>
					</div>
					<div class="rounded-xl border border-line p-4">
						<div class="text-xs text-black/50">Outstanding</div>
						<div class="text-lg font-semibold text-danger">{{ money(totals.outstanding) }}</div>
					</div>
				</div>
				<ErrorState v-if="error" :message="error" />
				<LoadingState v-else-if="!invoices" />
				<DataTable
					v-else
					:rows="invoices"
					:row-key="(i) => i.id"
					:columns="columns"
					search-placeholder="Search student, admission no. or invoice..."
					:search-value="(i) => `${i.student.name} ${i.student.admissionNo ?? ''} ${i.number}`"
					empty-label="No invoices match these filters."
					has-row-actions
				>
					<template #filters>
						<select v-model="statusFilter" aria-label="Filter by status" :class="inputClass">
							<option value="">All statuses</option>
							<option value="UNPAID">Unpaid</option>
							<option value="PARTIAL">Partly paid</option>
							<option value="PAID">Paid</option>
							<option value="CANCELLED">Cancelled</option>
						</select>
						<select v-model="classFilter" aria-label="Filter by class" :class="inputClass">
							<option value="">All classes</option>
							<option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
						</select>
						<label class="flex items-center gap-1.5 text-[13px] text-black/70">
							<input v-model="overdueOnly" type="checkbox" class="h-4 w-4 accent-[#0f7b4a]" /> Overdue only
						</label>
					</template>
					<template #cell-dueDate="{ row }">{{ formatDate(row.dueDate) }}</template>
					<template #cell-total="{ row }">{{ money(row.total) }}</template>
					<template #cell-outstanding="{ row }">
						<span :class="row.outstanding ? 'font-medium' : 'text-black/40'">{{ money(row.outstanding) }}</span>
					</template>
					<template #cell-status="{ row }">
						<span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusCls(row)">{{ row.overdue ? "Overdue" : titleCase(row.status) }}</span>
					</template>
					<template #row-actions="{ row }">
						<div class="flex justify-end">
							<button class="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black/70 hover:border-accent hover:bg-mint hover:text-accent" @click="openId = row.id">
								{{ row.status === "UNPAID" || row.status === "PARTIAL" ? "Collect" : "View" }}
							</button>
						</div>
					</template>
				</DataTable>
			</template>

			<div v-else class="max-w-xl">
				<p class="mb-4 text-sm text-black/60">
					Creates one invoice for every student enrolled in the structure's class that year. Students who already have an invoice for
					that structure are skipped, so it is safe to run again after new admissions.
				</p>
				<div v-if="genResult" class="mb-4 rounded-xl bg-mint px-4 py-3 text-sm text-accent">
					<strong>{{ genResult.created }}</strong> invoice{{ genResult.created === 1 ? "" : "s" }} created at {{ money(genResult.totalPerStudent) }} each.
					<template v-if="genResult.alreadyBilled"> {{ genResult.alreadyBilled }} already had one and were skipped.</template>
				</div>
				<form class="flex flex-col gap-3.5" novalidate @submit.prevent="generate">
					<FormField id="gen-structure" label="Fee structure" required :error="genErrors.feeStructureId">
						<select id="gen-structure" v-model="gen.feeStructureId" :class="[inputClass, 'w-full']">
							<option value="">Select fee structure...</option>
							<option v-for="s in structures" :key="s.id" :value="s.id">{{ structureLabel(s) }}</option>
						</select>
					</FormField>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<FormField id="gen-issue" label="Issue date">
							<input id="gen-issue" v-model="gen.issueDate" type="date" :class="[inputClass, 'w-full']" />
						</FormField>
						<FormField id="gen-due" label="Due date" required :error="genErrors.dueDate">
							<input id="gen-due" v-model="gen.dueDate" type="date" :min="gen.issueDate || undefined" :class="[inputClass, 'w-full']" />
						</FormField>
					</div>
					<p v-if="genError" role="alert" class="text-sm font-medium text-danger">{{ genError }}</p>
					<div class="flex gap-2">
						<button type="submit" :class="btnPrimary" :disabled="genBusy">{{ genBusy ? "Generating..." : "Generate invoices" }}</button>
						<button v-if="genResult" type="button" :class="btnGhost" @click="tab = 'invoices'">View invoices</button>
					</div>
				</form>
			</div>
		</template>

		<InvoiceDetail v-if="openId" :invoice-id="openId" :can-edit="isBilling" @close="openId = null" @changed="load" />
	</div>
</template>
