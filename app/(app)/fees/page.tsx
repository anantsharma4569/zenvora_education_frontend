"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import type { FeeRow } from "@/lib/types";

export default function FeesPage() {
	const { role } = useRole();
	const [fees, setFees] = useState<FeeRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (role === "teacher") return;
		setError(null);
		const request = role === "student" ? api.getMyFees() : api.getFees();
		request.then(setFees).catch((err) => setError(err.message));
	}, [role]);

	return (
		<div>
			<PageHeader
				title="Fees / Billing"
				subtitle={role === "student" ? "Your fee balance" : "Invoices, payments and dues"}
			/>

			{role === "teacher" && <EmptyState label="Fees / Billing is not part of the Teacher view." />}

			{role !== "teacher" && (
				<>
					{error && <ErrorState message={error} />}
					{!error && !fees && <LoadingState />}
					{!error && fees && fees.length === 0 && <EmptyState label="No fee invoices yet." />}
					{!error && fees && fees.length > 0 && (
						<table className="w-full text-left text-sm">
							<thead className="text-black/50 dark:text-white/50">
								<tr>
									{role !== "student" && <th className="py-2">Student</th>}
									<th className="py-2">Due Date</th>
									<th className="py-2">Total</th>
									<th className="py-2">Outstanding</th>
								</tr>
							</thead>
							<tbody>
								{fees.map((f) => (
									<tr key={f.name} className="border-t border-black/10 dark:border-white/10">
										{role !== "student" && <td className="py-2">{f.student_name}</td>}
										<td className="py-2">{f.due_date}</td>
										<td className="py-2">{f.grand_total}</td>
										<td className="py-2">{f.outstanding_amount}</td>
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
