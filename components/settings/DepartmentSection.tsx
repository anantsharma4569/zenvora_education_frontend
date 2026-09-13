"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DepartmentRow } from "@/lib/types";
import { SetupCard, SubmitButton, inputClass } from "./SetupCard";

export function DepartmentSection() {
	const [rows, setRows] = useState<DepartmentRow[]>([]);
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = () => api.listDepartments().then(setRows).catch(() => undefined);

	useEffect(() => {
		load();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.createDepartment({ department_name: name });
			setName("");
			load();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SetupCard
			title="Departments"
			formError={error}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
					<input
						required
						placeholder="Department Name"
						className={`flex-1 ${inputClass}`}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<SubmitButton submitting={submitting} label="Add" />
				</form>
			}
			list={
				<ul className="flex flex-wrap gap-2 text-sm">
					{rows.map((d) => (
						<li key={d.name} className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
							{d.department_name}
						</li>
					))}
				</ul>
			}
		/>
	);
}
