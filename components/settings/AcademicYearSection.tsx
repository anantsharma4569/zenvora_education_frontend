"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicYearRow } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";

const emptyForm = { academic_year_name: "", year_start_date: "", year_end_date: "" };

export function AcademicYearSection() {
	const [rows, setRows] = useState<AcademicYearRow[]>([]);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const load = () => api.listAcademicYears().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createAcademicYear(form);
			setForm(emptyForm);
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
			title="Academic Years"
			count={rows.length}
			addLabel="+ Add Academic Year"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<input
						required
						autoFocus
						placeholder="e.g. 2026-27"
						className={inputClass}
						value={form.academic_year_name}
						onChange={(e) => setForm({ ...form, academic_year_name: e.target.value })}
					/>
					<input
						required
						type="date"
						className={inputClass}
						value={form.year_start_date}
						onChange={(e) => setForm({ ...form, year_start_date: e.target.value })}
					/>
					<input
						required
						type="date"
						className={inputClass}
						value={form.year_end_date}
						onChange={(e) => setForm({ ...form, year_end_date: e.target.value })}
					/>
					<div className="sm:col-span-3">
						<SubmitButton submitting={submitting} label="Save" />
					</div>
				</form>
			}
			table={
				<DataTable
					rows={rows}
					rowKey={(r) => r.name}
					searchPlaceholder="Search academic years..."
					searchValue={(r) => r.name}
					emptyLabel="No academic years yet."
					columns={[
						{ key: "name", label: "Academic Year", sortable: true, value: (r) => r.name },
						{ key: "year_start_date", label: "Start Date", value: (r) => r.year_start_date || "-" },
						{ key: "year_end_date", label: "End Date", value: (r) => r.year_end_date || "-" },
					]}
				/>
			}
		/>
	);
}
