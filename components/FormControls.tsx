export const btnPrimary =
	"inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-50";
export const btnGhost =
	"inline-flex items-center justify-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black/75 transition-colors hover:bg-mint disabled:opacity-50";
export const btnDanger =
	"inline-flex items-center justify-center gap-1.5 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

export function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
	return (
		<button type="submit" disabled={submitting} className={btnPrimary}>
			{submitting ? "Saving..." : label}
		</button>
	);
}

export const inputClass =
	"rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-black/35 focus:border-accent focus:ring-2 focus:ring-accent/15";
