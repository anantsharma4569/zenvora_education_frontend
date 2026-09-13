"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
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
	const [employees, setEmployees] = useState<EmployeeRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const load = () => {
		setError(null);
		api
			.listEmployees()
			.then(setEmployees)
			.catch((err) => setError(err.message));
	};

	useEffect(load, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setFormError(null);
		try {
			await api.createEmployee(form);
			setForm(emptyForm);
			load();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div>
			<PageHeader title="Employees" subtitle="Staff and teacher records" />

			<div className="mb-8 rounded-lg border border-black/10 p-4 dark:border-white/10">
				<h2 className="mb-3 text-sm font-medium">Create Employee</h2>
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<input
						required
						placeholder="Employee Name"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={form.employee_name}
						onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
					/>
					<input
						required
						placeholder="Department"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={form.department}
						onChange={(e) => setForm({ ...form, department: e.target.value })}
					/>
					<input
						required
						placeholder="Designation"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={form.designation}
						onChange={(e) => setForm({ ...form, designation: e.target.value })}
					/>
					<input
						required
						placeholder="Company"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={form.company}
						onChange={(e) => setForm({ ...form, company: e.target.value })}
					/>
					<input
						required
						type="date"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={form.date_of_joining}
						onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })}
					/>
					<input
						type="email"
						placeholder="Personal Email"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
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

					{formError && <ErrorState message={formError} />}

					<button
						type="submit"
						disabled={submitting}
						className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black sm:col-span-2 sm:w-fit"
					>
						{submitting ? "Creating..." : "Create Employee"}
					</button>
				</form>
			</div>

			<h2 className="mb-3 text-sm font-medium">All Employees</h2>
			{error && <ErrorState message={error} />}
			{!error && !employees && <LoadingState />}
			{!error && employees && employees.length === 0 && <EmptyState label="No employees yet." />}
			{!error && employees && employees.length > 0 && (
				<table className="w-full text-left text-sm">
					<thead className="text-black/50 dark:text-white/50">
						<tr>
							<th className="py-2">Name</th>
							<th className="py-2">Department</th>
							<th className="py-2">Designation</th>
							<th className="py-2">Status</th>
						</tr>
					</thead>
					<tbody>
						{employees.map((emp) => (
							<tr key={emp.name} className="border-t border-black/10 dark:border-white/10">
								<td className="py-2">{emp.employee_name}</td>
								<td className="py-2">{emp.department}</td>
								<td className="py-2">{emp.designation}</td>
								<td className="py-2">{emp.status}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
