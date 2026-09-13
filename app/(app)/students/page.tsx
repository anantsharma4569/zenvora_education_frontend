"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import type { AcademicYearRow, ProgramRow, StudentRow } from "@/lib/types";

const emptyForm = {
	first_name: "",
	last_name: "",
	student_email_id: "",
	date_of_birth: "",
	gender: "",
	program: "",
	academic_year: "",
};

export default function StudentsPage() {
	const { role } = useRole();
	const [students, setStudents] = useState<StudentRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const loadStudents = () => {
		setError(null);
		api
			.listStudents(search ? { search } : undefined)
			.then(setStudents)
			.catch((err) => setError(err.message));
	};

	useEffect(() => {
		const handle = setTimeout(loadStudents, 250);
		return () => clearTimeout(handle);
	}, [search]);

	useEffect(() => {
		if (role !== "admin") return;
		api.listPrograms().then(setPrograms).catch(() => undefined);
		api.listAcademicYears().then(setAcademicYears).catch(() => undefined);
	}, [role]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setFormError(null);
		try {
			await api.createStudent(form);
			setForm(emptyForm);
			loadStudents();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div>
			<PageHeader
				title="Students"
				subtitle={
					role === "teacher"
						? "Students in your assigned Student Groups"
						: role === "accounts"
							? "Search students to attach fee invoices/payments"
							: "All students"
				}
			/>

			{role === "admin" && (
				<div className="mb-8 rounded-lg border border-black/10 p-4 dark:border-white/10">
					<h2 className="mb-3 text-sm font-medium">Add Student</h2>
					<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<input
							required
							placeholder="First Name"
							className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
							value={form.first_name}
							onChange={(e) => setForm({ ...form, first_name: e.target.value })}
						/>
						<input
							placeholder="Last Name"
							className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
							value={form.last_name}
							onChange={(e) => setForm({ ...form, last_name: e.target.value })}
						/>
						<input
							required
							type="email"
							placeholder="Student Email"
							className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
							value={form.student_email_id}
							onChange={(e) => setForm({ ...form, student_email_id: e.target.value })}
						/>
						<input
							type="date"
							placeholder="Date of Birth"
							className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
							value={form.date_of_birth}
							onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
						/>
						<select
							required
							className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
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
							className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
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

						{programs.length === 0 && (
							<p className="text-xs text-black/50 sm:col-span-2 dark:text-white/50">
								No Programs configured yet - add one in Settings first.
							</p>
						)}
						{academicYears.length === 0 && (
							<p className="text-xs text-black/50 sm:col-span-2 dark:text-white/50">
								No Academic Years configured yet - add one in Settings first.
							</p>
						)}

						{formError && (
							<div className="sm:col-span-2">
								<ErrorState message={formError} />
							</div>
						)}

						<button
							type="submit"
							disabled={submitting}
							className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black sm:col-span-2 sm:w-fit"
						>
							{submitting ? "Creating..." : "Create Student"}
						</button>
					</form>
				</div>
			)}

			{(role === "admin" || role === "accounts") && (
				<input
					placeholder="Search by name..."
					className="mb-4 w-full max-w-sm rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			)}

			{error && <ErrorState message={error} />}
			{!error && !students && <LoadingState />}
			{!error && students && students.length === 0 && <EmptyState label="No students found." />}
			{!error && students && students.length > 0 && (
				<table className="w-full text-left text-sm">
					<thead className="text-black/50 dark:text-white/50">
						<tr>
							<th className="py-2">Name</th>
							<th className="py-2">Email</th>
							<th className="py-2">Status</th>
						</tr>
					</thead>
					<tbody>
						{students.map((s) => (
							<tr key={s.name} className="border-t border-black/10 dark:border-white/10">
								<td className="py-2">{s.student_name}</td>
								<td className="py-2">{s.student_email_id || "-"}</td>
								<td className="py-2">{s.enabled ? "Enabled" : "Disabled"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
