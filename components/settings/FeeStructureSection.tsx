"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AcademicYearRow, FeeCategoryRow, FeeStructureRow, ProgramRow } from "@/lib/types";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";

interface ComponentRow {
	fees_category: string;
	amount: string;
}

const emptyComponent: ComponentRow = { fees_category: "", amount: "" };

export function FeeStructureSection() {
	const [rows, setRows] = useState<FeeStructureRow[]>([]);
	const [programs, setPrograms] = useState<ProgramRow[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
	const [feeCategories, setFeeCategories] = useState<FeeCategoryRow[]>([]);

	const [program, setProgram] = useState("");
	const [academicYear, setAcademicYear] = useState("");
	const [components, setComponents] = useState<ComponentRow[]>([{ ...emptyComponent }]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);

	const load = () => api.listFeeStructures().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);
	useEffect(() => {
		api.listPrograms().then(setPrograms).catch(() => undefined);
		api.listAcademicYears().then(setAcademicYears).catch(() => undefined);
		api.listFeeCategories().then(setFeeCategories).catch(() => undefined);
	}, []);

	const updateComponent = (index: number, patch: Partial<ComponentRow>) => {
		setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createFeeStructure({
				program,
				academic_year: academicYear,
				components: components
					.filter((c) => c.fees_category && c.amount)
					.map((c) => ({ fees_category: c.fees_category, amount: Number(c.amount) })),
			});
			setProgram("");
			setAcademicYear("");
			setComponents([{ ...emptyComponent }]);
			setFormOpen(false);
			load();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SectionPage
			title="Fee Structures"
			count={rows.length}
			addLabel="+ Add Fee Structure"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-3">
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<select required className={inputClass} value={program} onChange={(e) => setProgram(e.target.value)}>
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
							value={academicYear}
							onChange={(e) => setAcademicYear(e.target.value)}
						>
							<option value="">Select Academic Year...</option>
							{academicYears.map((y) => (
								<option key={y.name} value={y.name}>
									{y.name}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-2">
						<span className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
							Fee Components
						</span>
						{components.map((c, i) => (
							<div key={i} className="flex gap-2">
								<select
									required
									className={`flex-1 ${inputClass}`}
									value={c.fees_category}
									onChange={(e) => updateComponent(i, { fees_category: e.target.value })}
								>
									<option value="">Select Fee Category...</option>
									{feeCategories.map((fc) => (
										<option key={fc.name} value={fc.name}>
											{fc.category_name}
										</option>
									))}
								</select>
								<input
									required
									type="number"
									placeholder="Amount"
									className={`w-32 ${inputClass}`}
									value={c.amount}
									onChange={(e) => updateComponent(i, { amount: e.target.value })}
								/>
								{components.length > 1 && (
									<button
										type="button"
										onClick={() => setComponents((prev) => prev.filter((_, idx) => idx !== i))}
										className="rounded-md border border-black/10 px-2 text-sm dark:border-white/10"
									>
										Remove
									</button>
								)}
							</div>
						))}
						<button
							type="button"
							onClick={() => setComponents((prev) => [...prev, { ...emptyComponent }])}
							className="w-fit rounded-md border border-black/10 px-3 py-1 text-xs dark:border-white/10"
						>
							+ Add component
						</button>
					</div>

					{(programs.length === 0 || academicYears.length === 0 || feeCategories.length === 0) && (
						<p className="text-xs text-black/50 dark:text-white/50">
							Add a Program, an Academic Year, and a Fee Category first.
						</p>
					)}

					<SubmitButton submitting={submitting} label="Save" />
				</form>
			}
			table={
				<DataTable
					rows={rows}
					rowKey={(r) => r.name}
					searchPlaceholder="Search fee structures..."
					searchValue={(r) => r.program}
					emptyLabel="No fee structures yet."
					columns={[
						{ key: "program", label: "Program", sortable: true, value: (r) => r.program },
						{ key: "academic_year", label: "Academic Year", value: (r) => r.academic_year },
						{ key: "total_amount", label: "Total", sortable: true, value: (r) => r.total_amount },
					]}
				/>
			}
		/>
	);
}
