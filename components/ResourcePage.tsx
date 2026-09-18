"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Field } from "@/components/FormField";
import { Modal } from "@/components/Modal";
import { btnDanger, btnGhost, btnPrimary, inputClass } from "@/components/FormControls";

export type Val = string | boolean | Array<Record<string, string>>;
export type Values = Record<string, Val>;

export interface Option {
	value: string;
	label: string;
	group?: string;
}

export interface FieldDef {
	key: string;
	label: string;
	type: "text" | "email" | "number" | "date" | "password" | "textarea" | "select" | "checkbox" | "custom";
	required?: boolean;
	/** Mandatory only in some situations (e.g. email is required once a password is typed). */
	requiredWhen?: (v: Values) => boolean;
	options?: Option[] | ((v: Values) => Option[]);
	placeholder?: string;
	help?: string;
	/** Span both columns of the form grid. */
	full?: boolean;
	/** Only on the Add form (hidden while editing). */
	createOnly?: boolean;
	/** Shown but not editable on the Edit form. */
	lockedOnEdit?: boolean;
	hidden?: (v: Values, editing: boolean) => boolean;
	/** Visible but unusable for now (e.g. Section until a Class is chosen). */
	disabled?: (v: Values) => boolean;
	render?: (ctx: { values: Values; set: (patch: Values) => void; error?: string }) => ReactNode;
	validate?: (v: Values) => string | null;
}

export interface DeleteResult {
	name: string;
	ok: boolean;
	message: string;
}

interface Props<Row> {
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
	filters?: ReactNode;
	/** Rendered between the header and the table (e.g. tabs). */
	beforeTable?: ReactNode;
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
	/** Whether the Add form should also open pre-filled (e.g. single company). */
	openValues?: () => Values;
}

const isEmpty = (v: Val | undefined) =>
	v === undefined || v === "" || v === false || (Array.isArray(v) && v.length === 0);

export function ResourcePage<Row>({
	title,
	singular,
	description,
	rows,
	rowKey,
	rowLabel,
	columns,
	searchPlaceholder,
	searchValue,
	emptyLabel,
	filters,
	beforeTable,
	fields,
	emptyValues,
	onCreate,
	loadForEdit,
	onUpdate,
	onDelete,
	deleteVerb = "Delete",
	onChangeField,
	reload,
	openValues,
}: Props<Row>) {
	const uid = useId();
	const [mode, setMode] = useState<null | { editing: Row | null }>(null);
	const [values, setValues] = useState<Values>({});
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [loadingEdit, setLoadingEdit] = useState(false);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [confirming, setConfirming] = useState<Row[] | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteResults, setDeleteResults] = useState<DeleteResult[] | null>(null);

	// Drop selections for rows that no longer exist (after a delete/reload/filter change).
	useEffect(() => {
		setSelected((prev) => {
			const keys = new Set(rows.map(rowKey));
			const next = new Set([...prev].filter((k) => keys.has(k)));
			return next.size === prev.size ? prev : next;
		});
	}, [rows, rowKey]);

	useEffect(() => {
		if (!notice) return;
		const t = setTimeout(() => setNotice(null), 4000);
		return () => clearTimeout(t);
	}, [notice]);

	const editing = mode?.editing ?? null;
	const isEditing = editing !== null;

	const openAdd = () => {
		setValues({ ...emptyValues(), ...(openValues ? openValues() : {}) });
		setFieldErrors({});
		setFormError(null);
		setMode({ editing: null });
	};

	const openEdit = async (row: Row) => {
		setFieldErrors({});
		setFormError(null);
		setMode({ editing: row });
		setValues({ ...emptyValues() });
		if (!loadForEdit) return;
		setLoadingEdit(true);
		try {
			setValues({ ...emptyValues(), ...(await loadForEdit(row)) });
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setLoadingEdit(false);
		}
	};

	const closeForm = () => {
		if (saving) return;
		setMode(null);
	};

	const setField = (key: string, value: Val) => {
		setValues((prev) => {
			const next = { ...prev, [key]: value };
			return onChangeField ? onChangeField(key, next, prev) : next;
		});
		setFieldErrors((prev) => {
			if (!prev[key]) return prev;
			const { [key]: _removed, ...rest } = prev;
			void _removed;
			return rest;
		});
	};

	const visibleFields = fields.filter((f) => !(f.createOnly && isEditing) && !f.hidden?.(values, isEditing));

	const validate = () => {
		const errs: Record<string, string> = {};
		for (const f of visibleFields) {
			if (isEditing && f.lockedOnEdit) continue;
			const required = f.required || f.requiredWhen?.(values);
			if (required && isEmpty(values[f.key])) errs[f.key] = `${f.label} is required`;
			else if (f.validate) {
				const msg = f.validate(values);
				if (msg) errs[f.key] = msg;
			}
		}
		return errs;
	};

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		const errs = validate();
		setFieldErrors(errs);
		if (Object.keys(errs).length > 0) {
			setFormError("Please fix the highlighted fields.");
			return;
		}
		setFormError(null);
		setSaving(true);
		try {
			if (isEditing) await onUpdate?.(editing as Row, values);
			else await onCreate(values);
			setNotice(`${singular} ${isEditing ? "updated" : "created"}.`);
			setMode(null);
			await reload();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	const runDelete = async () => {
		if (!confirming || !onDelete) return;
		setDeleting(true);
		try {
			const results = await onDelete(confirming);
			await reload();
			const failed = results.filter((r) => !r.ok);
			if (failed.length === 0) {
				setNotice(
					`${results.length} record${results.length === 1 ? "" : "s"} ${deleteVerb === "Disable" ? "disabled" : "deleted"}.`,
				);
				setConfirming(null);
				setSelected(new Set());
			} else {
				setDeleteResults(results);
				setSelected(new Set(failed.map((f) => f.name)));
			}
		} catch (err) {
			setDeleteResults([{ name: "", ok: false, message: (err as Error).message }]);
		} finally {
			setDeleting(false);
		}
	};

	const closeDelete = () => {
		if (deleting) return;
		setConfirming(null);
		setDeleteResults(null);
	};

	const askDelete = (list: Row[]) => {
		setDeleteResults(null);
		setConfirming(list);
	};

	const verbLower = deleteVerb.toLowerCase();
	const canEdit = !!onUpdate;
	const canDelete = !!onDelete;

	const renderInput = (f: FieldDef, id: string, error?: string) => {
		const value = values[f.key];
		const locked = isEditing && f.lockedOnEdit;
		const common = {
			id,
			disabled: locked || loadingEdit || !!f.disabled?.(values),
			"aria-invalid": !!error,
			className: `w-full ${inputClass} ${error ? "border-danger!" : ""} ${locked ? "bg-black/[0.04] text-black/50" : ""}`,
		};
		switch (f.type) {
			case "textarea":
				return (
					<textarea
						{...common}
						rows={3}
						placeholder={f.placeholder}
						value={(value as string) ?? ""}
						onChange={(e) => setField(f.key, e.target.value)}
					/>
				);
			case "select": {
				const opts = typeof f.options === "function" ? f.options(values) : (f.options ?? []);
				const groups = [...new Set(opts.map((o) => o.group).filter(Boolean))] as string[];
				return (
					<select {...common} value={(value as string) ?? ""} onChange={(e) => setField(f.key, e.target.value)}>
						<option value="">{f.placeholder ?? `Select ${f.label}...`}</option>
						{groups.length === 0
							? opts.map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))
							: groups.map((g) => (
									<optgroup key={g} label={g}>
										{opts
											.filter((o) => o.group === g)
											.map((o) => (
												<option key={o.value} value={o.value}>
													{o.label}
												</option>
											))}
									</optgroup>
								))}
					</select>
				);
			}
			case "checkbox":
				return (
					<label className="flex items-center gap-2 py-2 text-sm">
						<input
							id={id}
							type="checkbox"
							className="h-4 w-4 accent-[#0f7b4a]"
							checked={value === true}
							disabled={locked || loadingEdit}
							onChange={(e) => setField(f.key, e.target.checked)}
						/>
						<span>{f.placeholder ?? f.label}</span>
					</label>
				);
			case "custom":
				return f.render?.({
					values,
					set: (patch) => {
						setValues((prev) => ({ ...prev, ...patch }));
						setFieldErrors((prev) => {
							const { [f.key]: _removed, ...rest } = prev;
							void _removed;
							return rest;
						});
					},
					error,
				});
			default:
				return (
					<input
						{...common}
						type={f.type}
						autoComplete={f.type === "password" ? "new-password" : undefined}
						placeholder={f.placeholder}
						value={(value as string) ?? ""}
						onChange={(e) => setField(f.key, e.target.value)}
					/>
				);
		}
	};

	return (
		<div>
			<div className="mb-5 flex items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
						{title}
						<span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-accent">{rows.length}</span>
					</h1>
					{description && <p className="mt-1 text-sm text-black/55">{description}</p>}
				</div>
				<button onClick={openAdd} className={`${btnPrimary} shrink-0`}>
					<span className="text-lg leading-none">+</span> Add {singular}
				</button>
			</div>

			{notice && (
				<div className="mb-4 rounded-xl border border-accent/25 bg-mint px-4 py-2.5 text-sm font-medium text-accent">
					{notice}
				</div>
			)}

			{beforeTable}

			<DataTable
				rows={rows}
				rowKey={rowKey}
				columns={columns}
				searchPlaceholder={searchPlaceholder}
				searchValue={searchValue}
				emptyLabel={emptyLabel}
				filters={filters}
				selection={canDelete ? { selected, onChange: setSelected } : undefined}
				bulkBar={
					canDelete ? (
						<>
							<button
								className="rounded-full bg-danger px-3.5 py-1 text-xs font-semibold text-white hover:opacity-90"
								onClick={() => askDelete(rows.filter((r) => selected.has(rowKey(r))))}
							>
								{deleteVerb} selected
							</button>
							<button className="text-xs font-medium text-black/60 hover:text-black" onClick={() => setSelected(new Set())}>
								Clear selection
							</button>
						</>
					) : undefined
				}
				rowActions={
					canEdit || canDelete
						? (row) => (
								<div className="flex justify-end gap-1.5">
									{canEdit && (
										<button
											onClick={() => openEdit(row)}
											className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-black/70 hover:border-accent hover:bg-mint hover:text-accent"
										>
											Edit
										</button>
									)}
									{canDelete && (
										<button
											onClick={() => askDelete([row])}
											className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-danger hover:border-danger hover:bg-danger/5"
										>
											{deleteVerb}
										</button>
									)}
								</div>
							)
						: undefined
				}
			/>

			{mode && (
				<Modal
					title={isEditing ? `Edit ${singular}` : `Add ${singular}`}
					onClose={closeForm}
					busy={saving}
					footer={
						<>
							<button type="button" className={btnGhost} onClick={closeForm} disabled={saving}>
								Cancel
							</button>
							<button type="submit" form={`${uid}-form`} className={btnPrimary} disabled={saving || loadingEdit}>
								{saving ? "Saving..." : isEditing ? "Save changes" : `Create ${singular}`}
							</button>
						</>
					}
				>
					<form id={`${uid}-form`} onSubmit={submit} noValidate>
						<p className="mb-4 text-xs text-black/50">
							Fields marked <span className="font-semibold text-danger">*</span> are mandatory.
						</p>
						{formError && (
							<div role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
								{formError}
							</div>
						)}
						{loadingEdit ? (
							<p className="py-6 text-center text-sm text-black/50">Loading...</p>
						) : (
							<div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
								{visibleFields.map((f) => {
									const id = `${uid}-${f.key}`;
									const err = fieldErrors[f.key];
									const required = !!(f.required || f.requiredWhen?.(values));
									return (
										<Field
											key={f.key}
											id={id}
											label={f.label}
											required={required}
											error={f.type === "custom" ? undefined : err}
											help={isEditing && f.lockedOnEdit ? "Can't be changed after creation." : f.help}
											full={f.full || f.type === "textarea" || f.type === "custom"}
										>
											{renderInput(f, id, err)}
										</Field>
									);
								})}
							</div>
						)}
					</form>
				</Modal>
			)}

			{confirming && (
				<Modal
					title={deleteResults ? "Some records could not be removed" : `${deleteVerb} ${confirming.length} ${confirming.length === 1 ? "record" : "records"}?`}
					size="md"
					onClose={closeDelete}
					busy={deleting}
					footer={
						deleteResults ? (
							<button className={btnPrimary} onClick={closeDelete}>
								Close
							</button>
						) : (
							<>
								<button className={btnGhost} onClick={closeDelete} disabled={deleting}>
									Cancel
								</button>
								<button className={btnDanger} onClick={runDelete} disabled={deleting}>
									{deleting ? "Working..." : deleteVerb}
								</button>
							</>
						)
					}
				>
					{deleteResults ? (
						<ul className="flex flex-col gap-2 text-sm">
							{deleteResults.map((r, i) => (
								<li
									key={r.name || i}
									className={`rounded-lg px-3 py-2 ${r.ok ? "bg-mint text-accent" : "bg-danger/5 text-danger"}`}
								>
									{r.name && <span className="font-semibold">{r.name}: </span>}
									{r.ok ? `${deleteVerb === "Disable" ? "disabled" : "deleted"}` : r.message}
								</li>
							))}
						</ul>
					) : (
						<>
							<ul className="mb-3 max-h-40 list-disc overflow-y-auto pl-5 text-sm">
								{confirming.slice(0, 8).map((r) => (
									<li key={rowKey(r)}>{rowLabel(r)}</li>
								))}
								{confirming.length > 8 && <li className="text-black/50">and {confirming.length - 8} more…</li>}
							</ul>
							<p className="text-sm text-black/60">
								{deleteVerb === "Disable"
									? `They will be ${verbLower}d and hidden from lists. Their history (fees, attendance, results) is kept.`
									: "This cannot be undone. Anything still in use by other records is skipped and reported."}
							</p>
						</>
					)}
				</Modal>
			)}
		</div>
	);
}
