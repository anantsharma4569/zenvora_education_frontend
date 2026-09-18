"use client";

import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/DataState";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface DataTableColumn<T> {
	key: string;
	label: string;
	sortable?: boolean;
	align?: "left" | "right";
	render?: (row: T) => ReactNode;
	value?: (row: T) => string | number;
}

export interface TableSelection {
	selected: Set<string>;
	onChange: (next: Set<string>) => void;
}

interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	searchPlaceholder?: string;
	searchValue?: (row: T) => string;
	/** Filter pills rendered next to the search field. */
	filters?: ReactNode;
	actions?: ReactNode;
	emptyLabel?: string;
	pageSize?: number;
	/** Width below which the table scrolls horizontally instead of squashing. */
	minWidth?: number;
	/** Adds a checkbox column (and select-all over every filtered row, not just this page). */
	selection?: TableSelection;
	/** Rendered in a right-hand Actions column, e.g. Edit / Delete. */
	rowActions?: (row: T) => ReactNode;
	/** Shown above the table while something is selected. */
	bulkBar?: ReactNode;
}

export function DataTable<T>({
	columns,
	rows,
	rowKey,
	searchPlaceholder = "Search…",
	searchValue,
	filters,
	actions,
	emptyLabel = "No records found.",
	pageSize = 10,
	minWidth = 560,
	selection,
	rowActions,
	bulkBar,
}: DataTableProps<T>) {
	const [search, setSearch] = useState("");
	const [sortKey, setSortKey] = useState<string | null>(null);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(pageSize);

	const filtered = useMemo(() => {
		if (!search || !searchValue) return rows;
		const needle = search.toLowerCase();
		return rows.filter((r) => searchValue(r).toLowerCase().includes(needle));
	}, [rows, search, searchValue]);

	const sorted = useMemo(() => {
		if (!sortKey) return filtered;
		const column = columns.find((c) => c.key === sortKey);
		if (!column?.value) return filtered;
		const withValues = filtered.map((r) => ({ row: r, v: column.value!(r) }));
		withValues.sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0));
		if (sortDir === "desc") withValues.reverse();
		return withValues.map((w) => w.row);
	}, [filtered, sortKey, sortDir, columns]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
	const clampedPage = Math.min(page, totalPages - 1);
	const paged = sorted.slice(clampedPage * rowsPerPage, clampedPage * rowsPerPage + rowsPerPage);

	const toggleSort = (column: DataTableColumn<T>) => {
		if (!column.sortable || !column.value) return;
		if (sortKey === column.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setSortKey(column.key);
			setSortDir("asc");
		}
	};

	const filteredKeys = sorted.map(rowKey);
	const allSelected = !!selection && filteredKeys.length > 0 && filteredKeys.every((k) => selection.selected.has(k));
	const someSelected = !!selection && filteredKeys.some((k) => selection.selected.has(k));

	const toggleAll = () => {
		if (!selection) return;
		const next = new Set(selection.selected);
		if (allSelected) filteredKeys.forEach((k) => next.delete(k));
		else filteredKeys.forEach((k) => next.add(k));
		selection.onChange(next);
	};
	const toggleOne = (key: string) => {
		if (!selection) return;
		const next = new Set(selection.selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selection.onChange(next);
	};

	const checkbox = "h-4 w-4 cursor-pointer rounded border-black/30 accent-[#0f7b4a]";

	return (
		<div className="rounded-2xl border border-line bg-surface px-[18px] pb-3.5 pt-4">
			<div className="mb-3.5 flex flex-wrap items-center gap-2.5">
				{searchValue ? (
					<input
						placeholder={searchPlaceholder}
						className="min-w-0 flex-[1_1_210px] rounded-full border border-black/[0.15] bg-transparent px-4 py-2 text-[13px] outline-none placeholder:text-black/40 focus:border-accent focus:ring-2 focus:ring-accent/15"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(0);
						}}
					/>
				) : (
					<div className="flex-1" />
				)}
				{filters}
				{actions}
			</div>

			{selection && selection.selected.size > 0 && bulkBar && (
				<div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-mint px-4 py-2.5 text-[13px]">
					<span className="font-semibold text-accent">{selection.selected.size} selected</span>
					{bulkBar}
				</div>
			)}

			{rows.length === 0 ? (
				<EmptyState label={emptyLabel} />
			) : (
				<>
					<div className="-mx-[18px] overflow-x-auto px-[18px]">
						<table className="w-full text-left text-[13px]" style={{ minWidth }}>
							<thead>
								<tr>
									{selection && (
										<th className="w-9 pb-2.5 pr-2">
											<input
												type="checkbox"
												aria-label="Select all"
												className={checkbox}
												checked={allSelected}
												ref={(el) => {
													if (el) el.indeterminate = !allSelected && someSelected;
												}}
												onChange={toggleAll}
											/>
										</th>
									)}
									{columns.map((c) => (
										<th
											key={c.key}
											onClick={() => toggleSort(c)}
											className={`whitespace-nowrap pb-2.5 pr-4 text-[11px] font-medium uppercase tracking-[0.07em] text-black/40 ${
												c.align === "right" ? "text-right" : "text-left"
											} ${c.sortable ? "cursor-pointer select-none hover:text-black/70" : ""}`}
										>
											{c.label}
											{c.sortable && sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
										</th>
									))}
									{rowActions && (
										<th className="whitespace-nowrap pb-2.5 text-right text-[11px] font-medium uppercase tracking-[0.07em] text-black/40">
											Actions
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{paged.map((row) => {
									const key = rowKey(row);
									const isSelected = !!selection?.selected.has(key);
									return (
										<tr key={key} className={isSelected ? "bg-mint/60" : "hover:bg-mint/30"}>
											{selection && (
												<td className="border-t border-line-soft py-2.5 pr-2">
													<input
														type="checkbox"
														aria-label="Select row"
														className={checkbox}
														checked={isSelected}
														onChange={() => toggleOne(key)}
													/>
												</td>
											)}
											{columns.map((c) => (
												<td
													key={c.key}
													className={`whitespace-nowrap border-t border-line-soft py-2.5 pr-4 tabular-nums ${
														c.align === "right" ? "text-right" : "text-left"
													}`}
												>
													{c.render ? c.render(row) : c.value ? c.value(row) : null}
												</td>
											))}
											{rowActions && (
												<td className="whitespace-nowrap border-t border-line-soft py-2 text-right">
													{rowActions(row)}
												</td>
											)}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3 text-xs text-black/50">
						<div className="flex items-center gap-2">
							<span>
								Showing {paged.length} of {sorted.length}
							</span>
							<label className="flex items-center gap-1.5">
								<span>·</span>
								<select
									value={rowsPerPage}
									onChange={(e) => {
										setRowsPerPage(Number(e.target.value));
										setPage(0);
									}}
									className="rounded-full border border-black/[0.15] bg-transparent px-2 py-1 text-xs"
								>
									{PAGE_SIZE_OPTIONS.map((size) => (
										<option key={size} value={size}>
											{size} per page
										</option>
									))}
								</select>
							</label>
						</div>
						{totalPages > 1 && (
							<div className="flex items-center gap-2">
								<button
									disabled={clampedPage === 0}
									onClick={() => setPage((p) => Math.max(0, p - 1))}
									className="rounded-full border border-black/[0.15] px-3 py-1 hover:bg-mint disabled:opacity-45"
								>
									Prev
								</button>
								<span>
									Page {clampedPage + 1} of {totalPages}
								</span>
								<button
									disabled={clampedPage >= totalPages - 1}
									onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
									className="rounded-full border border-black/[0.15] px-3 py-1 hover:bg-mint disabled:opacity-45"
								>
									Next
								</button>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
