"use client";

import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/DataState";

export default function ExamsPage() {
	const { role } = useRole();

	return (
		<div>
			<PageHeader
				title="Exams & Results"
				subtitle={role === "student" ? "Your results" : "Assessment plans and results"}
			/>
			<EmptyState label="Exam/Result API (zenvora_education.api.exam) is not wired up yet - built on top of the Education app's Assessment Plan/Result doctypes." />
		</div>
	);
}
