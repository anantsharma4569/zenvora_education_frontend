"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import type { StudentRow } from "@/lib/types";

export default function StudentsPage() {
	const { role } = useRole();
	const [students, setStudents] = useState<StudentRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	useEffect(() => {
		const handle = setTimeout(() => {
			setError(null);
			api
				.listStudents(search ? { search } : undefined)
				.then(setStudents)
				.catch((err) => setError(err.message));
		}, 250);

		return () => clearTimeout(handle);
	}, [search]);

	return (
		<div>
			<PageHeader
				title="Students"
				subtitle={
					role === "teacher"
						? "Students in your assigned Student Groups"
						: role === "accounts"
							? "Search students to attach fee invoices/payments"
							: "All students"
				}
			/>

			{(role === "admin" || role === "accounts") && (
				<input
					placeholder="Search by name..."
					className="mb-4 w-full max-w-sm rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			)}

			{error && <ErrorState message={error} />}
			{!error && !students && <LoadingState />}
			{!error && students && students.length === 0 && <EmptyState label="No students found." />}
			{!error && students && students.length > 0 && (
				<table className="w-full text-left text-sm">
					<thead className="text-black/50 dark:text-white/50">
						<tr>
							<th className="py-2">Name</th>
							<th className="py-2">Email</th>
							<th className="py-2">Status</th>
						</tr>
					</thead>
					<tbody>
						{students.map((s) => (
							<tr key={s.name} className="border-t border-black/10 dark:border-white/10">
								<td className="py-2">{s.student_name}</td>
								<td className="py-2">{s.student_email_id || "-"}</td>
								<td className="py-2">{s.enabled ? "Enabled" : "Disabled"}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
