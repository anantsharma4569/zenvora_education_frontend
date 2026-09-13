"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicYearRow, ProgramRow, StudentGroupRow } from "@/lib/types";
import { SetupCard, SubmitButton, inputClass } from "./SetupCard";

const emptyForm = { student_group_name: "", program: "", academic_year: "", max_strength: "" };

export function StudentGroupSection() {
	const [rows, setRows] = useState<StudentGroupRow[]>([]);
	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = () => api.listStudentGroups().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);
	useEffect(() => {
		api.listPrograms().then(setPrograms).catch(() => undefined);
		api.listAcademicYears().then(setAcademicYears).catch(() => undefined);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createStudentGroup({
				student_group_name: form.student_group_name,
				program: form.program,
				academic_year: form.academic_year,
				max_strength: form.max_strength ? Number(form.max_strength) : undefined,
			});
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
			title="Student Groups (Class / Section)"
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<input
						required
						placeholder="Group Name (e.g. Class 10 - A)"
						className={inputClass}
						value={form.student_group_name}
						onChange={(e) => setForm({ ...form, student_group_name: e.target.value })}
					/>
					<input
						type="number"
						placeholder="Max Strength (optional)"
						className={inputClass}
						value={form.max_strength}
						onChange={(e) => setForm({ ...form, max_strength: e.target.value })}
					/>
					<select
						required
						className={inputClass}
						value={form.program}
						onChange={(e) => setForm({ ...form, program: e.target.value })}
					>
						<option value="">Select Program...</option>
						{programs.map((p) => (
							<option key={p.name} value={p.name}>
								{p.program_name}
							</option>
						))}
					</select>
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
					{(programs.length === 0 || academicYears.length === 0) && (
						<p className="text-xs text-black/50 sm:col-span-2 dark:text-white/50">
							Add a Program and an Academic Year first.
						</p>
					)}
					<div className="sm:col-span-2">
						<SubmitButton submitting={submitting} label="Add" />
					</div>
				</form>
			}
			list={
				<ul className="flex flex-wrap gap-2 text-sm">
					{rows.map((g) => (
						<li key={g.name} className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
							{g.student_group_name}
						</li>
					))}
				</ul>
			}
		/>
	);
}
