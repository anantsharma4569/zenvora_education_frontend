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
 * The question a principal opens this page with is "what do I need to do
 * today", not "how many students exist" - every panel below the stat strip
 * is either an exception to act on or a trend that puts today's number in
 * context. All of it comes from get_dashboard; nothing here is a fixture.
 */

const NUM = new Intl.NumberFormat("en-IN");
const LINK = "cursor-pointer text-[12.5px] text-black/50 hover:text-black";

function formatINR(amount: number) {
	if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
	if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
	return `₹${NUM.format(Math.round(amount))}`;
}

function toneForGrade(label: string) {
	return label === "F" ? ("danger" as const) : label === "D" ? ("warn" as const) : undefined;
}

interface Attention {
	tone: "danger" | "warn" | "neutral";
	title: string;
	meta: string;
	href: string;
}

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

	const groups = data.attendance_by_group ?? [];
	const trend = data.attendance_trend ?? [];
	const grades = data.grade_distribution ?? [];
	const fees = data.fees_summary;
	const exam = data.exam_summary;
	const staff = data.staff_today;
	const lowAttendanceCount = data.low_attendance_count ?? 0;

	const trendFloor = trend.length ? Math.max(0, Math.floor(Math.min(...trend.map((t) => t.rate))) - 5) : 0;
	const trendColumns = trend.map((t, i) => ({
		label: i === trend.length - 1 ? "T" : String(i + 1),
		value: trendFloor < 100 ? ((t.rate - trendFloor) / (100 - trendFloor)) * 100 : 100,
	}));

	const collectedPct = fees && fees.billed ? (fees.collected / fees.billed) * 100 : 0;
	const outstandingPct = fees && fees.billed ? (fees.outstanding / fees.billed) * 100 : 0;

	const pendingGroups = exam ? Math.max(0, exam.total_groups - exam.published_groups) : 0;
	const maxGradeValue = Math.max(1, ...grades.map((g) => g.value));

	const attentionItems: Attention[] = [];
	if (absent > 0) {
		attentionItems.push({
			tone: "danger",
			title: `${absent} student${absent === 1 ? "" : "s"} absent today`,
			meta: "Attendance · mark reasons before end of day",
			href: "/attendance",
		});
	}
	if (fees && fees.unpaid_students > 0) {
		attentionItems.push({
			tone: "danger",
			title: `${fees.unpaid_students} student${fees.unpaid_students === 1 ? "" : "s"} past fee due date`,
			meta: `${formatINR(fees.overdue)} overdue`,
			href: "/fees",
		});
	}
	if (lowAttendanceCount > 0) {
		attentionItems.push({
			tone: "warn",
			title: `${lowAttendanceCount} student${lowAttendanceCount === 1 ? "" : "s"} below 75% attendance`,
			meta: "At exam-eligibility risk",
			href: "/students",
		});
	}
	if (pendingGroups > 0) {
		attentionItems.push({
			tone: "warn",
			title: `Results pending for ${pendingGroups} student group${pendingGroups === 1 ? "" : "s"}`,
			meta: `${exam!.published_groups} of ${exam!.total_groups} groups published`,
			href: "/exams",
		});
	}
	if (staff && staff.on_leave > 0) {
		attentionItems.push({
			tone: "neutral",
			title: `${staff.on_leave} staff member${staff.on_leave === 1 ? "" : "s"} on approved leave today`,
			meta: "Staff",
			href: "/staff",
		});
	}

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
						className="rounded-full border border-black/15 bg-surface px-4 py-2.5 text-[13px] font-medium hover:bg-mint"
					>
						Take attendance
					</Link>
					<button className="rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-accent-strong">
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
					{groups.length === 0 ? (
						<p className="text-[13px] text-black/45">No attendance marked for today yet.</p>
					) : (
						<div className="flex flex-col gap-3">
							{groups.map((g) => (
								<div key={g.name} className="grid grid-cols-[minmax(70px,120px)_minmax(48px,1fr)_auto] items-center gap-2.5">
									<span className="truncate text-[13px] font-medium">{g.name}</span>
									<Bar pct={g.pct} tone={g.pct < 80 ? "danger" : g.pct < 85 ? "warn" : undefined} />
									<span className="text-right text-[12.5px] font-semibold tabular-nums">{g.pct}%</span>
								</div>
							))}
						</div>
					)}
					<div className="mt-[22px] border-t border-line-soft pt-[18px]">
						<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
							<h3 className="text-[12.5px] font-semibold text-black/70">Last 14 school days</h3>
							<span className="text-[11.5px] text-black/45">school-wide rate</span>
						</div>
						{trendColumns.length === 0 ? (
							<p className="text-[13px] text-black/45">No attendance history yet.</p>
						) : (
							<Columns highlightLast max={100} height={72} data={trendColumns} />
						)}
					</div>
				</Card>

				<div className="flex flex-col gap-4">
					<Card>
						<CardHead title="Needs your attention" />
						<p className="mb-3.5 mt-1 text-[12.5px] text-black/50">Ordered by urgency.</p>
						{attentionItems.length === 0 ? (
							<p className="text-[13px] text-black/45">Nothing needs attention right now.</p>
						) : (
							<div className="flex flex-col gap-0.5">
								{attentionItems.map((item) => (
									<AttentionItem
										key={item.title}
										tone={item.tone === "neutral" ? undefined : item.tone}
										href={item.href}
										title={item.title}
										meta={item.meta}
									/>
								))}
							</div>
						)}
					</Card>

					<Card>
						<CardHead title="Fee collection" />
						{!fees || fees.billed === 0 ? (
							<p className="mt-3.5 text-[13px] text-black/45">No fee invoices raised yet.</p>
						) : (
							<>
								<div className="mt-3.5 flex flex-wrap items-baseline gap-2">
									<span className="text-[27px] font-semibold tracking-[-0.03em]">{formatINR(fees.collected)}</span>
									<span className="text-[12.5px] text-black/50">of {formatINR(fees.billed)} billed</span>
								</div>
								<div className="mt-3 flex h-2 overflow-hidden rounded-full bg-black/[0.07]">
									<div className="bg-accent" style={{ width: `${collectedPct}%` }} />
									<div className="bg-warn" style={{ width: `${outstandingPct}%` }} />
								</div>
								<div className="mt-3.5 flex flex-wrap gap-5">
									<div>
										<Label>Collected</Label>
										<div className="mt-1 text-sm font-semibold">{collectedPct.toFixed(1)}%</div>
									</div>
									<div>
										<Label>Overdue</Label>
										<div className="mt-1 text-sm font-semibold text-warn">{formatINR(fees.overdue)}</div>
									</div>
									<div>
										<Label>Students</Label>
										<div className="mt-1 text-sm font-semibold">{fees.unpaid_students} unpaid</div>
									</div>
								</div>
							</>
						)}
					</Card>
				</div>
			</section>

			<section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
				<Card>
					<CardHead title="Mid-term results" action={<Link href="/exams" className={LINK}>Open exams →</Link>} />
					{!exam || exam.total_results === 0 ? (
						<p className="mt-1.5 text-[13px] text-black/45">No results published yet.</p>
					) : (
						<>
							<p className="mb-[18px] mt-1.5 text-[12.5px] text-black/50">
								Published for {exam.published_groups} of {exam.total_groups} groups · {NUM.format(exam.total_results)} result records
							</p>
							<div className="flex items-end gap-2" style={{ height: 88 }}>
								{grades.map((g) => (
									<div key={g.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[7px]">
										<span className="text-[11.5px] font-semibold tabular-nums">{g.value}</span>
										<div
											className={`w-full rounded-t ${toneForGrade(g.label) === "danger" ? "bg-danger" : toneForGrade(g.label) === "warn" ? "bg-warn" : "bg-accent"}`}
											style={{ height: `${(g.value / maxGradeValue) * 100}%` }}
										/>
										<span className="text-[11.5px] font-medium text-black/50">{g.label}</span>
									</div>
								))}
							</div>
							<div className="mt-[18px] flex flex-wrap gap-[22px] border-t border-line-soft pt-4">
								<div><Label>Pass rate</Label><div className="mt-1 text-base font-semibold">{exam.pass_rate}%</div></div>
								<div><Label>Median score</Label><div className="mt-1 text-base font-semibold">{exam.median_score} / 100</div></div>
								<div><Label>Below 40</Label><div className="mt-1 text-base font-semibold text-danger">{exam.below_40}</div></div>
							</div>
						</>
					)}
				</Card>

				<Card>
					<CardHead title="Staff today" action={<Link href="/staff" className={LINK}>Staff →</Link>} />
					<p className="mb-4 mt-1.5 text-[12.5px] text-black/50">
						{NUM.format(data.employee_count ?? 0)} employees · {NUM.format(data.instructor_count ?? 0)} instructors
					</p>
					<div className="flex flex-col">
						{[
							{ label: "Present", value: staff?.present ?? 0, dot: "bg-pos" },
							{ label: "On approved leave", value: staff?.on_leave ?? 0, dot: "bg-black/30" },
							{ label: "Absent, unapproved", value: staff?.absent_unapproved ?? 0, dot: "bg-danger" },
							{ label: "Not yet marked", value: staff?.unmarked ?? 0, dot: "bg-black/30" },
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
				</Card>
			</section>
		</div>
	);
}
