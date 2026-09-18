"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CompanyRow, DepartmentRow } from "@/lib/types";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

const empty = (): Values => ({ department_name: "", company: "" });

export function DepartmentSection() {
	const [rows, setRows] = useState<DepartmentRow[]>([]);
	const [companies, setCompanies] = useState<CompanyRow[]>([]);

	const load = () => api.listDepartments().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
		api.listCompanies().then(setCompanies).catch(() => undefined);
	}, []);

	const fields: FieldDef[] = [
		{ key: "department_name", label: "Department Name", type: "text", required: true, placeholder: "e.g. Science" },
		{
			key: "company",
			label: "Company",
			type: "select",
			required: true,
			lockedOnEdit: true,
			options: companies.map((c) => ({ value: c.name, label: c.name })),
		},
	];

	return (
		<ResourcePage<DepartmentRow>
			title="Departments"
			singular="Department"
			description="Groups staff and programs, e.g. Academics, Administration"
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={(r) => r.department_name}
			searchPlaceholder="Search departments..."
			searchValue={(r) => r.department_name}
			emptyLabel="No departments yet."
			columns={[
				{ key: "department_name", label: "Department", sortable: true, value: (r) => r.department_name },
				{ key: "company", label: "Company", sortable: true, value: (r) => r.company },
			]}
			fields={fields}
			emptyValues={empty}
			openValues={(): Values => (companies.length === 1 ? { company: companies[0].name } : {})}
			reload={load}
			onCreate={(v) =>
				api.createDepartment({ department_name: v.department_name as string, company: (v.company as string) || undefined })
			}
			loadForEdit={async (r) => ({ department_name: r.department_name, company: r.company })}
			onUpdate={(r, v) => api.updateRecord("department", r.name, { department_name: v.department_name })}
			onDelete={(list) => api.deleteRecords("department", list.map((r) => r.name))}
		/>
	);
}
