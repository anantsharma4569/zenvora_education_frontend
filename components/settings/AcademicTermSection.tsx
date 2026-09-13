"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicTermRow, AcademicYearRow } from "@/lib/types";
import { SetupCard, SubmitButton, inputClass } from "./SetupCard";

const emptyForm = { academic_year: "", term_name: "", term_start_date: "", term_end_date: "" };

export function AcademicTermSection() {
	const [rows, setRows] = useState<AcademicTermRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
			load();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SetupCard
			title="Academic Terms"
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<select
						required
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
						<SubmitButton submitting={submitting} label="Add" />
					</div>
				</form>
			}
			list={
				<ul className="flex flex-wrap gap-2 text-sm">
					{rows.map((t) => (
						<li key={t.name} className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
							{t.term_name} ({t.academic_year})
						</li>
					))}
				</ul>
			}
		/>
	);
}
