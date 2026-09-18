"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeeCategoryRow } from "@/lib/types";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";

const empty = (): Values => ({ category_name: "" });

const fields: FieldDef[] = [
	{ key: "category_name", label: "Fee Category Name", type: "text", required: true, placeholder: "e.g. Tuition Fee", full: true },
];

export function FeeCategorySection() {
	const [rows, setRows] = useState<FeeCategoryRow[]>([]);
	const load = () => api.listFeeCategories().then(setRows).catch(() => undefined);
	useEffect(() => {
		load();
	}, []);

	return (
		<ResourcePage<FeeCategoryRow>
			title="Fee Categories"
			singular="Fee Category"
			description="Types of fee, e.g. Tuition, Transport, Exam"
			rows={rows}
			rowKey={(r) => r.name}
			rowLabel={(r) => r.category_name}
			searchPlaceholder="Search fee categories..."
			searchValue={(r) => r.category_name}
			emptyLabel="No fee categories yet."
			columns={[{ key: "category_name", label: "Fee Category", sortable: true, value: (r) => r.category_name }]}
			fields={fields}
			emptyValues={empty}
			reload={load}
			onCreate={(v) => api.createFeeCategory({ category_name: v.category_name as string })}
			loadForEdit={async (r) => ({ category_name: r.category_name })}
			onUpdate={(r, v) => api.updateRecord("fee_category", r.name, { category_name: v.category_name })}
			onDelete={(list) => api.deleteRecords("fee_category", list.map((r) => r.name))}
		/>
	);
}
