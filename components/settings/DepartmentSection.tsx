"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DepartmentRow } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";

export function DepartmentSection() {
	const [rows, setRows] = useState<DepartmentRow[]>([]);
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const load = () => api.listDepartments().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createDepartment({ department_name: name });
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
			title="Departments"
			count={rows.length}
			description="Academic and administrative departments"
			addLabel="+ Add Department"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
					<input
						required
						autoFocus
						placeholder="Department Name"
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
					searchPlaceholder="Search departments..."
					searchValue={(r) => r.department_name}
					emptyLabel="No departments yet."
					columns={[
						{ key: "department_name", label: "Name", sortable: true, value: (r) => r.department_name },
						{ key: "company", label: "Company", value: (r) => r.company },
					]}
				/>
			}
		/>
	);
}
