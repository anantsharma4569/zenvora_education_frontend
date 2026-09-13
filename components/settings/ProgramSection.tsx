"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DepartmentRow, ProgramRow } from "@/lib/types";
import { SetupCard, SubmitButton, inputClass } from "./SetupCard";

export function ProgramSection() {
	const [rows, setRows] = useState<ProgramRow[]>([]);
	const [departments, setDepartments] = useState<DepartmentRow[]>([]);
	const [name, setName] = useState("");
	const [department, setDepartment] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = () => api.listPrograms().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);
	useEffect(() => {
		api.listDepartments().then(setDepartments).catch(() => undefined);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createProgram({ program_name: name, department: department || undefined });
			setName("");
			setDepartment("");
			load();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SetupCard
			title="Programs"
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
					<input
						required
						placeholder="Program Name (e.g. Class 10)"
						className={`flex-1 ${inputClass}`}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<select className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
						<option value="">Department (optional)</option>
						{departments.map((d) => (
							<option key={d.name} value={d.name}>
								{d.department_name}
							</option>
						))}
					</select>
					<SubmitButton submitting={submitting} label="Add" />
				</form>
			}
			list={
				<ul className="flex flex-wrap gap-2 text-sm">
					{rows.map((p) => (
						<li key={p.name} className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
							{p.program_name}
						</li>
					))}
				</ul>
			}
		/>
	);
}
