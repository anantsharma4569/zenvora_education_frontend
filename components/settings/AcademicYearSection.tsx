"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicYearRow } from "@/lib/types";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

const empty = (): Values => ({ academic_year_name: "", year_start_date: "", year_end_date: "" });

const endAfterStart = (v: Values) =>
	v.year_start_date && v.year_end_date && (v.year_end_date as string) <= (v.year_start_date as string)
		? "End date must be after the start date"
		: null;

const fields: FieldDef[] = [
	{ key: "academic_year_name", label: "Academic Year Name", type: "text", required: true, placeholder: "e.g. 2026-27", full: true },
	{ key: "year_start_date", label: "Start Date", type: "date", required: true },
	{ key: "year_end_date", label: "End Date", type: "date", required: true, validate: endAfterStart },
];

export function AcademicYearSection() {
	const [rows, setRows] = useState<AcademicYearRow[]>([]);
	const load = () => api.listAcademicYears().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
	}, []);

	return (
		<ResourcePage<AcademicYearRow>
			title="Academic Years"
			singular="Academic Year"
			description="A school session, e.g. 2026-27 (April to March)"
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={(r) => r.name}
			searchPlaceholder="Search academic years..."
			searchValue={(r) => r.name}
			emptyLabel="No academic years yet."
			columns={[
				{ key: "name", label: "Academic Year", sortable: true, value: (r) => r.name },
				{ key: "year_start_date", label: "Starts", sortable: true, value: (r) => r.year_start_date || "" },
				{ key: "year_end_date", label: "Ends", sortable: true, value: (r) => r.year_end_date || "" },
			]}
			fields={fields}
			emptyValues={empty}
			reload={load}
			onCreate={(v) =>
				api.createAcademicYear({
					academic_year_name: v.academic_year_name as string,
					year_start_date: v.year_start_date as string,
					year_end_date: v.year_end_date as string,
				})
			}
			loadForEdit={async (r) => {
				const rec = await api.getRecord("academic_year", r.name);
				return {
					academic_year_name: rec.academic_year_name as string,
					year_start_date: rec.year_start_date as string,
					year_end_date: rec.year_end_date as string,
				};
			}}
			onUpdate={(r, v) => api.updateRecord("academic_year", r.name, v)}
			onDelete={(list) => api.deleteRecords("academic_year", list.map((r) => r.name))}
		/>
	);
}
