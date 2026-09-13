"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicTermRow, AcademicYearRow } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";

const emptyForm = { academic_year: "", term_name: "", term_start_date: "", term_end_date: "" };

export function AcademicTermSection() {
	const [rows, setRows] = useState<AcademicTermRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const load = () => api.listAcademicTerms().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);
	useEffect(() => {
		api.listAcademicYears().then(setAcademicYears).catch(() => undefined);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createAcademicTerm(form);
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
			title="Academic Terms"
			count={rows.length}
			addLabel="+ Add Academic Term"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<select
						required
						autoFocus
						className={inputClass}
						value={form.academic_year}
						onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
					>
						<option value="">Select Academic Year...</option>
						{academicYears.map((y) => (
							<option key={y.name} value={y.name}>
								{y.name}
							</option>
						))}
					</select>
					<input
						required
						placeholder="Term Name (e.g. Term 1)"
						className={inputClass}
						value={form.term_name}
						onChange={(e) => setForm({ ...form, term_name: e.target.value })}
					/>
					<input
						required
						type="date"
						className={inputClass}
						value={form.term_start_date}
						onChange={(e) => setForm({ ...form, term_start_date: e.target.value })}
					/>
					<input
						required
						type="date"
						className={inputClass}
						value={form.term_end_date}
						onChange={(e) => setForm({ ...form, term_end_date: e.target.value })}
					/>
					{academicYears.length === 0 && (
						<p className="text-xs text-black/50 sm:col-span-2 dark:text-white/50">
							Add an Academic Year first.
						</p>
					)}
					<div className="sm:col-span-2">
						<SubmitButton submitting={submitting} label="Save" />
					</div>
				</form>
			}
			table={
				<DataTable
					rows={rows}
					rowKey={(r) => r.name}
					searchPlaceholder="Search academic terms..."
					searchValue={(r) => r.term_name}
					emptyLabel="No academic terms yet."
					columns={[
						{ key: "term_name", label: "Term", sortable: true, value: (r) => r.term_name },
						{ key: "academic_year", label: "Academic Year", sortable: true, value: (r) => r.academic_year },
						{ key: "term_start_date", label: "Start Date", value: (r) => r.term_start_date },
						{ key: "term_end_date", label: "End Date", value: (r) => r.term_end_date },
					]}
				/>
			}
		/>
	);
}
