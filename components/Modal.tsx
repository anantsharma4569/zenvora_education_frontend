"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
	title,
	onClose,
	children,
	footer,
	size = "lg",
	busy = false,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	size?: "md" | "lg";
	busy?: boolean;
}) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !busy) onClose();
		};
		document.addEventListener("keydown", onKey);
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = previous;
		};
	}, [onClose, busy]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget && !busy) onClose();
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className={`my-6 w-full rounded-2xl bg-white shadow-2xl ${size === "lg" ? "max-w-2xl" : "max-w-md"}`}
			>
				<div className="flex items-center justify-between border-b border-line px-6 py-4">
					<h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
					<button
						type="button"
						aria-label="Close"
						onClick={onClose}
						disabled={busy}
						className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-black/50 hover:bg-mint hover:text-accent disabled:opacity-40"
					>
						×
					</button>
				</div>
				<div className="px-6 py-5">{children}</div>
				{footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
			</div>
		</div>
	);
}
