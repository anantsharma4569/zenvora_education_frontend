<script setup lang="ts" generic="T">
import { computed, ref, useTemplateRef, watchEffect } from "vue";
import EmptyState from "./EmptyState.vue";

export interface DataTableColumn<R> {
	key: string;
	label: string;
	sortable?: boolean;
	align?: "left" | "right";
	/** Display text and sort key. Override the display with a `#cell-<key>` slot. */
	value?: (row: R) => string | number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const props = withDefaults(
	defineProps<{
		columns: DataTableColumn<T>[];
		rows: T[];
		rowKey: (row: T) => string;
		searchPlaceholder?: string;
		searchValue?: (row: T) => string;
		emptyLabel?: string;
		pageSize?: number;
		/** Width below which the table scrolls horizontally instead of squashing. */
		minWidth?: number;
		/** Adds a checkbox column (select-all covers every filtered row, not just this page). */
		selectable?: boolean;
		/** Adds a right-hand Actions column filled by the `row-actions` slot. */
		hasRowActions?: boolean;
	}>(),
	{ searchPlaceholder: "Search…", emptyLabel: "No records found.", pageSize: 10, minWidth: 560 },
);

const selected = defineModel<Set<string>>("selected", { default: () => new Set<string>() });

const search = ref("");
const sortKey = ref<string | null>(null);
const sortDir = ref<"asc" | "desc">("asc");
const page = ref(0);
const rowsPerPage = ref(props.pageSize);

const filtered = computed(() => {
	if (!search.value || !props.searchValue) return props.rows;
	const needle = search.value.toLowerCase();
	return props.rows.filter((r) => props.searchValue!(r).toLowerCase().includes(needle));
});

const sorted = computed(() => {
	if (!sortKey.value) return filtered.value;
	const column = props.columns.find((c) => c.key === sortKey.value);
	if (!column?.value) return filtered.value;
	const withValues = filtered.value.map((r) => ({ row: r, v: column.value!(r) }));
	withValues.sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0));
	if (sortDir.value === "desc") withValues.reverse();
	return withValues.map((w) => w.row);
});

const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / rowsPerPage.value)));
const clampedPage = computed(() => Math.min(page.value, totalPages.value - 1));
const paged = computed(() =>
	sorted.value.slice(clampedPage.value * rowsPerPage.value, clampedPage.value * rowsPerPage.value + rowsPerPage.value),
);

const toggleSort = (column: DataTableColumn<T>) => {
	if (!column.sortable || !column.value) return;
	if (sortKey.value === column.key) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
	else {
		sortKey.value = column.key;
		sortDir.value = "asc";
	}
};

const filteredKeys = computed(() => sorted.value.map(props.rowKey));
const allSelected = computed(
	() => props.selectable && filteredKeys.value.length > 0 && filteredKeys.value.every((k) => selected.value.has(k)),
);
const someSelected = computed(() => props.selectable && filteredKeys.value.some((k) => selected.value.has(k)));

const toggleAll = () => {
	const next = new Set(selected.value);
	if (allSelected.value) filteredKeys.value.forEach((k) => next.delete(k));
	else filteredKeys.value.forEach((k) => next.add(k));
	selected.value = next;
};
const toggleOne = (key: string) => {
	const next = new Set(selected.value);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	selected.value = next;
};

const selectAllBox = useTemplateRef<HTMLInputElement>("selectAllBox");
watchEffect(() => {
	if (selectAllBox.value) selectAllBox.value.indeterminate = !allSelected.value && !!someSelected.value;
});

const checkbox = "h-4 w-4 cursor-pointer rounded border-black/30 accent-[#0f7b4a]";
const pill = "rounded-full border border-black/[0.15] px-3 py-1 hover:bg-mint disabled:opacity-45";
</script>

<template>
	<div class="rounded-2xl border border-line bg-surface px-[18px] pb-3.5 pt-4">
		<div class="mb-3.5 flex flex-wrap items-center gap-2.5">
			<input
				v-if="searchValue"
				v-model="search"
				:placeholder="searchPlaceholder"
				class="min-w-0 flex-[1_1_210px] rounded-full border border-black/[0.15] bg-transparent px-4 py-2 text-[13px] outline-none placeholder:text-black/40 focus:border-accent focus:ring-2 focus:ring-accent/15"
				@input="page = 0"
			/>
			<div v-else class="flex-1" />
			<slot name="filters" />
			<slot name="actions" />
		</div>

		<div
			v-if="selectable && selected.size > 0 && $slots['bulk-bar']"
			class="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-mint px-4 py-2.5 text-[13px]"
		>
			<span class="font-semibold text-accent">{{ selected.size }} selected</span>
			<slot name="bulk-bar" />
		</div>

		<EmptyState v-if="rows.length === 0" :label="emptyLabel" />
		<template v-else>
			<div class="-mx-[18px] overflow-x-auto px-[18px]">
				<table class="w-full text-left text-[13px]" :style="{ minWidth: `${minWidth}px` }">
					<thead>
						<tr>
							<th v-if="selectable" class="w-9 pb-2.5 pr-2">
								<input
									ref="selectAllBox"
									type="checkbox"
									aria-label="Select all"
									:class="checkbox"
									:checked="allSelected"
									@change="toggleAll"
								/>
							</th>
							<th
								v-for="c in columns"
								:key="c.key"
								class="whitespace-nowrap pb-2.5 pr-4 text-[11px] font-medium uppercase tracking-[0.07em] text-black/40"
								:class="[
									c.align === 'right' ? 'text-right' : 'text-left',
									c.sortable ? 'cursor-pointer select-none hover:text-black/70' : '',
								]"
								@click="toggleSort(c)"
							>
								{{ c.label }}{{ c.sortable && sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : "" }}
							</th>
							<th
								v-if="hasRowActions"
								class="whitespace-nowrap pb-2.5 text-right text-[11px] font-medium uppercase tracking-[0.07em] text-black/40"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in paged"
							:key="rowKey(row)"
							:class="selected.has(rowKey(row)) ? 'bg-mint/60' : 'hover:bg-mint/30'"
						>
							<td v-if="selectable" class="border-t border-line-soft py-2.5 pr-2">
								<input
									type="checkbox"
									aria-label="Select row"
									:class="checkbox"
									:checked="selected.has(rowKey(row))"
									@change="toggleOne(rowKey(row))"
								/>
							</td>
							<td
								v-for="c in columns"
								:key="c.key"
								class="whitespace-nowrap border-t border-line-soft py-2.5 pr-4 tabular-nums"
								:class="c.align === 'right' ? 'text-right' : 'text-left'"
							>
								<slot :name="`cell-${c.key}`" :row="row">{{ c.value ? c.value(row) : "" }}</slot>
							</td>
							<td v-if="hasRowActions" class="whitespace-nowrap border-t border-line-soft py-2 text-right">
								<slot name="row-actions" :row="row" />
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div
				class="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3 text-xs text-black/50"
			>
				<div class="flex items-center gap-2">
					<span>Showing {{ paged.length }} of {{ sorted.length }}</span>
					<label class="flex items-center gap-1.5">
						<span>·</span>
						<select
							v-model.number="rowsPerPage"
							class="rounded-full border border-black/[0.15] bg-transparent px-2 py-1 text-xs"
							@change="page = 0"
						>
							<option v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="size">{{ size }} per page</option>
						</select>
					</label>
				</div>
				<div v-if="totalPages > 1" class="flex items-center gap-2">
					<button :disabled="clampedPage === 0" :class="pill" @click="page = Math.max(0, clampedPage - 1)">
						Prev
					</button>
					<span>Page {{ clampedPage + 1 }} of {{ totalPages }}</span>
					<button
						:disabled="clampedPage >= totalPages - 1"
						:class="pill"
						@click="page = Math.min(totalPages - 1, clampedPage + 1)"
					>
						Next
					</button>
				</div>
			</div>
		</template>
	</div>
</template>
