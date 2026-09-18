import type { ReactNode } from "react";

/** A labelled form field: visible name, red * when mandatory, "(optional)" otherwise, inline error. */
export function Field({
	id,
	label,
	required,
	error,
	help,
	full,
	children,
}: {
	id: string;
	label: string;
	required?: boolean;
	error?: string;
	help?: string;
	full?: boolean;
	children: ReactNode;
}) {
	return (
		<div className={full ? "sm:col-span-2" : ""}>
			<label htmlFor={id} className="mb-1 block text-[12.5px] font-medium text-black/70">
				{label}
				{required ? (
					<span className="ml-0.5 text-danger" title="Required">
						*
					</span>
				) : (
					<span className="ml-1 font-normal text-black/40">(optional)</span>
				)}
			</label>
			{children}
			{help && !error && <p className="mt-1 text-[11.5px] text-black/45">{help}</p>}
			{error && (
				<p role="alert" className="mt-1 text-[12px] font-medium text-danger">
					{error}
				</p>
			)}
		</div>
	);
}
