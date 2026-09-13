import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SETTINGS_GROUPS } from "@/components/settings/nav";

export default function SettingsPage() {
	return (
		<div>
			<PageHeader title="Settings" subtitle="Configure your school's setup, academics, and fees" />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{SETTINGS_GROUPS.map((group) => (
					<div key={group.label} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
						<div className="mb-2 text-sm font-semibold">{group.label}</div>
						<ul className="flex flex-col gap-1">
							{group.items.map((item) => (
								<li key={item.slug}>
									<Link
										href={`/settings/${item.slug}`}
										className="text-sm text-black/70 hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
