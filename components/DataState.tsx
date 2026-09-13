export function LoadingState({ label = "Loading..." }: { label?: string }) {
	return <div className="rounded-lg border border-dashed border-black/10 p-6 text-sm text-black/50 dark:border-white/10 dark:text-white/50">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
	return (
		<div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
			{message}
		</div>
	);
}

export function EmptyState({ label }: { label: string }) {
	return <div className="rounded-lg border border-dashed border-black/10 p-6 text-sm text-black/50 dark:border-white/10 dark:text-white/50">{label}</div>;
}
