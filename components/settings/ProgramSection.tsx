"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DepartmentRow, ProgramRow } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";

export function ProgramSection() {
	const [rows, setRows] = useState<ProgramRow[]>([]);
	const [departments, setDepartments] = useState<DepartmentRow[]>([]);
	const [name, setName] = useState("");
	const [department, setDepartment] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

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
			title="Programs"
			count={rows.length}
			description="e.g. Class 1 through Class 12, or degree programs"
			addLabel="+ Add Program"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
					<input
						required
						autoFocus
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
					<SubmitButton submitting={submitting} label="Save" />
				</form>
			}
			table={
				<DataTable
					rows={rows}
					rowKey={(r) => r.name}
					searchPlaceholder="Search programs..."
					searchValue={(r) => r.program_name}
					emptyLabel="No programs yet."
					columns={[
						{ key: "program_name", label: "Program", sortable: true, value: (r) => r.program_name },
						{ key: "department", label: "Department", value: (r) => r.department || "-" },
					]}
				/>
			}
		/>
	);
}
