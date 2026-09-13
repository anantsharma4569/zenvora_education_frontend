"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import type { ResultRow } from "@/lib/types";

export default function ExamsPage() {
	const { role } = useRole();
	const [results, setResults] = useState<ResultRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setError(null);
		const request = role === "student" ? api.getMyResults() : api.getResults();
		request.then(setResults).catch((err) => setError(err.message));
	}, [role]);

	return (
		<div>
			<PageHeader
				title="Exams & Results"
				subtitle={role === "student" ? "Your results" : "Assessment results across your Student Groups"}
			/>

			{role === "accounts" && <EmptyState label="Exams & Results is not part of the Accounts view." />}

			{role !== "accounts" && (
				<>
					{error && <ErrorState message={error} />}
					{!error && !results && <LoadingState />}
					{!error && results && results.length === 0 && <EmptyState label="No results recorded yet." />}
					{!error && results && results.length > 0 && (
						<table className="w-full text-left text-sm">
							<thead className="text-black/50 dark:text-white/50">
								<tr>
									{role !== "student" && <th className="py-2">Student</th>}
									<th className="py-2">Course</th>
									<th className="py-2">Group</th>
									<th className="py-2">Score</th>
									<th className="py-2">Grade</th>
								</tr>
							</thead>
							<tbody>
								{results.map((r) => (
									<tr key={r.name} className="border-t border-black/10 dark:border-white/10">
										{role !== "student" && <td className="py-2">{r.student_name}</td>}
										<td className="py-2">{r.course}</td>
										<td className="py-2">{r.student_group}</td>
										<td className="py-2">
											{r.total_score} / {r.maximum_score}
										</td>
										<td className="py-2">{r.grade}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</>
			)}
		</div>
	);
}
