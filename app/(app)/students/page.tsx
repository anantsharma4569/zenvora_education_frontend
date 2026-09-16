"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/DataState";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";
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
	const [students, setStudents] = useState<StudentRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [classFilter, setClassFilter] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const loadStudents = () => {
		setError(null);
		api
			.listStudents({ program: classFilter || undefined })
			.then(setStudents)
			.catch((err) => setError(err.message));
	};

	useEffect(loadStudents, [classFilter]);

	useEffect(() => {
		if (role !== "admin" && role !== "accounts") return;
		api.listPrograms().then(setPrograms).catch(() => undefined);
	}, [role]);

	useEffect(() => {
		if (role !== "admin") return;
		api.listAcademicYears().then(setAcademicYears).catch(() => undefined);
	}, [role]);

	// "Grade 10" should sort after "Grade 9", not between "Grade 1" and "Grade 2".
	const sortedPrograms = [...programs].sort((a, b) => {
		const na = parseInt(a.program_name.match(/\d+/)?.[0] ?? "0", 10);
		const nb = parseInt(b.program_name.match(/\d+/)?.[0] ?? "0", 10);
		return na - nb || a.program_name.localeCompare(b.program_name);
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setFormError(null);
		try {
			await api.createStudent(form);
			setForm(emptyForm);
			setFormOpen(false);
			loadStudents();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	const subtitle =
		role === "teacher"
			? "Students in your assigned Student Groups"
			: role === "accounts"
				? "Search students to attach fee invoices/payments"
				: "All students";

	if (error) {
		return (
			<div>
				<PageHeader title="Students" subtitle={subtitle} />
				<ErrorState message={error} />
			</div>
		);
	}

	const table = (
		<DataTable
			rows={students}
			rowKey={(s) => s.name}
			searchPlaceholder="Search by name..."
			searchValue={role === "admin" || role === "accounts" ? (s) => s.student_name : undefined}
			emptyLabel={classFilter ? "No students found in this class." : "No students found."}
			filters={
				(role === "admin" || role === "accounts") && sortedPrograms.length > 0 ? (
					<select
						className={inputClass}
						value={classFilter}
						onChange={(e) => setClassFilter(e.target.value)}
					>
						<option value="">All classes</option>
						{sortedPrograms.map((p) => (
							<option key={p.name} value={p.name}>
								{p.program_name}
							</option>
						))}
					</select>
				) : undefined
			}
			columns={[
				{ key: "student_name", label: "Name", sortable: true, value: (s) => s.student_name },
				{ key: "student_email_id", label: "Email", value: (s) => s.student_email_id || "-" },
				{ key: "enabled", label: "Status", value: (s) => (s.enabled ? "Enabled" : "Disabled") },
			]}
		/>
	);

	if (role !== "admin") {
		return (
			<div>
				<PageHeader title="Students" subtitle={subtitle} />
				{table}
			</div>
		);
	}

	return (
		<SectionPage
			title="Students"
			count={students.length}
			description={subtitle}
			addLabel="+ Add Student"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={formError}
			form={
				<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<input
						required
						autoFocus
						placeholder="First Name"
						className={inputClass}
						value={form.first_name}
						onChange={(e) => setForm({ ...form, first_name: e.target.value })}
					/>
					<input
						placeholder="Last Name"
						className={inputClass}
						value={form.last_name}
						onChange={(e) => setForm({ ...form, last_name: e.target.value })}
					/>
					<input
						required
						type="email"
						placeholder="Student Email"
						className={inputClass}
						value={form.student_email_id}
						onChange={(e) => setForm({ ...form, student_email_id: e.target.value })}
					/>
					<input
						type="date"
						placeholder="Date of Birth"
						className={inputClass}
						value={form.date_of_birth}
						onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
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
							No Programs/Academic Years configured yet - add them in Settings first.
						</p>
					)}

					<div className="sm:col-span-2">
						<SubmitButton submitting={submitting} label="Create Student" />
					</div>
				</form>
			}
			table={table}
		/>
	);
}
