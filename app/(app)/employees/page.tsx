"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorState } from "@/components/DataState";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";
import type { EmployeeRow } from "@/lib/types";

const emptyForm = {
	employee_name: "",
	department: "",
	designation: "",
	date_of_joining: "",
	company: "",
	personal_email: "",
	is_instructor: false,
};

export default function EmployeesPage() {
	const [employees, setEmployees] = useState<EmployeeRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const load = () => {
		setError(null);
		api.listEmployees().then(setEmployees).catch((err) => setError(err.message));
	};

	useEffect(load, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setFormError(null);
		try {
			await api.createEmployee(form);
			setForm(emptyForm);
			setFormOpen(false);
			load();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	if (error) return <ErrorState message={error} />;

	return (
		<SectionPage
			title="Employees"
			count={employees.length}
			description="Staff and teacher records"
			addLabel="+ Add Employee"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={formError}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<input
						required
						autoFocus
						placeholder="Employee Name"
						className={inputClass}
						value={form.employee_name}
						onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
					/>
					<input
						required
						placeholder="Department"
						className={inputClass}
						value={form.department}
						onChange={(e) => setForm({ ...form, department: e.target.value })}
					/>
					<input
						required
						placeholder="Designation"
						className={inputClass}
						value={form.designation}
						onChange={(e) => setForm({ ...form, designation: e.target.value })}
					/>
					<input
						required
						placeholder="Company"
						className={inputClass}
						value={form.company}
						onChange={(e) => setForm({ ...form, company: e.target.value })}
					/>
					<input
						required
						type="date"
						className={inputClass}
						value={form.date_of_joining}
						onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
					/>
					<input
						type="email"
						placeholder="Personal Email"
						className={inputClass}
						value={form.personal_email}
						onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
					/>
					<label className="flex items-center gap-2 text-sm sm:col-span-2">
						<input
							type="checkbox"
							checked={form.is_instructor}
							onChange={(e) => setForm({ ...form, is_instructor: e.target.checked })}
						/>
						This employee is a teacher (also create an Instructor record)
					</label>

					<div className="sm:col-span-2">
						<SubmitButton submitting={submitting} label="Create Employee" />
					</div>
				</form>
			}
			table={
				<DataTable
					rows={employees}
					rowKey={(e) => e.name}
					searchPlaceholder="Search employees..."
					searchValue={(e) => e.employee_name}
					emptyLabel="No employees yet."
					columns={[
						{ key: "employee_name", label: "Name", sortable: true, value: (e) => e.employee_name },
						{ key: "department", label: "Department", sortable: true, value: (e) => e.department },
						{ key: "designation", label: "Designation", value: (e) => e.designation },
						{ key: "status", label: "Status", value: (e) => e.status },
					]}
				/>
			}
		/>
	);
}
