<script setup lang="ts">
// One invoice: what it's for, payments so far, and (for staff) recording a payment or
// cancelling it. The API refuses a payment larger than what's outstanding.
import { computed, ref, watch } from "vue";
import { api } from "@/lib/api";
import { btnDanger, btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import { formatDate, money, titleCase, toPaise, todayIso, toRupees } from "@/lib/format";
import type { InvoiceDetail, PaymentMethod } from "@/lib/types";
import Modal from "@/components/Modal.vue";
import FormField from "@/components/FormField.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";

const props = defineProps<{ invoiceId: string; canEdit: boolean }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const METHODS: { value: PaymentMethod; label: string }[] = [
	{ value: "UPI", label: "UPI" },
	{ value: "CASH", label: "Cash" },
	{ value: "CARD", label: "Card" },
	{ value: "BANK_TRANSFER", label: "Bank transfer" },
	{ value: "CHEQUE", label: "Cheque" },
];

const inv = ref<InvoiceDetail | null>(null);
const error = ref<string | null>(null);
const load = () =>
	api.fees
		.invoice(props.invoiceId)
		.then((v) => {
			inv.value = v;
			pay.value.amount = toRupees(v.outstanding);
		})
		.catch((e) => (error.value = e.message));
watch(() => props.invoiceId, load, { immediate: true });

const pay = ref({ amount: "", method: "UPI" as PaymentMethod, reference: "", paidOn: todayIso() });
const payError = ref<string | null>(null);
const busy = ref(false);
const confirmingCancel = ref(false);
const canPay = computed(() => props.canEdit && inv.value && inv.value.status !== "PAID" && inv.value.status !== "CANCELLED");

const recordPayment = async () => {
	if (!inv.value) return;
	const amount = toPaise(pay.value.amount || 0);
	if (amount <= 0) {
		payError.value = "Enter the amount received.";
		return;
	}
	if (amount > inv.value.outstanding) {
		payError.value = `That's more than the ${money(inv.value.outstanding)} outstanding.`;
		return;
	}
	busy.value = true;
	payError.value = null;
	try {
		await api.fees.pay(inv.value.id, { amount, method: pay.value.method, reference: pay.value.reference.trim() || null, paidOn: pay.value.paidOn });
		pay.value.reference = "";
		await load();
		emit("changed");
	} catch (e) {
		payError.value = (e as Error).message;
	} finally {
		busy.value = false;
	}
};

const cancelInvoice = async () => {
	if (!inv.value) return;
	busy.value = true;
	try {
		await api.fees.cancel(inv.value.id);
		confirmingCancel.value = false;
		await load();
		emit("changed");
	} catch (e) {
		payError.value = (e as Error).message;
		confirmingCancel.value = false;
	} finally {
		busy.value = false;
	}
};

const statusCls = (s: string) =>
	s === "PAID" ? "bg-mint text-accent" : s === "PARTIAL" ? "bg-amber-100 text-amber-800" : s === "CANCELLED" ? "bg-black/[0.06] text-black/50" : "bg-danger/10 text-danger";
</script>

<template>
	<Modal :title="inv ? `Invoice ${inv.number}` : 'Invoice'" :busy="busy" @close="emit('close')">
		<ErrorState v-if="error" :message="error" />
		<LoadingState v-else-if="!inv" />
		<div v-else class="flex flex-col gap-5 text-sm">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div class="font-semibold">{{ inv.student.name }}</div>
					<div class="text-black/55">{{ inv.student.admissionNo ?? "" }} · {{ inv.class.name }} · {{ inv.academicYear.name }}</div>
					<div class="text-black/55">Issued {{ formatDate(inv.issueDate) }} · Due {{ formatDate(inv.dueDate) }}</div>
				</div>
				<span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusCls(inv.status)">
					{{ inv.overdue ? "Overdue" : titleCase(inv.status) }}
				</span>
			</div>

			<table class="w-full">
				<tbody>
					<tr v-for="it in inv.items" :key="it.id" class="border-b border-line-soft">
						<td class="py-1.5">{{ it.feeCategory.name }}</td>
						<td class="py-1.5 text-right">{{ money(it.amount) }}</td>
					</tr>
					<tr class="font-semibold">
						<td class="pt-2">Total</td>
						<td class="pt-2 text-right">{{ money(inv.total) }}</td>
					</tr>
					<tr>
						<td class="text-black/55">Paid</td>
						<td class="text-right text-black/55">{{ money(inv.paid) }}</td>
					</tr>
					<tr class="font-semibold" :class="inv.outstanding ? 'text-danger' : 'text-accent'">
						<td>Outstanding</td>
						<td class="text-right">{{ money(inv.outstanding) }}</td>
					</tr>
				</tbody>
			</table>

			<div v-if="inv.payments.length">
				<h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/45">Payments</h3>
				<ul class="divide-y divide-line-soft">
					<li v-for="p in inv.payments" :key="p.id" class="flex justify-between gap-3 py-1.5">
						<span>{{ formatDate(p.paidOn) }} · {{ METHODS.find((m) => m.value === p.method)?.label ?? p.method }}<span v-if="p.reference" class="text-black/45"> · {{ p.reference }}</span></span>
						<span class="font-medium">{{ money(p.amount) }}</span>
					</li>
				</ul>
			</div>

			<form v-if="canPay" id="pay-form" class="rounded-xl border border-line p-4" novalidate @submit.prevent="recordPayment">
				<h3 class="mb-3 text-sm font-semibold">Record a payment</h3>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<FormField id="pay-amount" label="Amount (₹)" required>
						<input id="pay-amount" v-model="pay.amount" type="number" min="0.01" step="0.01" :class="[inputClass, 'w-full']" />
					</FormField>
					<FormField id="pay-method" label="Method" required>
						<select id="pay-method" v-model="pay.method" :class="[inputClass, 'w-full']">
							<option v-for="m in METHODS" :key="m.value" :value="m.value">{{ m.label }}</option>
						</select>
					</FormField>
					<FormField id="pay-date" label="Paid on" required>
						<input id="pay-date" v-model="pay.paidOn" type="date" :max="todayIso()" :class="[inputClass, 'w-full']" />
					</FormField>
					<FormField id="pay-ref" label="Reference" help="UPI or transaction id, cheque number, receipt no.">
						<input id="pay-ref" v-model="pay.reference" maxlength="80" :class="[inputClass, 'w-full']" />
					</FormField>
				</div>
				<p v-if="payError" role="alert" class="mt-3 text-sm font-medium text-danger">{{ payError }}</p>
			</form>
			<p v-else-if="payError" role="alert" class="text-sm font-medium text-danger">{{ payError }}</p>

			<div v-if="confirmingCancel" class="rounded-xl border border-danger/30 bg-danger/5 p-4">
				<p class="mb-3">Cancel this invoice? It stays on record but no longer counts as owed.</p>
				<div class="flex justify-end gap-2">
					<button :class="btnGhost" :disabled="busy" @click="confirmingCancel = false">Keep it</button>
					<button :class="btnDanger" :disabled="busy" @click="cancelInvoice">Cancel invoice</button>
				</div>
			</div>
		</div>
		<template #footer>
			<button
				v-if="canEdit && inv && inv.status === 'UNPAID' && !confirmingCancel"
				:class="[btnGhost, 'mr-auto text-danger']"
				:disabled="busy"
				@click="confirmingCancel = true"
			>
				Cancel invoice
			</button>
			<button :class="btnGhost" :disabled="busy" @click="emit('close')">Close</button>
			<button v-if="canPay" type="submit" form="pay-form" :class="btnPrimary" :disabled="busy">{{ busy ? "Saving..." : "Record payment" }}</button>
		</template>
	</Modal>
</template>
