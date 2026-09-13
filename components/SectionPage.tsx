"use client";

import { type ReactNode } from "react";
import { ErrorState } from "@/components/DataState";

export function SectionPage({
	title,
	count,
	description,
	addLabel,
	formOpen,
	onToggleForm,
	form,
	formError,
	table,
}: {
	title: string;
	count?: number;
	description?: string;
	addLabel: string;
	formOpen: boolean;
	onToggleForm: () => void;
	form: ReactNode;
	formError?: string | null;
	table: ReactNode;
}) {
	return (
		<div>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 text-xl font-semibold">
						{title}
						{typeof count === "number" && (
							<span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-normal text-black/60 dark:bg-white/10 dark:text-white/60">
								{count}
							</span>
						)}
					</h1>
					{description && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{description}</p>}
				</div>
				<button
					onClick={onToggleForm}
					className="shrink-0 rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
				>
					{formOpen ? "Cancel" : addLabel}
				</button>
			</div>

			{formOpen && (
				<div className="mb-6 rounded-lg border border-black/10 p-4 dark:border-white/10">
					{form}
					{formError && (
						<div className="mt-3">
							<ErrorState message={formError} />
						</div>
					)}
				</div>
			)}

			{table}
		</div>
	);
}
