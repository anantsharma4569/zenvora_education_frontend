"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_GROUPS } from "./nav";

export function SettingsNav() {
	const pathname = usePathname();

	return (
		<nav className="w-56 shrink-0">
			<Link
				href="/settings"
				className={`mb-3 block text-sm font-medium ${
					pathname === "/settings" ? "text-black dark:text-white" : "text-black/60 dark:text-white/60"
				}`}
			>
				← All Settings
			</Link>
			<div className="flex flex-col gap-4">
				{SETTINGS_GROUPS.map((group) => (
					<div key={group.label}>
						<div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
							{group.label}
						</div>
						<div className="flex flex-col gap-0.5">
							{group.items.map((item) => {
								const href = `/settings/${item.slug}`;
								const active = pathname === href;
								return (
									<Link
										key={item.slug}
										href={href}
										className={`rounded-md px-2 py-1.5 text-sm ${
											active
												? "bg-black text-white dark:bg-white dark:text-black"
												: "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
										}`}
									>
										{item.label}
									</Link>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</nav>
	);
}
