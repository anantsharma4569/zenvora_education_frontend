"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicTermRow, AcademicYearRow, ProgramRow, StudentGroupRow } from "@/lib/types";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

const empty = (): Values => ({
	student_group_name: "",
	program: "",
	academic_year: "",
	academic_term: "",
	max_strength: "",
	disabled: false,
});

export function StudentGroupSection() {
	const [rows, setRows] = useState<StudentGroupRow[]>([]);
	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [years, setYears] = useState<AcademicYearRow[]>([]);
	const [terms, setTerms] = useState<AcademicTermRow[]>([]);

	const load = () => api.listStudentGroups().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
		api.listPrograms().then(setPrograms).catch(() => undefined);
		api.listAcademicYears().then(setYears).catch(() => undefined);
		api.listAcademicTerms().then(setTerms).catch(() => undefined);
	}, []);

	const fields: FieldDef[] = [
		{ key: "student_group_name", label: "Section Name", type: "text", required: true, placeholder: "e.g. Grade 10 - A", full: true },
		{
			key: "program",
			label: "Class (Program)",
			type: "select",
			required: true,
			lockedOnEdit: true,
			options: programs.map((p) => ({ value: p.name, label: p.program_name })),
		},
		{
			key: "academic_year",
			label: "Academic Year",
			type: "select",
			required: true,
			lockedOnEdit: true,
			options: years.map((y) => ({ value: y.name, label: y.name })),
		},
		{
			key: "academic_term",
			label: "Academic Term",
			type: "select",
			options: (v) =>
				terms.filter((t) => t.academic_year === v.academic_year).map((t) => ({ value: t.name, label: t.term_name })),
			help: "Pick an Academic Year first.",
		},
		{ key: "max_strength", label: "Maximum Students", type: "number", placeholder: "0 = no limit" },
		{ key: "disabled", label: "Disabled", type: "checkbox", placeholder: "This section is disabled", hidden: (_v, editing) => !editing },
	];

	return (
		<ResourcePage<StudentGroupRow>
			title="Student Groups"
			singular="Section"
			description="Class sections, e.g. Grade 10 - A. Students are placed into a section."
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={(r) => r.student_group_name}
			searchPlaceholder="Search sections..."
			searchValue={(r) => r.student_group_name}
			emptyLabel="No sections yet."
			columns={[
				{ key: "student_group_name", label: "Section", sortable: true, value: (r) => r.student_group_name },
				{ key: "program", label: "Class", sortable: true, value: (r) => r.program },
				{ key: "academic_year", label: "Academic Year", value: (r) => r.academic_year },
				{ key: "academic_term", label: "Term", value: (r) => r.academic_term || "-" },
				{ key: "student_count", label: "Students", sortable: true, align: "right", value: (r) => r.student_count ?? 0 },
				{ key: "max_strength", label: "Max", align: "right", value: (r) => r.max_strength || "-" },
				{ key: "disabled", label: "Status", value: (r) => (r.disabled ? "Disabled" : "Active") },
			]}
			fields={fields}
			emptyValues={empty}
			onChangeField={(key, next) => (key === "academic_year" ? { ...next, academic_term: "" } : next)}
			reload={load}
			onCreate={(v) =>
				api.createStudentGroup({
					student_group_name: v.student_group_name as string,
					program: v.program as string,
					academic_year: v.academic_year as string,
					academic_term: (v.academic_term as string) || undefined,
					max_strength: v.max_strength ? Number(v.max_strength) : undefined,
				})
			}
			loadForEdit={async (r) => {
				const rec = await api.getRecord("student_group", r.name);
				return {
					student_group_name: rec.student_group_name as string,
					program: r.program,
					academic_year: r.academic_year,
					academic_term: rec.academic_term as string,
					max_strength: rec.max_strength === "0" ? "" : (rec.max_strength as string),
					disabled: rec.disabled === "1",
				};
			}}
			onUpdate={(r, v) =>
				api.updateRecord("student_group", r.name, {
					student_group_name: v.student_group_name,
					academic_term: v.academic_term,
					max_strength: v.max_strength || 0,
					disabled: v.disabled ? 1 : 0,
				})
			}
			onDelete={(list) => api.deleteRecords("student_group", list.map((r) => r.name))}
		/>
	);
}
