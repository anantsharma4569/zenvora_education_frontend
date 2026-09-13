"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
	const router = useRouter();
	const [usr, setUsr] = useState("");
	const [pwd, setPwd] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		api.getSession().then((session) => {
			if (session.authenticated) router.replace("/dashboard");
		});
	}, [router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await api.login(usr, pwd);
			router.replace("/dashboard");
		} catch (err) {
			setError((err as Error).message || "Invalid username or password");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-black/[.02] dark:bg-white/[.02]">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-black"
			>
				<h1 className="mb-1 text-xl font-semibold">Zenvora Education</h1>
				<p className="mb-6 text-sm text-black/60 dark:text-white/60">Sign in to continue</p>

				<div className="flex flex-col gap-3">
					<input
						required
						autoFocus
						placeholder="Email or username"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={usr}
						onChange={(e) => setUsr(e.target.value)}
					/>
					<input
						required
						type="password"
						placeholder="Password"
						className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
						value={pwd}
						onChange={(e) => setPwd(e.target.value)}
					/>

					{error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

					<button
						type="submit"
						disabled={submitting}
						className="mt-2 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
					>
						{submitting ? "Signing in..." : "Sign in"}
					</button>
				</div>
			</form>
		</div>
	);
}
