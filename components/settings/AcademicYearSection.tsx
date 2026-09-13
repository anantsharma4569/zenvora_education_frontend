"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicYearRow } from "@/lib/types";
import { SetupCard, SubmitButton, inputClass } from "./SetupCard";

const emptyForm = { academic_year_name: "", year_start_date: "", year_end_date: "" };

export function AcademicYearSection() {
	const [rows, setRows] = useState<AcademicYearRow[]>([]);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
			load();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SetupCard
			title="Academic Years"
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<input
						required
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
						<SubmitButton submitting={submitting} label="Add" />
					</div>
				</form>
			}
			list={
				<ul className="flex flex-wrap gap-2 text-sm">
					{rows.map((y) => (
						<li key={y.name} className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
							{y.name}
						</li>
					))}
				</ul>
			}
		/>
	);
}
