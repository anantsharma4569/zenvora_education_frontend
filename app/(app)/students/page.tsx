"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/DataState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { inputClass } from "@/components/FormControls";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";
import type { AcademicYearRow, ProgramRow, StudentGroupRow, StudentRow } from "@/lib/types";

const GENDERS = ["Male", "Female", "Other"].map((g) => ({ value: g, label: g }));

const empty = (): Values => ({
	first_name: "",
	last_name: "",
	student_email_id: "",
	date_of_birth: "",
	gender: "",
	program: "",
	student_group: "",
	academic_year: "",
});

export default function StudentsPage() {
	const { role } = useRole();
	const [students, setStudents] = useState<StudentRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [studentGroups, setStudentGroups] = useState<StudentGroupRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [classFilter, setClassFilter] = useState("");
	const [sectionFilter, setSectionFilter] = useState("");

	const loadStudents = () => {
		setError(null);
		return api
			.listStudents({ program: classFilter || undefined, student_group: sectionFilter || undefined })
			.then(setStudents)
			.catch((err) => setError(err.message));
	};

	useEffect(() => {
		loadStudents();
	}, [classFilter, sectionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

	// Section only makes sense within a class - drop it whenever the class changes.
	useEffect(() => {
		setSectionFilter("");
	}, [classFilter]);

	useEffect(() => {
		if (role !== "admin" && role !== "accounts") return;
		api.listPrograms().then(setPrograms).catch(() => undefined);
		api.listStudentGroups().then(setStudentGroups).catch(() => undefined);
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

	const sectionsFor = (program: string) =>
		studentGroups
			.filter((g) => g.program === program)
			.sort((a, b) => a.student_group_name.localeCompare(b.student_group_name));
	const sectionsForClass = sectionsFor(classFilter);

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

	const columns: DataTableColumn<StudentRow>[] = [
		{ key: "student_name", label: "Name", sortable: true, value: (s) => s.student_name },
		{ key: "program", label: "Class", sortable: true, value: (s) => s.program || "-" },
		{
			key: "student_group",
			label: "Section",
			sortable: true,
			value: (s) => s.student_group || "-",
			render: (s) => (s.student_group ? s.student_group : <span className="text-black/35">No section</span>),
		},
		{ key: "student_email_id", label: "Email", value: (s) => s.student_email_id || "-" },
		{ key: "enabled", label: "Status", value: (s) => (s.enabled ? "Enabled" : "Disabled") },
	];

	const filters =
		(role === "admin" || role === "accounts") && sortedPrograms.length > 0 ? (
			<>
				<select
					aria-label="Filter by class"
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
				{classFilter && sectionsForClass.length > 0 && (
					<select
						aria-label="Filter by section"
						className={inputClass}
						value={sectionFilter}
						onChange={(e) => setSectionFilter(e.target.value)}
					>
						<option value="">All sections</option>
						{sectionsForClass.map((g) => (
							<option key={g.name} value={g.name}>
								{g.student_group_name.startsWith(`${classFilter} - `)
									? `Section ${g.student_group_name.slice(classFilter.length + 3)}`
									: g.student_group_name}
							</option>
						))}
					</select>
				)}
			</>
		) : undefined;

	const emptyLabel = sectionFilter
		? "No students found in this section."
		: classFilter
			? "No students found in this class."
			: "No students found.";

	if (role !== "admin") {
		return (
			<div>
				<PageHeader title="Students" subtitle={subtitle} />
				<DataTable
					rows={students}
					rowKey={(s) => s.name}
					searchPlaceholder="Search by name..."
					searchValue={role === "accounts" ? (s) => s.student_name : undefined}
					emptyLabel={emptyLabel}
					filters={filters}
					columns={columns}
				/>
			</div>
		);
	}

	const fields: FieldDef[] = [
		{ key: "first_name", label: "First Name", type: "text", required: true },
		{ key: "last_name", label: "Last Name", type: "text" },
		{
			key: "student_email_id",
			label: "Student Email",
			type: "email",
			required: true,
			lockedOnEdit: true,
			help: "Also the student's login name.",
		},
		{ key: "date_of_birth", label: "Date of Birth", type: "date" },
		{ key: "gender", label: "Gender", type: "select", options: GENDERS },
		{
			key: "program",
			label: "Class (Program)",
			type: "select",
			required: true,
			createOnly: true,
			options: programs.map((p) => ({ value: p.name, label: p.program_name })),
		},
		{
			key: "student_group",
			label: "Section",
			type: "select",
			createOnly: true,
			disabled: (v) => !v.program,
			// Mandatory whenever the chosen class has sections - otherwise a class with none could never be saved.
			requiredWhen: (v) => !!v.program && sectionsFor(v.program as string).length > 0,
			options: (v) => sectionsFor(v.program as string).map((g) => ({ value: g.name, label: g.student_group_name })),
		},
		{
			key: "academic_year",
			label: "Academic Year",
			type: "select",
			required: true,
			createOnly: true,
			options: academicYears.map((y) => ({ value: y.name, label: y.name })),
		},
	];

	return (
		<ResourcePage<StudentRow>
			title="Students"
			singular="Student"
			description={subtitle}
			rows={students}
			rowKey={(s) => s.name}
			rowLabel={(s) => s.student_name}
			searchPlaceholder="Search by name..."
			searchValue={(s) => s.student_name}
			emptyLabel={emptyLabel}
			filters={filters}
			columns={columns}
			fields={fields}
			emptyValues={empty}
			onChangeField={(key, next) => (key === "program" ? { ...next, student_group: "" } : next)}
			reload={loadStudents}
			onCreate={(v) =>
				api.createStudent({
					first_name: v.first_name as string,
					last_name: (v.last_name as string) || undefined,
					student_email_id: v.student_email_id as string,
					date_of_birth: (v.date_of_birth as string) || undefined,
					gender: (v.gender as string) || undefined,
					program: v.program as string,
					student_group: (v.student_group as string) || undefined,
					academic_year: v.academic_year as string,
				})
			}
			loadForEdit={async (s) => {
				const rec = await api.getRecord("student", s.name);
				return {
					first_name: rec.first_name as string,
					last_name: rec.last_name as string,
					date_of_birth: rec.date_of_birth as string,
					gender: rec.gender as string,
					student_email_id: s.student_email_id ?? "",
				};
			}}
			onUpdate={(s, v) =>
				api.updateRecord("student", s.name, {
					first_name: v.first_name,
					last_name: v.last_name,
					date_of_birth: v.date_of_birth,
					gender: v.gender,
				})
			}
			deleteVerb="Disable"
			onDelete={(list) => api.deleteRecords("student", list.map((s) => s.name))}
		/>
	);
}
