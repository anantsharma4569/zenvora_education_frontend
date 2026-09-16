"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorState } from "@/components/DataState";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";
import type { StaffMember } from "@/lib/types";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const emptyForm = {
	first_name: "",
	last_name: "",
	gender: "",
	date_of_birth: "",
	department: "",
	designation: "",
	date_of_joining: "",
	company: "",
	personal_email: "",
	is_instructor: false,
};

const COLUMNS = [
	{ key: "employee_name", label: "Name", sortable: true, value: (s: StaffMember) => s.employee_name },
	{ key: "department", label: "Department", sortable: true, value: (s: StaffMember) => s.department },
	{ key: "designation", label: "Designation", value: (s: StaffMember) => s.designation },
];

export default function StaffPage() {
	const [teachingStaff, setTeachingStaff] = useState<StaffMember[]>([]);
	const [nonTeachingStaff, setNonTeachingStaff] = useState<StaffMember[]>([]);
	const [tab, setTab] = useState<"teaching" | "non-teaching">("teaching");
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const load = () => {
		setError(null);
		api
			.getStaffDirectory()
			.then(({ teachingStaff, nonTeachingStaff }) => {
				setTeachingStaff(teachingStaff);
				setNonTeachingStaff(nonTeachingStaff);
			})
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
			setFormOpen(false);
			load();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	if (error) return <ErrorState message={error} />;

	const rows = tab === "teaching" ? teachingStaff : nonTeachingStaff;

	return (
		<SectionPage
			title="Staff"
			count={teachingStaff.length + nonTeachingStaff.length}
			description="Teaching and non-teaching staff records"
			addLabel="+ Add Staff"
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
					<select
						required
						className={inputClass}
						value={form.gender}
						onChange={(e) => setForm({ ...form, gender: e.target.value })}
					>
						<option value="">Select Gender...</option>
						{GENDER_OPTIONS.map((g) => (
							<option key={g} value={g}>
								{g}
							</option>
						))}
					</select>
					<input
						required
						type="date"
						placeholder="Date of Birth"
						className={inputClass}
						value={form.date_of_birth}
						onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
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
						<SubmitButton submitting={submitting} label="Create Staff Member" />
					</div>
				</form>
			}
			table={
				<div>
					<div className="mb-4 flex gap-2 border-b border-black/10 dark:border-white/10">
						{(
							[
								["teaching", `Teaching Staff (${teachingStaff.length})`],
								["non-teaching", `Non-Teaching Staff (${nonTeachingStaff.length})`],
							] as const
						).map(([key, label]) => (
							<button
								key={key}
								onClick={() => setTab(key)}
								className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
									tab === key
										? "border-black text-black dark:border-white dark:text-white"
										: "border-transparent text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
								}`}
							>
								{label}
							</button>
						))}
					</div>
					<DataTable
						rows={rows}
						rowKey={(s) => s.employee}
						searchPlaceholder={`Search ${tab === "teaching" ? "teaching" : "non-teaching"} staff...`}
						searchValue={(s) => s.employee_name}
						emptyLabel={tab === "teaching" ? "No teaching staff yet." : "No non-teaching staff yet."}
						columns={COLUMNS}
					/>
				</div>
			}
		/>
	);
}
