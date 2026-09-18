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
	{ href: "/staff", label: "Staff", roles: ["admin"] },
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

	const link = (item: NavItem) => {
		const active = pathname === item.href || pathname.startsWith(item.href + "/");
		return (
			<Link
				key={item.href}
				href={item.href}
				className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] transition-colors ${
					active ? "bg-accent font-semibold text-white" : "text-black/70 hover:bg-mint hover:text-accent"
				}`}
			>
				{item.label}
			</Link>
		);
	};

	const brand = (
		<div className="flex items-center gap-2.5 px-2">
			<span className="h-[26px] w-[26px] shrink-0 rounded-full bg-accent" />
			<span>
				<span className="block whitespace-nowrap text-sm font-semibold tracking-[-0.01em]">
					Zenvora Education
				</span>
				<span className="block text-[11px] text-black/45">{ROLE_LABEL[role]} view</span>
			</span>
		</div>
	);

	return (
		<>
			{/* Narrow / mobile: sticky top bar with a horizontally scrolling nav. */}
			<aside className="sticky top-0 z-10 flex w-full min-w-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3.5 md:hidden">
				{brand}
				<nav className="flex min-w-0 gap-1 overflow-x-auto pb-0.5">{items.map(link)}</nav>
			</aside>

			{/* Wide / desktop: fixed-width left sidebar. */}
			<aside className="hidden h-full w-[236px] shrink-0 flex-col justify-between border-r border-line bg-surface p-[20px_14px] md:flex">
				<div>
					{brand}
					<nav className="mt-[22px] flex flex-col gap-0.5">{items.map(link)}</nav>
				</div>

				{/* Demo-only role switcher: real role comes from the Frappe session server-side. */}
				<div className="border-t border-line pt-3.5">
					<label className="block px-2.5 pb-1.5 text-[10px] uppercase tracking-[0.08em] text-black/40">
						Preview as (demo)
					</label>
					<select
						className="mx-1 w-[calc(100%-8px)] rounded-[7px] border border-black/[0.12] bg-transparent px-2.5 py-1.5 text-[13px]"
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
						className="mx-1 mt-2.5 w-[calc(100%-8px)] rounded-full border border-black/[0.15] px-2.5 py-2 text-[13px] font-medium text-black/70 hover:bg-mint"
					>
						Log out
					</button>
				</div>
			</aside>
		</>
	);
}
