"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { LoadingState, ErrorState } from "@/components/DataState";
import { Card, CardHead, Label, StatCard, Bar, Columns, AttentionItem } from "@/components/ui";
import type { DashboardData } from "@/lib/types";

/**
 * Principal / admin dashboard.
 *
 * The five raw counts from get_dashboard are kept, but framed: the question a
 * principal opens this page with is "what do I need to do today", not "how many
 * students exist". Everything below the stat strip is either an exception to
 * act on or the trend that puts today's number in context.
 *
 * Group-level attendance, fee collection, result distribution and staff cover
 * are not in DashboardData yet — see the API TODOs. Until they land, this page
 * renders the counts it does get and leaves the richer panels on fixtures.
 */

const NUM = new Intl.NumberFormat("en-IN");
const LINK = "cursor-pointer text-[12.5px] text-black/50 hover:text-black";

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
			.then((res) => !cancelled && setData(res))
			.catch((err) => !cancelled && setError(err.message));
		return () => {
			cancelled = true;
		};
	}, [role]);

	if (error) return <ErrorState message={`Could not load dashboard: ${error}`} />;
	if (!data) return <LoadingState />;

	const present = data.today_present ?? 0;
	const absent = data.today_absent ?? 0;
	const marked = present + absent;
	const rate = marked ? (present / marked) * 100 : 0;

	// TODO(api): expose attendance_by_group from get_dashboard.
	const groups = [
		{ name: "Grade 6 — A", pct: 96 },
		{ name: "Grade 7 — B", pct: 93 },
		{ name: "Grade 8 — A", pct: 90 },
		{ name: "Grade 9 — A", pct: 88 },
		{ name: "Grade 9 — B", pct: 82 },
		{ name: "Grade 10 — A", pct: 79 },
		{ name: "Grade 11 — Sci", pct: 94 },
	];
	// TODO(api): expose attendance_trend (last 14 school days).
	const trend = [88, 90, 91, 87, 92, 93, 89, 86, 90, 92, 94, 90, 89.8, 91.2];
	// TODO(api): expose grade_distribution for the current assessment.
	const grades = [
		{ label: "A+", value: 118 },
		{ label: "A", value: 244 },
		{ label: "B", value: 301 },
		{ label: "C", value: 216 },
		{ label: "D", value: 102, tone: "warn" as const },
		{ label: "F", value: 62, tone: "danger" as const },
	];

	const toneFor = (pct: number) => (pct < 80 ? "danger" : pct < 85 ? "warn" : undefined);

	return (
		<div className="flex flex-col gap-[18px]">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-[25px] font-semibold tracking-[-0.02em]">
						{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
					</h1>
					<p className="mt-1.5 text-[13.5px] text-black/55">Signed in as {data.role}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href="/attendance"
						className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] font-medium hover:bg-black/[0.03]"
					>
						Take attendance
					</Link>
					<button className="rounded-lg bg-black px-3.5 py-2.5 text-[13px] font-medium text-white hover:bg-black/90">
						Publish notice
					</button>
				</div>
			</header>

			<section className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-[13px]">
				<div className="flex min-h-[116px] flex-col justify-between rounded-xl border border-line bg-surface p-[16px_18px]">
					<Label>Attendance today</Label>
					<div className="mt-2.5 text-[32px] font-semibold leading-none tracking-[-0.03em]">
						{rate.toFixed(1)}
						<span className="text-[18px] font-medium">%</span>
					</div>
					<div className="mt-2.5">
						<Bar pct={rate} />
					</div>
				</div>
				<StatCard label="Students" value={NUM.format(data.student_count ?? 0)} />
				<StatCard label="Present" value={NUM.format(present)} note={`of ${NUM.format(marked)} marked`} />
				<StatCard label="Absent" value={NUM.format(absent)} tone="warn" />
				<StatCard label="Instructors" value={NUM.format(data.instructor_count ?? 0)} note={`${NUM.format(data.employee_count ?? 0)} employees`} />
			</section>

			<section className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
				<Card>
					<CardHead
						title="Attendance by student group"
						action={<Link href="/attendance" className={LINK}>All groups →</Link>}
					/>
					<p className="mb-[18px] mt-1 text-[12.5px] text-black/50">
						Marked for today. Groups under 85% are flagged.
					</p>
					<div className="flex flex-col gap-3">
						{groups.map((g) => (
							<div key={g.name} className="grid grid-cols-[minmax(70px,120px)_minmax(48px,1fr)_auto] items-center gap-2.5">
								<span className="truncate text-[13px] font-medium">{g.name}</span>
								<Bar pct={g.pct} tone={toneFor(g.pct)} />
								<span className="text-right text-[12.5px] font-semibold tabular-nums">{g.pct}%</span>
							</div>
						))}
					</div>
					<div className="mt-[22px] border-t border-line-soft pt-[18px]">
						<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
							<h3 className="text-[12.5px] font-semibold text-black/70">Last 14 school days</h3>
							<span className="text-[11.5px] text-black/45">school-wide rate</span>
						</div>
						<Columns
							highlightLast
							max={100}
							height={72}
							data={trend.map((v, i) => ({ label: i === trend.length - 1 ? "T" : String(i + 1), value: ((v - 80) / 20) * 100 }))}
						/>
					</div>
				</Card>

				<div className="flex flex-col gap-4">
					<Card>
						<CardHead title="Needs your attention" />
						<p className="mb-3.5 mt-1 text-[12.5px] text-black/50">Ordered by urgency.</p>
						<div className="flex flex-col gap-0.5">
							<AttentionItem
								tone="danger"
								href="/attendance"
								title={`${absent} absences today have no reason recorded`}
								meta="Attendance · needs follow-up before 4:00 PM"
							/>
							<AttentionItem
								tone="danger"
								href="/fees"
								title="148 students past fee due date"
								meta="₹22.0 L overdue · Term 2 instalment"
							/>
							<AttentionItem
								tone="warn"
								href="/students"
								title="23 students below 75% attendance this term"
								meta="At exam-eligibility risk · Grades 9–11"
							/>
							<AttentionItem
								tone="warn"
								href="/exams"
								title="Mid-term results pending for 4 student groups"
								meta="Due 19 September · 3 instructors pending"
							/>
							<AttentionItem
								href="/settings/fee-structures"
								title="Term 3 fee structures not yet created"
								meta="Fees cannot be raised until they exist"
							/>
						</div>
					</Card>

					<Card>
						<CardHead title="Fee collection" action={<span className="text-[11.5px] text-black/45">Term 2</span>} />
						<div className="mt-3.5 flex flex-wrap items-baseline gap-2">
							<span className="text-[27px] font-semibold tracking-[-0.03em]">₹2.84 Cr</span>
							<span className="text-[12.5px] text-black/50">of ₹3.60 Cr billed</span>
						</div>
						<div className="mt-3 flex h-2 overflow-hidden rounded-full bg-black/[0.07]">
							<div className="bg-accent" style={{ width: "78.9%" }} />
							<div className="bg-warn" style={{ width: "6.1%" }} />
						</div>
						<div className="mt-3.5 flex flex-wrap gap-5">
							<div>
								<Label>Collected</Label>
								<div className="mt-1 text-sm font-semibold">78.9%</div>
							</div>
							<div>
								<Label>Overdue</Label>
								<div className="mt-1 text-sm font-semibold text-warn">₹22.0 L</div>
							</div>
							<div>
								<Label>Students</Label>
								<div className="mt-1 text-sm font-semibold">148 unpaid</div>
							</div>
						</div>
					</Card>
				</div>
			</section>

			<section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
				<Card>
					<CardHead title="Mid-term results" action={<Link href="/exams" className={LINK}>Open exams →</Link>} />
					<p className="mb-[18px] mt-1.5 text-[12.5px] text-black/50">
						Published for 8 of 12 groups · 1,043 result records
					</p>
					<div className="flex items-end gap-2" style={{ height: 88 }}>
						{grades.map((g) => (
							<div key={g.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[7px]">
								<span className="text-[11.5px] font-semibold tabular-nums">{g.value}</span>
								<div
									className={`w-full rounded-t ${g.tone === "danger" ? "bg-danger" : g.tone === "warn" ? "bg-warn" : "bg-accent"}`}
									style={{ height: `${(g.value / 301) * 100}%` }}
								/>
								<span className="text-[11.5px] font-medium text-black/50">{g.label}</span>
							</div>
						))}
					</div>
					<div className="mt-[18px] flex flex-wrap gap-[22px] border-t border-line-soft pt-4">
						<div><Label>Pass rate</Label><div className="mt-1 text-base font-semibold">94.1%</div></div>
						<div><Label>Median score</Label><div className="mt-1 text-base font-semibold">71 / 100</div></div>
						<div><Label>Below 40</Label><div className="mt-1 text-base font-semibold text-danger">62</div></div>
					</div>
				</Card>

				<Card>
					<CardHead title="Staff today" action={<Link href="/employees" className={LINK}>Employees →</Link>} />
					<p className="mb-4 mt-1.5 text-[12.5px] text-black/50">
						{NUM.format(data.employee_count ?? 0)} employees · {NUM.format(data.instructor_count ?? 0)} instructors
					</p>
					<div className="flex flex-col">
						{[
							{ label: "Present", value: 87, dot: "bg-pos" },
							{ label: "On approved leave", value: 6, dot: "bg-black/30" },
							{ label: "Absent, unapproved", value: 3, dot: "bg-danger" },
							{ label: "Not yet marked", value: 0, dot: "bg-black/30" },
						].map((s) => (
							<div key={s.label} className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
								<span className="flex items-center gap-2.5">
									<span className={`h-[7px] w-[7px] shrink-0 rounded-full ${s.dot}`} />
									<span className="text-[13px]">{s.label}</span>
								</span>
								<span className="text-[13px] font-semibold tabular-nums">{s.value}</span>
							</div>
						))}
					</div>
					<div className="mt-4 rounded-[9px] bg-black/[0.035] p-[12px_14px]">
						<p className="text-[12.5px] leading-relaxed text-black/70 text-pretty">
							4 periods have no substitute assigned for absent instructors. Grade 9–B Mathematics is the first at 10:40.
						</p>
						<button className="mt-2 text-[12.5px] font-medium text-accent">Assign substitutes →</button>
					</div>
				</Card>
			</section>
		</div>
	);
}
