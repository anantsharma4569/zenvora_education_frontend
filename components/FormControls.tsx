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
