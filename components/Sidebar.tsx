"use client";

import { useEffect, useState } from "react";
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

/** Below this width the sidebar becomes a sticky top bar with a scrolling nav. */
const BREAKPOINT = 760;

export function Sidebar() {
	const { role, setRole } = useRole();
	const pathname = usePathname();
	const router = useRouter();
	const [narrow, setNarrow] = useState(false);

	useEffect(() => {
		const onResize = () => setNarrow(window.innerWidth < BREAKPOINT);
		onResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

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
				className={`whitespace-nowrap rounded-[7px] px-2.5 py-2 text-[13.5px] transition-colors ${
					active ? "bg-black font-medium text-white" : "text-black/70 hover:bg-black/5"
				}`}
			>
				{item.label}
			</Link>
		);
	};

	const brand = (
		<div className="flex items-center gap-2.5 px-2">
			<span className="h-[22px] w-[22px] shrink-0 rounded-md bg-accent" />
			<span>
				<span className="block whitespace-nowrap text-sm font-semibold tracking-[-0.01em]">
					Zenvora Education
				</span>
				<span className="block text-[11px] text-black/45">{ROLE_LABEL[role]} view</span>
			</span>
		</div>
	);

	if (narrow) {
		return (
			<aside className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-surface px-4 py-3.5">
				{brand}
				<nav className="flex gap-1 overflow-x-auto pb-0.5">{items.map(link)}</nav>
			</aside>
		);
	}

	return (
		<aside className="flex h-full w-[236px] shrink-0 flex-col justify-between border-r border-line bg-surface p-[20px_14px]">
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
					className="mx-1 mt-2.5 w-[calc(100%-8px)] rounded-[7px] border border-black/[0.12] px-2.5 py-2 text-[13px] text-black/70 hover:bg-black/[0.04]"
				>
					Log out
				</button>
			</div>
		</aside>
	);
}
