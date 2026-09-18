"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicTermRow, AcademicYearRow } from "@/lib/types";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

const empty = (): Values => ({ academic_year: "", term_name: "", term_start_date: "", term_end_date: "" });

export function AcademicTermSection() {
	const [rows, setRows] = useState<AcademicTermRow[]>([]);
	const [years, setYears] = useState<AcademicYearRow[]>([]);

	const load = () => api.listAcademicTerms().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
		api.listAcademicYears().then(setYears).catch(() => undefined);
	}, []);

	const fields: FieldDef[] = [
		{
			key: "academic_year",
			label: "Academic Year",
			type: "select",
			required: true,
			lockedOnEdit: true,
			options: years.map((y) => ({ value: y.name, label: y.name })),
		},
		{ key: "term_name", label: "Term Name", type: "text", required: true, placeholder: "e.g. Term 1" },
		{ key: "term_start_date", label: "Start Date", type: "date", required: true },
		{
			key: "term_end_date",
			label: "End Date",
			type: "date",
			required: true,
			validate: (v) =>
				v.term_start_date && v.term_end_date && (v.term_end_date as string) <= (v.term_start_date as string)
					? "End date must be after the start date"
					: null,
		},
	];

	return (
		<ResourcePage<AcademicTermRow>
			title="Academic Terms"
			singular="Academic Term"
			description="Terms or semesters within an Academic Year"
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={(r) => r.name}
			searchPlaceholder="Search terms..."
			searchValue={(r) => r.name}
			emptyLabel="No academic terms yet."
			columns={[
				{ key: "term_name", label: "Term", sortable: true, value: (r) => r.term_name },
				{ key: "academic_year", label: "Academic Year", sortable: true, value: (r) => r.academic_year },
				{ key: "term_start_date", label: "Starts", sortable: true, value: (r) => r.term_start_date || "" },
				{ key: "term_end_date", label: "Ends", sortable: true, value: (r) => r.term_end_date || "" },
			]}
			fields={fields}
			emptyValues={empty}
			reload={load}
			onCreate={(v) =>
				api.createAcademicTerm({
					academic_year: v.academic_year as string,
					term_name: v.term_name as string,
					term_start_date: v.term_start_date as string,
					term_end_date: v.term_end_date as string,
				})
			}
			loadForEdit={async (r) => ({
				academic_year: r.academic_year,
				term_name: r.term_name,
				term_start_date: r.term_start_date,
				term_end_date: r.term_end_date,
			})}
			onUpdate={(r, v) =>
				api.updateRecord("academic_term", r.name, {
					term_name: v.term_name,
					term_start_date: v.term_start_date,
					term_end_date: v.term_end_date,
				})
			}
			onDelete={(list) => api.deleteRecords("academic_term", list.map((r) => r.name))}
		/>
	);
}
