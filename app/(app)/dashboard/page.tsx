"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { LoadingState, ErrorState } from "@/components/DataState";
import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
	const { role } = useRole();
	const [data, setData] = useState<DashboardData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setData(null);
		setError(null);

		api
			.getDashboard()
			.then((res) => {
				if (!cancelled) setData(res);
			})
			.catch((err) => {
				if (!cancelled) setError(err.message);
			});

		return () => {
			cancelled = true;
		};
	}, [role]);

	if (error) {
		return (
			<div>
				<PageHeader title="Dashboard" />
				<ErrorState message={`Could not load dashboard: ${error}`} />
			</div>
		);
	}

	if (!data) {
		return (
			<div>
				<PageHeader title="Dashboard" />
				<LoadingState />
			</div>
		);
	}

	return (
		<div>
			<PageHeader title="Dashboard" subtitle={`Signed in as ${data.role}`} />

			{data.role === "admin" && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<StatCard label="Students" value={data.student_count ?? 0} />
					<StatCard label="Employees" value={data.employee_count ?? 0} />
					<StatCard label="Instructors" value={data.instructor_count ?? 0} />
					<StatCard label="Present Today" value={data.today_present ?? 0} />
					<StatCard label="Absent Today" value={data.today_absent ?? 0} />
				</div>
			)}

			{data.role === "teacher" && (
				<div>
					<h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">My Student Groups</h2>
					{data.student_groups && data.student_groups.length > 0 ? (
						<ul className="flex flex-col gap-2">
							{data.student_groups.map((group) => (
								<li key={group} className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
									{group}
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-black/50 dark:text-white/50">No Student Groups assigned yet.</p>
					)}
				</div>
			)}

			{data.role === "accounts" && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<StatCard label="Students" value={data.student_count ?? 0} />
				</div>
			)}

			{data.role === "student" && (
				<div>
					<h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">My Attendance Summary</h2>
					{data.attendance_summary && data.attendance_summary.length > 0 ? (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{data.attendance_summary.map((row) => (
								<StatCard key={row.status} label={row.status} value={row.count} />
							))}
						</div>
					) : (
						<p className="text-sm text-black/50 dark:text-white/50">No attendance recorded yet.</p>
					)}
				</div>
			)}
		</div>
	);
}
