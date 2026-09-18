<script setup lang="ts">
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import { inputClass } from "@/lib/styles";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

type Component = { fees_category: string; amount: string };

const { rows, load } = useList(api.listFeeStructures);
const { rows: programs } = useList(api.listPrograms);
const { rows: years } = useList(api.listAcademicYears);
const { rows: terms } = useList(() => api.listAcademicTerms());
const { rows: categories } = useList(api.listFeeCategories);

const blank = (): Component => ({ fees_category: "", amount: "" });

const validComponents = (v: Values): string | null => {
	const list = (v.components as Component[]) ?? [];
	if (list.length === 0 || list.some((c) => !c.fees_category || c.amount === "" || Number(c.amount) < 0)) {
		return "Every fee component needs a Fee Category and an Amount";
	}
	return null;
};

const fields = (): FieldDef[] => [
	{
		key: "program",
		label: "Class (Program)",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: programs.value.map((p) => ({ value: p.name, label: p.program_name })),
	},
	{
		key: "academic_year",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.name, label: y.name })),
	},
	{
		key: "academic_term",
		label: "Academic Term",
		type: "select",
		options: (v) =>
			terms.value.filter((t) => t.academic_year === v.academic_year).map((t) => ({ value: t.name, label: t.term_name })),
		help: "Pick an Academic Year first.",
	},
	{ key: "components", label: "Fee Components", type: "custom", required: true, validate: validComponents },
];

const label = (r: { program: string; academic_year: string }) => `${r.program} · ${r.academic_year}`;

const listOf = (values: Values) => (values.components as Component[]) ?? [];
const money = (n: number | string) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
</script>

<template>
	<ResourcePage
		title="Fee Structures"
		singular="Fee Structure"
		description="What each class pays for an academic year, split into fee components"
		:rows="rows"
		:row-key="(r) => r.name"
		:row-label="label"
		search-placeholder="Search fee structures..."
		:search-value="label"
		empty-label="No fee structures yet."
		:columns="[
			{ key: 'program', label: 'Class', sortable: true, value: (r) => r.program },
			{ key: 'academic_year', label: 'Academic Year', sortable: true, value: (r) => r.academic_year },
			{ key: 'academic_term', label: 'Term', value: (r) => r.academic_term || '-' },
			{ key: 'total_amount', label: 'Total', sortable: true, align: 'right', value: (r) => r.total_amount },
		]"
		:fields="fields()"
		:empty-values="(): Values => ({ program: '', academic_year: '', academic_term: '', components: [blank()] })"
		:on-change-field="(key, next) => (key === 'academic_year' ? { ...next, academic_term: '' } : next)"
		:reload="load"
		:on-create="
			(v) =>
				api.createFeeStructure({
					program: v.program as string,
					academic_year: v.academic_year as string,
					academic_term: (v.academic_term as string) || undefined,
					components: listOf(v).map((c) => ({ fees_category: c.fees_category, amount: Number(c.amount) })),
				})
		"
		:load-for-edit="
			async (r) => {
				const rec = await api.getRecord('fee_structure', r.name);
				return {
					program: r.program,
					academic_year: r.academic_year,
					academic_term: rec.academic_term as string,
					components: rec.components as Component[],
				};
			}
		"
		:on-update="(r, v) => api.updateRecord('fee_structure', r.name, { academic_term: v.academic_term, components: v.components })"
		:on-delete="(list) => api.deleteRecords('fee_structure', list.map((r) => r.name))"
	>
		<template #cell-total_amount="{ row }">{{ money(row.total_amount) }}</template>
		<template #field-components="{ values, set, error }">
			<div class="flex flex-col gap-2">
				<div v-for="(c, i) in listOf(values)" :key="i" class="flex gap-2">
					<select
						aria-label="Fee Category"
						:class="['min-w-0 flex-1', inputClass]"
						:value="c.fees_category"
						@change="set({ components: listOf(values).map((x, idx) => (idx === i ? { ...x, fees_category: ($event.target as HTMLSelectElement).value } : x)) })"
					>
						<option value="">Select Fee Category...</option>
						<option v-for="fc in categories" :key="fc.name" :value="fc.name">{{ fc.category_name }}</option>
					</select>
					<input
						aria-label="Amount"
						type="number"
						min="0"
						placeholder="Amount"
						:class="['w-32', inputClass]"
						:value="c.amount"
						@input="set({ components: listOf(values).map((x, idx) => (idx === i ? { ...x, amount: ($event.target as HTMLInputElement).value } : x)) })"
					/>
					<button
						v-if="listOf(values).length > 1"
						type="button"
						class="rounded-full border border-black/15 px-3 text-xs font-medium text-danger hover:bg-danger/5"
						@click="set({ components: listOf(values).filter((_, idx) => idx !== i) })"
					>
						Remove
					</button>
				</div>
				<button
					type="button"
					class="w-fit rounded-full border border-black/15 px-3.5 py-1 text-xs font-medium text-accent hover:bg-mint"
					@click="set({ components: [...listOf(values), blank()] })"
				>
					+ Add component
				</button>
				<p v-if="error" role="alert" class="text-[12px] font-medium text-danger">{{ error }}</p>
			</div>
		</template>
	</ResourcePage>
</template>
