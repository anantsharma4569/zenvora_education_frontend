"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

interface NavItem {
	href: string;
	label: string;
	roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
	{ href: "/dashboard", label: "Dashboard", roles: ["admin", "teacher", "accounts", "student"] },
	{ href: "/students", label: "Students", roles: ["admin", "teacher", "accounts"] },
	{ href: "/employees", label: "Employees", roles: ["admin"] },
	{ href: "/courses", label: "Courses", roles: ["admin", "teacher", "student"] },
	{ href: "/attendance", label: "Attendance", roles: ["admin", "teacher", "student"] },
	{ href: "/exams", label: "Exams & Results", roles: ["admin", "teacher", "student"] },
	{ href: "/fees", label: "Fees / Billing", roles: ["admin", "accounts", "student"] },
	{ href: "/settings", label: "Settings", roles: ["admin"] },
];

const ROLE_LABEL: Record<Role, string> = {
	admin: "Admin",
	teacher: "Teacher",
	accounts: "Accounts",
	student: "Student",
};

export function Sidebar() {
	const { role, setRole } = useRole();
	const pathname = usePathname();
	const router = useRouter();
	const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

	const handleLogout = async () => {
		await api.logout().catch(() => undefined);
		router.replace("/login");
	};

	return (
		<aside className="flex h-full w-60 shrink-0 flex-col justify-between border-r border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20">
			<div>
				<div className="mb-6 px-2">
					<div className="text-lg font-semibold">Zenvora Education</div>
					<div className="text-xs text-black/50 dark:text-white/50">{ROLE_LABEL[role]} view</div>
				</div>
				<nav className="flex flex-col gap-1">
					{items.map((item) => {
						const active = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`rounded-md px-3 py-2 text-sm transition-colors ${
									active
										? "bg-black text-white dark:bg-white dark:text-black"
										: "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
								}`}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>
			</div>

			{/* Demo-only role switcher: real role comes from the Frappe session server-side. */}
			<div className="border-t border-black/10 pt-3 dark:border-white/10">
				<label className="mb-1 block px-2 text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
					Preview as (demo)
				</label>
				<select
					className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/10"
					value={role}
					onChange={(e) => setRole(e.target.value as Role)}
				>
					{Object.entries(ROLE_LABEL).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
				<button
					onClick={handleLogout}
					className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 text-left text-sm text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
				>
					Log out
				</button>
			</div>
		</aside>
	);
}
