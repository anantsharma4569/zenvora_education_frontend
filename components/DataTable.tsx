"use client";

import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/DataState";

export interface DataTableColumn<T> {
	key: string;
	label: string;
	sortable?: boolean;
	render?: (row: T) => ReactNode;
	value?: (row: T) => string | number;
}

interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	searchPlaceholder?: string;
	searchValue?: (row: T) => string;
	actions?: ReactNode;
	emptyLabel?: string;
	pageSize?: number;
}

export function DataTable<T>({
	columns,
	rows,
	rowKey,
	searchPlaceholder = "Search...",
	searchValue,
	actions,
	emptyLabel = "No records found.",
	pageSize = 10,
}: DataTableProps<T>) {
	const [search, setSearch] = useState("");
	const [sortKey, setSortKey] = useState<string | null>(null);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [page, setPage] = useState(0);

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

	const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
	const clampedPage = Math.min(page, totalPages - 1);
	const paged = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

	const toggleSort = (column: DataTableColumn<T>) => {
		if (!column.sortable || !column.value) return;
		if (sortKey === column.key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(column.key);
			setSortDir("asc");
		}
	};

	return (
		<div>
			<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				{searchValue ? (
					<input
						placeholder={searchPlaceholder}
						className="w-full max-w-sm rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(0);
						}}
					/>
				) : (
					<div />
				)}
				{actions}
			</div>

			{rows.length === 0 ? (
				<EmptyState label={emptyLabel} />
			) : (
				<>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="text-black/50 dark:text-white/50">
								<tr>
									{columns.map((c) => (
										<th
											key={c.key}
											onClick={() => toggleSort(c)}
											className={`whitespace-nowrap py-2 pr-4 ${c.sortable ? "cursor-pointer select-none" : ""}`}
										>
											{c.label}
											{c.sortable && sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{paged.map((row) => (
									<tr key={rowKey(row)} className="border-t border-black/10 dark:border-white/10">
										{columns.map((c) => (
											<td key={c.key} className="py-2 pr-4">
												{c.render ? c.render(row) : c.value ? c.value(row) : null}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="mt-3 flex items-center justify-between text-xs text-black/50 dark:text-white/50">
						<span>
							Showing {paged.length} of {sorted.length}
						</span>
						{totalPages > 1 && (
							<div className="flex items-center gap-2">
								<button
									disabled={clampedPage === 0}
									onClick={() => setPage((p) => Math.max(0, p - 1))}
									className="rounded-md border border-black/10 px-2 py-1 disabled:opacity-40 dark:border-white/10"
								>
									Prev
								</button>
								<span>
									Page {clampedPage + 1} of {totalPages}
								</span>
								<button
									disabled={clampedPage >= totalPages - 1}
									onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
									className="rounded-md border border-black/10 px-2 py-1 disabled:opacity-40 dark:border-white/10"
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
