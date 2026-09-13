"use client";

import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/DataState";

export default function FeesPage() {
	const { role } = useRole();

	return (
		<div>
			<PageHeader
				title="Fees / Billing"
				subtitle={role === "student" ? "Your fee balance" : "Invoices, payments and dues"}
			/>
			<EmptyState label="Fees API (zenvora_education.api.fees) is not wired up yet - built on top of ERPNext accounting + Education's Fee Structure/Fees doctypes." />
		</div>
	);
}
