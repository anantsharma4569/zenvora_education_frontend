export type Period = "today" | "week" | "month" | "year" | "all" | "custom";

export const PERIODS: { key: Period; label: string }[] = [
	{ key: "today", label: "Today" },
	{ key: "week", label: "This week" },
	{ key: "month", label: "This month" },
	{ key: "year", label: "This year" },
	{ key: "all", label: "All time" },
	{ key: "custom", label: "Custom range" },
];

const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Calendar ranges ending today: the week starts Monday, the year on 1 January. */
export function periodRange(period: "today" | "week" | "month" | "year", now = new Date()): { from_date: string; to_date: string } {
	const start = new Date(now);
	if (period === "week") start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
	else if (period === "month") start.setDate(1);
	else if (period === "year") start.setMonth(0, 1);
	return { from_date: iso(start), to_date: iso(now) };
}
