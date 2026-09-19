<script setup lang="ts" generic="Row">
import { computed, ref, shallowRef, useId, watch } from "vue";
import DataTable, { type DataTableColumn } from "./DataTable.vue";
import FormField from "./FormField.vue";
import Modal from "./Modal.vue";
import { btnDanger, btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import type { DeleteResult, FieldDef, Val, Values } from "@/lib/resource";

const props = withDefaults(
	defineProps<{
		title: string;
		/** Singular noun for the button and dialog titles: "Student" -> "+ Add Student". */
		singular: string;
		description?: string;
		rows: Row[];
		rowKey: (row: Row) => string;
		rowLabel: (row: Row) => string;
		columns: DataTableColumn<Row>[];
		searchPlaceholder?: string;
		searchValue?: (row: Row) => string;
		emptyLabel?: string;
		fields: FieldDef[];
		emptyValues: () => Values;
		onCreate: (values: Values) => Promise<unknown>;
		loadForEdit?: (row: Row) => Promise<Values>;
		onUpdate?: (row: Row, values: Values) => Promise<unknown>;
		onDelete?: (rows: Row[]) => Promise<DeleteResult[]>;
		/** "Disable" for records that keep history (students, staff). */
		deleteVerb?: "Delete" | "Disable";
		/** Side effects of changing a field (e.g. picking a class clears the section). */
		onChangeField?: (key: string, next: Values, prev: Values) => Values;
		reload: () => void | Promise<unknown>;
		/** Extra values the Add form opens with (e.g. the only company). */
		openValues?: () => Values;
	}>(),
	{ deleteVerb: "Delete" },
);

const uid = useId();
const mode = shallowRef<null | { editing: Row | null }>(null);
const values = ref<Values>({});
const fieldErrors = ref<Record<string, string>>({});
const formError = ref<string | null>(null);
const loadingEdit = ref(false);
const saving = ref(false);
const notice = ref<string | null>(null);

const selected = ref<Set<string>>(new Set());
const confirming = shallowRef<Row[] | null>(null);
const deleting = ref(false);
const deleteResults = ref<DeleteResult[] | null>(null);

// Drop selections for rows that no longer exist (after a delete/reload/filter change).
watch(
	() => props.rows,
	(rows) => {
		const keys = new Set(rows.map(props.rowKey));
		const next = new Set([...selected.value].filter((k) => keys.has(k)));
		if (next.size !== selected.value.size) selected.value = next;
	},
);

let noticeTimer: ReturnType<typeof setTimeout> | undefined;
watch(notice, (n) => {
	clearTimeout(noticeTimer);
	if (n) noticeTimer = setTimeout(() => (notice.value = null), 4000);
});

const editing = computed(() => mode.value?.editing ?? null);
const isEditing = computed(() => editing.value !== null);

const openAdd = () => {
	values.value = { ...props.emptyValues(), ...(props.openValues ? props.openValues() : {}) };
	fieldErrors.value = {};
	formError.value = null;
	mode.value = { editing: null };
};

const openEdit = async (row: Row) => {
	fieldErrors.value = {};
	formError.value = null;
	mode.value = { editing: row };
	values.value = { ...props.emptyValues() };
	if (!props.loadForEdit) return;
	loadingEdit.value = true;
	try {
		values.value = { ...props.emptyValues(), ...(await props.loadForEdit(row)) };
	} catch (err) {
		formError.value = (err as Error).message;
	} finally {
		loadingEdit.value = false;
	}
};

const closeForm = () => {
	if (!saving.value) mode.value = null;
};

const clearError = (key: string) => {
	if (!fieldErrors.value[key]) return;
	const { [key]: _removed, ...rest } = fieldErrors.value;
	void _removed;
	fieldErrors.value = rest;
};

const setField = (key: string, value: Val) => {
	const prev = values.value;
	const next = { ...prev, [key]: value };
	values.value = props.onChangeField ? props.onChangeField(key, next, prev) : next;
	clearError(key);
};

const setPatch = (key: string, patch: Values) => {
	values.value = { ...values.value, ...patch };
	clearError(key);
};

const isEmpty = (v: Val | undefined) =>
	v === undefined || v === "" || v === false || (Array.isArray(v) && v.length === 0);

const visibleFields = computed(() =>
	props.fields.filter((f) => !(f.createOnly && isEditing.value) && !f.hidden?.(values.value, isEditing.value)),
);

const isRequired = (f: FieldDef) => !!(f.required || f.requiredWhen?.(values.value));

const validate = () => {
	const errs: Record<string, string> = {};
	for (const f of visibleFields.value) {
		if (isEditing.value && f.lockedOnEdit) continue;
		if (isRequired(f) && isEmpty(values.value[f.key])) errs[f.key] = `${f.label} is required`;
		else if (f.validate) {
			const msg = f.validate(values.value);
			if (msg) errs[f.key] = msg;
		}
	}
	return errs;
};

const submit = async () => {
	const errs = validate();
	fieldErrors.value = errs;
	if (Object.keys(errs).length > 0) {
		formError.value = "Please fix the highlighted fields.";
		return;
	}
	formError.value = null;
	saving.value = true;
	try {
		if (isEditing.value) await props.onUpdate?.(editing.value as Row, values.value);
		else await props.onCreate(values.value);
		notice.value = `${props.singular} ${isEditing.value ? "updated" : "created"}.`;
		mode.value = null;
		await props.reload();
	} catch (err) {
		formError.value = (err as Error).message;
	} finally {
		saving.value = false;
	}
};

const runDelete = async () => {
	if (!confirming.value || !props.onDelete) return;
	deleting.value = true;
	try {
		const results = await props.onDelete(confirming.value);
		await props.reload();
		const failed = results.filter((r) => !r.ok);
		if (failed.length === 0) {
			notice.value = `${results.length} record${results.length === 1 ? "" : "s"} ${props.deleteVerb === "Disable" ? "disabled" : "deleted"}.`;
			confirming.value = null;
			selected.value = new Set();
		} else {
			deleteResults.value = results;
			selected.value = new Set(failed.map((f) => f.name));
		}
	} catch (err) {
		deleteResults.value = [{ name: "", ok: false, message: (err as Error).message }];
	} finally {
		deleting.value = false;
	}
};

const closeDelete = () => {
	if (deleting.value) return;
	confirming.value = null;
	deleteResults.value = null;
};

const askDelete = (list: Row[]) => {
	deleteResults.value = null;
	confirming.value = list;
};

const optionsFor = (f: FieldDef) => (typeof f.options === "function" ? f.options(values.value) : (f.options ?? []));
const groupsFor = (f: FieldDef) => [...new Set(optionsFor(f).map((o) => o.group).filter(Boolean))] as string[];

const inputCls = (f: FieldDef) => {
	const locked = isEditing.value && f.lockedOnEdit;
	return [
		"w-full",
		inputClass,
		fieldErrors.value[f.key] ? "border-danger!" : "",
		locked ? "bg-black/[0.04] text-black/50" : "",
	];
};
const isDisabled = (f: FieldDef) => (isEditing.value && !!f.lockedOnEdit) || loadingEdit.value || !!f.disabled?.(values.value);

const verbLower = computed(() => props.deleteVerb.toLowerCase());
const canEdit = computed(() => !!props.onUpdate);
const canDelete = computed(() => !!props.onDelete);
const formId = `${uid}-form`;
const rowActionBtn = "rounded-full border border-black/15 px-3 py-1 text-xs font-medium";
</script>

<template>
	<div>
		<div class="mb-5 flex items-start justify-between gap-4">
			<div>
				<h1 class="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
					{{ title }}
					<span class="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-accent">{{ rows.length }}</span>
				</h1>
				<p v-if="description" class="mt-1 text-sm text-black/55">{{ description }}</p>
			</div>
			<button :class="[btnPrimary, 'shrink-0']" @click="openAdd">
				<span class="text-lg leading-none">+</span> Add {{ singular }}
			</button>
		</div>

		<div
			v-if="notice"
			class="mb-4 rounded-xl border border-accent/25 bg-mint px-4 py-2.5 text-sm font-medium text-accent"
		>
			{{ notice }}
		</div>

		<slot name="before-table" />

		<DataTable
			v-model:selected="selected"
			:rows="rows"
			:row-key="rowKey"
			:columns="columns"
			:search-placeholder="searchPlaceholder"
			:search-value="searchValue"
			:empty-label="emptyLabel"
			:selectable="canDelete"
			:has-row-actions="canEdit || canDelete"
		>
			<template #filters><slot name="filters" /></template>
			<template v-for="c in columns" :key="c.key" #[`cell-${c.key}`]="{ row }">
				<slot :name="`cell-${c.key}`" :row="row">{{ c.value ? c.value(row) : "" }}</slot>
			</template>
			<template #bulk-bar>
				<button
					class="rounded-full bg-danger px-3.5 py-1 text-xs font-semibold text-white hover:opacity-90"
					@click="askDelete(rows.filter((r) => selected.has(rowKey(r))))"
				>
					{{ deleteVerb }} selected
				</button>
				<button class="text-xs font-medium text-black/60 hover:text-black" @click="selected = new Set()">
					Clear selection
				</button>
			</template>
			<template #row-actions="{ row }">
				<div class="flex justify-end gap-1.5">
					<button
						v-if="canEdit"
						:class="[rowActionBtn, 'text-black/70 hover:border-accent hover:bg-mint hover:text-accent']"
						@click="openEdit(row)"
					>
						Edit
					</button>
					<button
						v-if="canDelete"
						:class="[rowActionBtn, 'text-danger hover:border-danger hover:bg-danger/5']"
						@click="askDelete([row])"
					>
						{{ deleteVerb }}
					</button>
				</div>
			</template>
		</DataTable>

		<Modal
			v-if="mode"
			:title="isEditing ? `Edit ${singular}` : `Add ${singular}`"
			:busy="saving"
			@close="closeForm"
		>
			<form :id="formId" novalidate @submit.prevent="submit">
				<p class="mb-4 text-xs text-black/50">
					Fields marked <span class="font-semibold text-danger">*</span> are mandatory.
				</p>
				<div
					v-if="formError"
					role="alert"
					class="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger"
				>
					{{ formError }}
				</div>
				<p v-if="loadingEdit" class="py-6 text-center text-sm text-black/50">Loading...</p>
				<div v-else class="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
					<FormField
						v-for="f in visibleFields"
						:key="f.key"
						:id="`${uid}-${f.key}`"
						:label="f.label"
						:required="isRequired(f)"
						:error="f.type === 'custom' ? undefined : fieldErrors[f.key]"
						:help="isEditing && f.lockedOnEdit ? `Can't be changed after creation.` : typeof f.help === 'function' ? f.help(values) : f.help"
						:full="f.full || f.type === 'textarea' || f.type === 'custom'"
					>
						<textarea
							v-if="f.type === 'textarea'"
							:id="`${uid}-${f.key}`"
							rows="3"
							:class="inputCls(f)"
							:disabled="isDisabled(f)"
							:aria-invalid="!!fieldErrors[f.key]"
							:placeholder="f.placeholder"
							:value="(values[f.key] as string) ?? ''"
							@input="setField(f.key, ($event.target as HTMLTextAreaElement).value)"
						/>
						<select
							v-else-if="f.type === 'select'"
							:id="`${uid}-${f.key}`"
							:class="inputCls(f)"
							:disabled="isDisabled(f)"
							:aria-invalid="!!fieldErrors[f.key]"
							:value="(values[f.key] as string) ?? ''"
							@change="setField(f.key, ($event.target as HTMLSelectElement).value)"
						>
							<option value="">{{ f.placeholder ?? `Select ${f.label}...` }}</option>
							<template v-if="groupsFor(f).length === 0">
								<option v-for="o in optionsFor(f)" :key="o.value" :value="o.value">{{ o.label }}</option>
							</template>
							<optgroup v-for="g in groupsFor(f)" v-else :key="g" :label="g">
								<option v-for="o in optionsFor(f).filter((x) => x.group === g)" :key="o.value" :value="o.value">
									{{ o.label }}
								</option>
							</optgroup>
						</select>
						<label v-else-if="f.type === 'checkbox'" class="flex items-center gap-2 py-2 text-sm">
							<input
								:id="`${uid}-${f.key}`"
								type="checkbox"
								class="h-4 w-4 accent-[#0f7b4a]"
								:checked="values[f.key] === true"
								:disabled="isDisabled(f)"
								@change="setField(f.key, ($event.target as HTMLInputElement).checked)"
							/>
							<span>{{ f.placeholder ?? f.label }}</span>
						</label>
						<slot
							v-else-if="f.type === 'custom'"
							:name="`field-${f.key}`"
							:values="values"
							:set="(patch: Values) => setPatch(f.key, patch)"
							:error="fieldErrors[f.key]"
						/>
						<input
							v-else
							:id="`${uid}-${f.key}`"
							:type="f.type"
							:class="inputCls(f)"
							:disabled="isDisabled(f)"
							:aria-invalid="!!fieldErrors[f.key]"
							:autocomplete="f.type === 'password' ? 'new-password' : undefined"
							:placeholder="f.placeholder"
							:min="f.min?.(values)"
							:max="f.max?.(values)"
							:value="(values[f.key] as string) ?? ''"
							@input="setField(f.key, ($event.target as HTMLInputElement).value)"
						/>
					</FormField>
				</div>
			</form>
			<template #footer>
				<button type="button" :class="btnGhost" :disabled="saving" @click="closeForm">Cancel</button>
				<button type="submit" :form="formId" :class="btnPrimary" :disabled="saving || loadingEdit">
					{{ saving ? "Saving..." : isEditing ? "Save changes" : `Create ${singular}` }}
				</button>
			</template>
		</Modal>

		<Modal
			v-if="confirming"
			:title="
				deleteResults
					? 'Some records could not be removed'
					: `${deleteVerb} ${confirming.length} ${confirming.length === 1 ? 'record' : 'records'}?`
			"
			size="md"
			:busy="deleting"
			@close="closeDelete"
		>
			<ul v-if="deleteResults" class="flex flex-col gap-2 text-sm">
				<li
					v-for="(r, i) in deleteResults"
					:key="r.name || i"
					class="rounded-lg px-3 py-2"
					:class="r.ok ? 'bg-mint text-accent' : 'bg-danger/5 text-danger'"
				>
					<span v-if="r.name" class="font-semibold">{{ r.name }}: </span>
					{{ r.ok ? (deleteVerb === "Disable" ? "disabled" : "deleted") : r.message }}
				</li>
			</ul>
			<template v-else>
				<ul class="mb-3 max-h-40 list-disc overflow-y-auto pl-5 text-sm">
					<li v-for="r in confirming.slice(0, 8)" :key="rowKey(r)">{{ rowLabel(r) }}</li>
					<li v-if="confirming.length > 8" class="text-black/50">and {{ confirming.length - 8 }} more…</li>
				</ul>
				<p class="text-sm text-black/60">
					{{
						deleteVerb === "Disable"
							? `They will be ${verbLower}d and hidden from lists. Their history (fees, attendance, results) is kept.`
							: "This cannot be undone. Anything still in use by other records is skipped and reported."
					}}
				</p>
			</template>
			<template #footer>
				<button v-if="deleteResults" :class="btnPrimary" @click="closeDelete">Close</button>
				<template v-else>
					<button :class="btnGhost" :disabled="deleting" @click="closeDelete">Cancel</button>
					<button :class="btnDanger" :disabled="deleting" @click="runDelete">
						{{ deleting ? "Working..." : deleteVerb }}
					</button>
				</template>
			</template>
		</Modal>
	</div>
</template>
