"use client";

import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/DataState";

export default function StudentsPage() {
	const { role } = useRole();

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
			<EmptyState label="Student list API (zenvora_education.api.student) is not wired up yet - next backend module to build." />
		</div>
	);
}
