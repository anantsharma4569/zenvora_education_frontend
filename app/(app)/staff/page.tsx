"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ErrorState } from "@/components/DataState";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";
import type { CompanyRow, DepartmentRow, DesignationRow, StaffMember } from "@/lib/types";

const GENDERS = ["Male", "Female", "Other"].map((g) => ({ value: g, label: g }));

const empty = (): Values => ({
	first_name: "",
	last_name: "",
	gender: "",
	date_of_birth: "",
	department: "",
	designation: "",
	company: "",
	date_of_joining: "",
	personal_email: "",
	password: "",
	is_instructor: false,
});

export default function StaffPage() {
	const [teachingStaff, setTeachingStaff] = useState<StaffMember[]>([]);
	const [nonTeachingStaff, setNonTeachingStaff] = useState<StaffMember[]>([]);
	const [tab, setTab] = useState<"teaching" | "non-teaching">("teaching");
	const [error, setError] = useState<string | null>(null);
	const [departments, setDepartments] = useState<DepartmentRow[]>([]);
	const [companies, setCompanies] = useState<CompanyRow[]>([]);
	const [designations, setDesignations] = useState<DesignationRow[]>([]);

	const load = () => {
		setError(null);
		return api
			.getStaffDirectory()
			.then(({ teachingStaff, nonTeachingStaff }) => {
				setTeachingStaff(teachingStaff);
				setNonTeachingStaff(nonTeachingStaff);
			})
			.catch((err) => setError(err.message));
	};

	useEffect(() => {
		load();
		api.listDepartments().then(setDepartments).catch(() => undefined);
		api.listDesignations().then(setDesignations).catch(() => undefined);
		api.listCompanies().then(setCompanies).catch(() => undefined);
	}, []);

	if (error) return <ErrorState message={error} />;

	const fields: FieldDef[] = [
		{ key: "first_name", label: "First Name", type: "text", required: true },
		{ key: "last_name", label: "Last Name", type: "text" },
		{ key: "gender", label: "Gender", type: "select", required: true, options: GENDERS },
		{ key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
		{
			key: "department",
			label: "Department",
			type: "select",
			required: true,
			options: departments.map((d) => ({ value: d.name, label: d.department_name })),
		},
		{
			key: "designation",
			label: "Designation",
			type: "select",
			required: true,
			options: designations.map((d) => ({
				value: d.name,
				label: d.name,
				group: d.is_teaching_role ? "Teaching" : "Non-teaching",
			})),
		},
		{
			key: "company",
			label: "Company",
			type: "select",
			required: true,
			createOnly: true,
			options: companies.map((c) => ({ value: c.name, label: c.name })),
		},
		{ key: "date_of_joining", label: "Date of Joining", type: "date", required: true },
		{
			key: "personal_email",
			label: "Personal Email",
			type: "email",
			requiredWhen: (v) => !!v.password,
			help: "Used as the login name when a password is set.",
		},
		{
			key: "password",
			label: "Login Password",
			type: "password",
			createOnly: true,
			help: "Optional - creates a login so they can sign in.",
		},
		{
			key: "is_instructor",
			label: "Teacher",
			type: "checkbox",
			createOnly: true,
			placeholder: "This person is a teacher (also create an Instructor record)",
			full: true,
		},
	];

	const rows = tab === "teaching" ? teachingStaff : nonTeachingStaff;

	return (
		<ResourcePage<StaffMember>
			title="Staff"
			singular="Staff Member"
			description="Teaching and non-teaching staff records"
			rows={rows}
			rowKey={(s) => s.employee}
			rowLabel={(s) => `${s.employee_name} (${s.designation})`}
			searchPlaceholder={`Search ${tab === "teaching" ? "teaching" : "non-teaching"} staff...`}
			searchValue={(s) => s.employee_name}
			emptyLabel={tab === "teaching" ? "No teaching staff yet." : "No non-teaching staff yet."}
			beforeTable={
				<div className="mb-4 flex gap-2 border-b border-line">
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
								tab === key ? "border-accent text-accent" : "border-transparent text-black/50 hover:text-black"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			}
			columns={[
				{ key: "employee_name", label: "Name", sortable: true, value: (s) => s.employee_name },
				{ key: "department", label: "Department", sortable: true, value: (s) => s.department },
				{ key: "designation", label: "Designation", sortable: true, value: (s) => s.designation },
				{ key: "personal_email", label: "Email", value: (s) => s.personal_email || "-" },
				{ key: "date_of_joining", label: "Joined", sortable: true, value: (s) => s.date_of_joining || "-" },
				{
					key: "has_login",
					label: "Login",
					value: (s) => (s.has_login ? "Yes" : "No"),
					render: (s) => (
						<span
							className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.has_login ? "bg-mint text-accent" : "bg-black/[0.06] text-black/50"}`}
						>
							{s.has_login ? "Yes" : "No"}
						</span>
					),
				},
			]}
			fields={fields}
			emptyValues={empty}
			openValues={(): Values => (companies.length === 1 ? { company: companies[0].name } : {})}
			onChangeField={(key, next) => {
				if (key !== "designation") return next;
				const picked = designations.find((d) => d.name === next.designation);
				// A teaching designation implies a teacher - the checkbox stays editable.
				return picked ? { ...next, is_instructor: picked.is_teaching_role } : next;
			}}
			reload={load}
			onCreate={(v) =>
				api.createEmployee({
					first_name: v.first_name as string,
					last_name: (v.last_name as string) || undefined,
					gender: v.gender as string,
					date_of_birth: v.date_of_birth as string,
					department: v.department as string,
					designation: v.designation as string,
					company: v.company as string,
					date_of_joining: v.date_of_joining as string,
					personal_email: (v.personal_email as string) || undefined,
					password: (v.password as string) || undefined,
					is_instructor: v.is_instructor === true,
				})
			}
			loadForEdit={async (s) => {
				const rec = await api.getRecord("employee", s.employee);
				return Object.fromEntries(
					["first_name", "last_name", "gender", "date_of_birth", "department", "designation", "date_of_joining", "personal_email"].map(
						(k) => [k, rec[k] as string],
					),
				);
			}}
			onUpdate={(s, v) =>
				api.updateRecord("employee", s.employee, {
					first_name: v.first_name,
					last_name: v.last_name,
					gender: v.gender,
					date_of_birth: v.date_of_birth,
					department: v.department,
					designation: v.designation,
					date_of_joining: v.date_of_joining,
					personal_email: v.personal_email,
				})
			}
			deleteVerb="Disable"
			onDelete={(list) => api.deleteRecords("employee", list.map((s) => s.employee))}
		/>
	);
}
