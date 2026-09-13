"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/** Redirects to /login when there is no authenticated Frappe session. */
export function AuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		let cancelled = false;

		api
			.getSession()
			.then((session) => {
				if (cancelled) return;
				if (!session.authenticated) {
					router.replace("/login");
				} else {
					setChecked(true);
				}
			})
			.catch(() => {
				if (!cancelled) router.replace("/login");
			});

		return () => {
			cancelled = true;
		};
	}, [router]);

	if (!checked) return null;

	return <>{children}</>;
}
