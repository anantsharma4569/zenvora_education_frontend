import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
	return (
		<div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</div>
	);
}

export function CardHead({ title, action }: { title: string; action?: ReactNode }) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-3">
			<h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
			{action}
		</div>
	);
}

export function Label({ children }: { children: ReactNode }) {
	return (
		<div className="text-[10.5px] uppercase tracking-[0.09em] text-black/45">{children}</div>
	);
}

/** Replaces the old StatCard. `note` is the one-line context under the number. */
export function StatCard({
	label,
	value,
	note,
	tone,
}: {
	label: string;
	value: string | number;
	note?: string;
	tone?: "warn" | "danger";
}) {
	const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "";
	return (
		<div className="flex min-h-[116px] flex-col justify-between rounded-xl border border-line bg-surface p-[16px_18px]">
			<Label>{label}</Label>
			<div className={`mt-2.5 text-[29px] font-semibold leading-none tracking-[-0.03em] ${color}`}>
				{value}
			</div>
			{note && <div className="mt-2 text-xs text-black/50">{note}</div>}
		</div>
	);
}

export type ChipTone = "ok" | "warn" | "bad" | "neutral";

const CHIP: Record<ChipTone, string> = {
	ok: "bg-[rgba(22,120,90,0.10)] text-[oklch(0.45_0.10_165)]",
	warn: "bg-[rgba(180,120,20,0.13)] text-[oklch(0.48_0.12_70)]",
	bad: "bg-[rgba(190,60,50,0.10)] text-[oklch(0.48_0.15_25)]",
	neutral: "bg-black/[0.06] text-black/60",
};

export function Chip({ tone = "neutral", children }: { tone?: ChipTone; children: ReactNode }) {
	return (
		<span className={`inline-block rounded-full px-2.5 py-[3px] text-xs font-medium ${CHIP[tone]}`}>
			{children}
		</span>
	);
}

/** Horizontal progress bar. `tone` overrides the accent fill. */
export function Bar({ pct, tone }: { pct: number; tone?: "warn" | "danger" }) {
	const bg = tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-accent";
	return (
		<div className="h-2 min-w-0 overflow-hidden rounded-full bg-black/[0.06]">
			<div className={`h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
		</div>
	);
}

/** Vertical column chart. Values are normalised against `max`. */
export function Columns({
	data,
	max,
	height = 76,
	highlightLast,
}: {
	data: { label: string; value: number; tone?: "warn" | "danger" }[];
	max: number;
	height?: number;
	highlightLast?: boolean;
}) {
	return (
		<div className="flex items-end gap-1.5" style={{ height }}>
			{data.map((d, i) => {
				const last = highlightLast && i === data.length - 1;
				const bg =
					d.tone === "danger" ? "bg-danger" : d.tone === "warn" ? "bg-warn" : last || !highlightLast ? "bg-accent" : "bg-black/[0.14]";
				return (
					<div key={d.label + i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
						<div className={`w-full rounded-t-[3px] ${bg}`} style={{ height: `${(d.value / max) * 100}%` }} />
						<div className="font-mono text-[9.5px] text-black/35">{d.label}</div>
					</div>
				);
			})}
		</div>
	);
}

export function AttentionItem({
	title,
	meta,
	tone = "neutral",
	href,
}: {
	title: string;
	meta: string;
	tone?: "warn" | "danger" | "neutral";
	href: string;
}) {
	const dot = tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-black/30";
	return (
		<a
			href={href}
			className="-mx-2.5 grid grid-cols-[7px_1fr] items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-black/[0.035]"
		>
			<span className={`mt-[5px] h-[7px] w-[7px] rounded-full ${dot}`} />
			<span>
				<span className="block text-[13px] font-medium leading-snug text-pretty">{title}</span>
				<span className="mt-0.5 block text-xs text-black/50">{meta}</span>
			</span>
		</a>
	);
}
