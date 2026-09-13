export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<div className="mb-6">
			<h1 className="text-2xl font-semibold">{title}</h1>
			{subtitle ? <p className="mt-1 text-sm text-black/60 dark:text-white/60">{subtitle}</p> : null}
		</div>
	);
}
