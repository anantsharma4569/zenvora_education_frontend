"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DepartmentRow, ProgramRow } from "@/lib/types";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

const empty = (): Values => ({ program_name: "", department: "" });

export function ProgramSection() {
	const [rows, setRows] = useState<ProgramRow[]>([]);
	const [departments, setDepartments] = useState<DepartmentRow[]>([]);

	const load = () => api.listPrograms().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
		api.listDepartments().then(setDepartments).catch(() => undefined);
	}, []);

	const fields: FieldDef[] = [
		{ key: "program_name", label: "Program Name", type: "text", required: true, placeholder: "e.g. Grade 10" },
		{
			key: "department",
			label: "Department",
			type: "select",
			options: departments.map((d) => ({ value: d.name, label: d.department_name })),
		},
	];

	return (
		<ResourcePage<ProgramRow>
			title="Programs"
			singular="Program"
			description="The class or grade a student is enrolled in, e.g. Grade 1 to Grade 10"
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={(r) => r.program_name}
			searchPlaceholder="Search programs..."
			searchValue={(r) => r.program_name}
			emptyLabel="No programs yet."
			columns={[
				{ key: "program_name", label: "Program", sortable: true, value: (r) => r.program_name },
				{ key: "department", label: "Department", sortable: true, value: (r) => r.department || "-" },
			]}
			fields={fields}
			emptyValues={empty}
			reload={load}
			onCreate={(v) =>
				api.createProgram({ program_name: v.program_name as string, department: (v.department as string) || undefined })
			}
			loadForEdit={async (r) => ({ program_name: r.program_name, department: r.department || "" })}
			onUpdate={(r, v) => api.updateRecord("program", r.name, { program_name: v.program_name, department: v.department })}
			onDelete={(list) => api.deleteRecords("program", list.map((r) => r.name))}
		/>
	);
}
