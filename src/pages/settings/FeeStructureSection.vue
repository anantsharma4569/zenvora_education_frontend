<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import { inputClass } from "@/lib/styles";
import { money, toPaise, toRupees } from "@/lib/format";
import type { FieldDef, Values } from "@/lib/resource";
import type { FeeStructure } from "@/lib/types";
import ResourcePage from "@/components/ResourcePage.vue";

/** One line of the form; amount is typed in rupees. */
type Item = { feeCategoryId: string; amount: string };

const { rows, load } = useList(() => api.feeStructures.list());
const { rows: classes } = useList(() => api.classes.list());
const { rows: years } = useList(() => api.academicYears.list());
const { rows: terms } = useList(() => api.academicTerms.list());
const { rows: categories } = useList(() => api.feeCategories.list());

const blank = (): Item => ({ feeCategoryId: "", amount: "" });
const itemsOf = (v: Values) => (v.items as Item[] | undefined) ?? [];

const validItems = (v: Values): string | null => {
	const list = itemsOf(v);
	if (list.length === 0 || list.some((c) => !c.feeCategoryId || c.amount === "" || Number(c.amount) < 0)) {
		return "Every line needs a fee category and an amount";
	}
	if (new Set(list.map((c) => c.feeCategoryId)).size !== list.length) return "Each fee category can appear only once";
	return null;
};

const fields = (): FieldDef[] => [
	{
		key: "classId",
		label: "Class",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: classes.value.map((c) => ({ value: c.id, label: c.name })),
	},
	{
		key: "academicYearId",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.id, label: y.name })),
	},
	{
		key: "academicTermId",
		label: "Academic Term",
		type: "select",
		placeholder: "Whole year",
		options: (v) => terms.value.filter((t) => t.academicYearId === v.academicYearId).map((t) => ({ value: t.id, label: t.name })),
		disabled: (v) => !v.academicYearId,
		help: (v) => (v.academicYearId ? undefined : "Pick an Academic Year first."),
	},
	{ key: "items", label: "Fees", type: "custom", required: true, validate: validItems },
];

const label = (r: FeeStructure) => `${r.class.name} · ${r.academicYear.name}${r.academicTerm ? ` · ${r.academicTerm.name}` : ""}`;
const payloadItems = (v: Values) => itemsOf(v).map((c) => ({ feeCategoryId: c.feeCategoryId, amount: toPaise(c.amount) }));
const formTotal = (v: Values) => itemsOf(v).reduce((n, c) => n + toPaise(c.amount || 0), 0);
const setItem = (values: Values, i: number, patch: Partial<Item>) => ({
	items: itemsOf(values).map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
});
</script>

<template>
	<ResourcePage
		title="Fee Structures"
		singular="Fee Structure"
		description="What each class pays for a year or term. Invoices are generated from these on the Fees page."
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="label"
		search-placeholder="Search fee structures..."
		:search-value="label"
		empty-label="No fee structures yet."
		:columns="[
			{ key: 'class', label: 'Class', sortable: true, value: (r) => r.class.name },
			{ key: 'academicYear', label: 'Academic Year', sortable: true, value: (r) => r.academicYear.name },
			{ key: 'academicTerm', label: 'Term', value: (r) => r.academicTerm?.name ?? 'Whole year' },
			{ key: 'items', label: 'Fees', value: (r) => r.items.map((i) => i.feeCategory.name).join(', ') },
			{ key: 'total', label: 'Total', sortable: true, align: 'right', value: (r) => r.total },
			{ key: 'invoiceCount', label: 'Invoices', align: 'right', value: (r) => r.invoiceCount },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ classId: '', academicYearId: '', academicTermId: '', items: [blank()] })"
		:on-change-field="(key, next) => (key === 'academicYearId' ? { ...next, academicTermId: '' } : next)"
		:reload="load"
		:on-create="
			(v) =>
				api.feeStructures.create({
					classId: v.classId as string,
					academicYearId: v.academicYearId as string,
					academicTermId: (v.academicTermId as string) || null,
					items: payloadItems(v),
				})
		"
		:load-for-edit="
			async (r) => ({
				classId: r.classId,
				academicYearId: r.academicYearId,
				academicTermId: r.academicTermId ?? '',
				items: r.items.map((i) => ({ feeCategoryId: i.feeCategoryId, amount: toRupees(i.amount) })),
			})
		"
		:on-update="(r, v) => api.feeStructures.update(r.id, { academicTermId: (v.academicTermId as string) || null, items: payloadItems(v) })"
		:on-delete="(list) => deleteEach(list, label, (r) => api.feeStructures.remove(r.id))"
	>
		<template #cell-total="{ row }">{{ money(row.total) }}</template>
		<template #field-items="{ values, set, error }">
			<div class="flex flex-col gap-2">
				<div v-for="(c, i) in itemsOf(values)" :key="i" class="flex gap-2">
					<select
						aria-label="Fee category"
						:class="['min-w-0 flex-1', inputClass]"
						:value="c.feeCategoryId"
						@change="set(setItem(values, i, { feeCategoryId: ($event.target as HTMLSelectElement).value }))"
					>
						<option value="">Select fee category...</option>
						<option v-for="fc in categories" :key="fc.id" :value="fc.id">{{ fc.name }}</option>
					</select>
					<input
						aria-label="Amount in rupees"
						type="number"
						min="0"
						step="0.01"
						placeholder="Amount (₹)"
						:class="['w-36', inputClass]"
						:value="c.amount"
						@input="set(setItem(values, i, { amount: ($event.target as HTMLInputElement).value }))"
					/>
					<button
						v-if="itemsOf(values).length > 1"
						type="button"
						class="rounded-full border border-black/15 px-3 text-xs font-medium text-danger hover:bg-danger/5"
						@click="set({ items: itemsOf(values).filter((_, idx) => idx !== i) })"
					>
						Remove
					</button>
				</div>
				<div class="flex items-center justify-between">
					<button
						type="button"
						class="w-fit rounded-full border border-black/15 px-3.5 py-1 text-xs font-medium text-accent hover:bg-mint"
						@click="set({ items: [...itemsOf(values), blank()] })"
					>
						+ Add fee
					</button>
					<span class="text-sm font-medium">Total {{ money(formTotal(values)) }}</span>
				</div>
				<p class="text-[12px] text-black/50">Changes don't affect invoices already issued. A structure with invoices can't be deleted.</p>
				<p v-if="error" role="alert" class="text-[12px] font-medium text-danger">{{ error }}</p>
			</div>
		</template>
	</ResourcePage>
</template>
