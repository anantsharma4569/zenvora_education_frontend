"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

interface RoleContextValue {
	role: Role;
	setRole: (role: Role) => void;
	/** false once we know whether the role came from a real session or a manual override */
	loading: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = "zenvora.role.override";

/**
 * The backend (get_dashboard) is the source of truth for role - it derives
 * role from frappe.session.user server-side, the same way every other API
 * endpoint scopes its data. This only falls back to a manual override
 * (stored locally) when the backend can't be reached, e.g. during frontend-only
 * UI work with no Frappe session available.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
	const [role, setRoleState] = useState<Role>("admin");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		api
			.getDashboard()
			.then((dashboard) => {
				if (!cancelled) setRoleState(dashboard.role);
			})
			.catch(() => {
				try {
					const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
					if (!cancelled && stored) setRoleState(stored);
				} catch {
					// localStorage unavailable, keep default
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const setRole = (next: Role) => {
		setRoleState(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore
		}
	};

	return <RoleContext.Provider value={{ role, setRole, loading }}>{children}</RoleContext.Provider>;
}

export function useRole() {
	const ctx = useContext(RoleContext);
	if (!ctx) throw new Error("useRole must be used within a RoleProvider");
	return ctx;
}
