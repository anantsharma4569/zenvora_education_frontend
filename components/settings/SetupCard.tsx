import type { ReactNode } from "react";
import { ErrorState } from "@/components/DataState";

export function SetupCard({
	title,
	form,
	formError,
	list,
}: {
	title: string;
	form: ReactNode;
	formError?: string | null;
	list: ReactNode;
}) {
	return (
		<div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
			<h2 className="mb-3 text-sm font-medium">{title}</h2>
			{form}
			{formError && (
				<div className="mt-3">
					<ErrorState message={formError} />
				</div>
			)}
			<div className="mt-4 border-t border-black/10 pt-3 dark:border-white/10">{list}</div>
		</div>
	);
}

export function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
	return (
		<button
			type="submit"
			disabled={submitting}
			className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
		>
			{submitting ? "Saving..." : label}
		</button>
	);
}

export const inputClass =
	"rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10";
