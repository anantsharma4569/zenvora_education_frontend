"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeeCategoryRow } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";

export function FeeCategorySection() {
	const [rows, setRows] = useState<FeeCategoryRow[]>([]);
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const load = () => api.listFeeCategories().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createFeeCategory({ category_name: name });
			setName("");
			setFormOpen(false);
			load();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SectionPage
			title="Fee Categories"
			count={rows.length}
			addLabel="+ Add Fee Category"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
					<input
						required
						autoFocus
						placeholder="Category Name (e.g. Tuition Fee)"
						className={`flex-1 ${inputClass}`}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<SubmitButton submitting={submitting} label="Save" />
				</form>
			}
			table={
				<DataTable
					rows={rows}
					rowKey={(r) => r.name}
					searchPlaceholder="Search fee categories..."
					searchValue={(r) => r.category_name}
					emptyLabel="No fee categories yet."
					columns={[{ key: "category_name", label: "Category", sortable: true, value: (r) => r.category_name }]}
				/>
			}
		/>
	);
}
