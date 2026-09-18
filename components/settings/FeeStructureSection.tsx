"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicTermRow, AcademicYearRow, FeeCategoryRow, FeeStructureRow, ProgramRow } from "@/lib/types";
import { inputClass } from "@/components/FormControls";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

type Component = { fees_category: string; amount: string };

const blank = (): Component => ({ fees_category: "", amount: "" });
const empty = (): Values => ({ program: "", academic_year: "", academic_term: "", components: [blank()] });

const validComponents = (v: Values): string | null => {
	const rows = (v.components as Component[]) ?? [];
	if (rows.length === 0 || rows.some((c) => !c.fees_category || c.amount === "" || Number(c.amount) < 0)) {
		return "Every fee component needs a Fee Category and an Amount";
	}
	return null;
};

export function FeeStructureSection() {
	const [rows, setRows] = useState<FeeStructureRow[]>([]);
	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [years, setYears] = useState<AcademicYearRow[]>([]);
	const [terms, setTerms] = useState<AcademicTermRow[]>([]);
	const [categories, setCategories] = useState<FeeCategoryRow[]>([]);

	const load = () => api.listFeeStructures().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
		api.listPrograms().then(setPrograms).catch(() => undefined);
		api.listAcademicYears().then(setYears).catch(() => undefined);
		api.listAcademicTerms().then(setTerms).catch(() => undefined);
		api.listFeeCategories().then(setCategories).catch(() => undefined);
	}, []);

	const fields: FieldDef[] = [
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
		{
			key: "components",
			label: "Fee Components",
			type: "custom",
			required: true,
			validate: validComponents,
			render: ({ values, set, error }) => {
				const list = (values.components as Component[]) ?? [];
				const update = (i: number, patch: Partial<Component>) =>
					set({ components: list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
				return (
					<div className="flex flex-col gap-2">
						{list.map((c, i) => (
							<div key={i} className="flex gap-2">
								<select
									aria-label="Fee Category"
									className={`min-w-0 flex-1 ${inputClass}`}
									value={c.fees_category}
									onChange={(e) => update(i, { fees_category: e.target.value })}
								>
									<option value="">Select Fee Category...</option>
									{categories.map((fc) => (
										<option key={fc.name} value={fc.name}>
											{fc.category_name}
										</option>
									))}
								</select>
								<input
									aria-label="Amount"
									type="number"
									min="0"
									placeholder="Amount"
									className={`w-32 ${inputClass}`}
									value={c.amount}
									onChange={(e) => update(i, { amount: e.target.value })}
								/>
								{list.length > 1 && (
									<button
										type="button"
										onClick={() => set({ components: list.filter((_, idx) => idx !== i) })}
										className="rounded-full border border-black/15 px-3 text-xs font-medium text-danger hover:bg-danger/5"
									>
										Remove
									</button>
								)}
							</div>
						))}
						<button
							type="button"
							onClick={() => set({ components: [...list, blank()] })}
							className="w-fit rounded-full border border-black/15 px-3.5 py-1 text-xs font-medium text-accent hover:bg-mint"
						>
							+ Add component
						</button>
						{error && (
							<p role="alert" className="text-[12px] font-medium text-danger">
								{error}
							</p>
						)}
					</div>
				);
			},
		},
	];

	const label = (r: FeeStructureRow) => `${r.program} · ${r.academic_year}`;

	return (
		<ResourcePage<FeeStructureRow>
			title="Fee Structures"
			singular="Fee Structure"
			description="What each class pays for an academic year, split into fee components"
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={label}
			searchPlaceholder="Search fee structures..."
			searchValue={label}
			emptyLabel="No fee structures yet."
			columns={[
				{ key: "program", label: "Class", sortable: true, value: (r) => r.program },
				{ key: "academic_year", label: "Academic Year", sortable: true, value: (r) => r.academic_year },
				{ key: "academic_term", label: "Term", value: (r) => r.academic_term || "-" },
				{
					key: "total_amount",
					label: "Total",
					sortable: true,
					align: "right",
					value: (r) => r.total_amount,
					render: (r) => `₹${Number(r.total_amount || 0).toLocaleString("en-IN")}`,
				},
			]}
			fields={fields}
			emptyValues={empty}
			onChangeField={(key, next) => (key === "academic_year" ? { ...next, academic_term: "" } : next)}
			reload={load}
			onCreate={(v) =>
				api.createFeeStructure({
					program: v.program as string,
					academic_year: v.academic_year as string,
					academic_term: (v.academic_term as string) || undefined,
					components: (v.components as Component[]).map((c) => ({ fees_category: c.fees_category, amount: Number(c.amount) })),
				})
			}
			loadForEdit={async (r) => {
				const rec = await api.getRecord("fee_structure", r.name);
				return {
					program: r.program,
					academic_year: r.academic_year,
					academic_term: rec.academic_term as string,
					components: rec.components as Component[],
				};
			}}
			onUpdate={(r, v) =>
				api.updateRecord("fee_structure", r.name, { academic_term: v.academic_term, components: v.components })
			}
			onDelete={(list) => api.deleteRecords("fee_structure", list.map((r) => r.name))}
		/>
	);
}
