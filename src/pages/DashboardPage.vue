<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { DashboardData } from "@/lib/types";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";
import Card from "@/components/Card.vue";
import CardHead from "@/components/CardHead.vue";
import Label from "@/components/Label.vue";
import StatCard from "@/components/StatCard.vue";
import Bar from "@/components/Bar.vue";
import Columns from "@/components/Columns.vue";
import AttentionItem from "@/components/AttentionItem.vue";

/**
 * Principal / admin dashboard.
 *
 * The question a principal opens this page with is "what do I need to do
 * today", not "how many students exist" - every panel below the stat strip
 * is either an exception to act on or a trend that puts today's number in
 * context. All of it comes from GET /school/dashboard; nothing here is a fixture.
 */

const NUM = new Intl.NumberFormat("en-IN");
const LINK = "cursor-pointer text-[12.5px] text-black/50 hover:text-black";

/** Amounts from the API are in paise. */
const formatINR = (paise: number) => {
	const amount = paise / 100;
	if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
	if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
	return `₹${NUM.format(Math.round(amount))}`;
};

const gradeBar = (label: string) => (label === "F" ? "bg-danger" : label === "D" ? "bg-warn" : "bg-accent");

interface Attention {
	tone: "danger" | "warn" | "neutral";
	title: string;
	meta: string;
	href: string;
}

const { role } = storeToRefs(useSession());
const isAdmin = computed(() => role.value === "admin");
const data = ref<DashboardData | null>(null);
const error = ref<string | null>(null);

watch(
	role,
	() => {
		data.value = null;
		error.value = null;
		api.dashboard()
			.then((res) => (data.value = res))
			.catch((err) => (error.value = err.message));
	},
	{ immediate: true },
);

const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

const present = computed(() => data.value?.todayPresent ?? 0);
const absent = computed(() => data.value?.todayAbsent ?? 0);
const marked = computed(() => present.value + absent.value);
const rate = computed(() => (marked.value ? (present.value / marked.value) * 100 : 0));

const groups = computed(() => data.value?.attendanceByGroup ?? []);
const trend = computed(() => data.value?.attendanceTrend ?? []);
const grades = computed(() => data.value?.gradeDistribution ?? []);
const fees = computed(() => data.value?.feesSummary);
const exam = computed(() => data.value?.examSummary);
const staff = computed(() => data.value?.staffToday);
const lowAttendanceCount = computed(() => data.value?.lowAttendanceCount ?? 0);

const trendColumns = computed(() => {
	const t = trend.value;
	const floor = t.length ? Math.max(0, Math.floor(Math.min(...t.map((x) => x.rate))) - 5) : 0;
	return t.map((x, i) => ({
		label: i === t.length - 1 ? "T" : String(i + 1),
		value: floor < 100 ? ((x.rate - floor) / (100 - floor)) * 100 : 100,
	}));
});

const collectedPct = computed(() => (fees.value && fees.value.billed ? (fees.value.collected / fees.value.billed) * 100 : 0));
const outstandingPct = computed(() => (fees.value && fees.value.billed ? (fees.value.outstanding / fees.value.billed) * 100 : 0));
const pendingGroups = computed(() => (exam.value ? Math.max(0, exam.value.totalGroups - exam.value.publishedGroups) : 0));
const maxGradeValue = computed(() => Math.max(1, ...grades.value.map((g) => g.value)));

const attentionItems = computed(() => {
	const items: Attention[] = [];
	const a = absent.value;
	const f = fees.value;
	const e = exam.value;
	const s = staff.value;
	if (a > 0) {
		items.push({
			tone: "danger",
			title: `${a} student${a === 1 ? "" : "s"} absent today`,
			meta: "Attendance · mark reasons before end of day",
			href: "/attendance",
		});
	}
	if (f && f.unpaidStudents > 0) {
		items.push({
			tone: "danger",
			title: `${f.unpaidStudents} student${f.unpaidStudents === 1 ? "" : "s"} past fee due date`,
			meta: `${formatINR(f.overdue)} overdue`,
			href: "/fees",
		});
	}
	if (lowAttendanceCount.value > 0) {
		items.push({
			tone: "warn",
			title: `${lowAttendanceCount.value} student${lowAttendanceCount.value === 1 ? "" : "s"} below 75% attendance`,
			meta: "At exam-eligibility risk",
			href: "/students",
		});
	}
	if (pendingGroups.value > 0 && e) {
		items.push({
			tone: "warn",
			title: `Results pending for ${pendingGroups.value} exam${pendingGroups.value === 1 ? "" : "s"}`,
			meta: `${e.publishedGroups} of ${e.totalGroups} exams published`,
			href: "/exams",
		});
	}
	if (s && s.onLeave > 0) {
		items.push({
			tone: "neutral",
			title: `${s.onLeave} staff member${s.onLeave === 1 ? "" : "s"} on approved leave today`,
			meta: "Staff",
			href: "/staff",
		});
	}
	return items;
});

const staffRows = computed(() => [
	{ label: "Present", value: staff.value?.present ?? 0, dot: "bg-pos" },
	{ label: "On approved leave", value: staff.value?.onLeave ?? 0, dot: "bg-black/30" },
	{ label: "Absent, unapproved", value: staff.value?.absentUnapproved ?? 0, dot: "bg-danger" },
	{ label: "Not yet marked", value: staff.value?.unmarked ?? 0, dot: "bg-black/30" },
]);
</script>

<template>
	<ErrorState v-if="error" :message="`Could not load dashboard: ${error}`" />
	<LoadingState v-else-if="!data" />
	<div v-else class="flex flex-col gap-[18px]">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 class="text-[25px] font-semibold tracking-[-0.02em]">{{ today }}</h1>
				<p class="mt-1.5 text-[13.5px] text-black/55">Signed in as {{ data.role }}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<RouterLink
					to="/attendance"
					class="rounded-full border border-black/15 bg-surface px-4 py-2.5 text-[13px] font-medium hover:bg-mint"
				>
					Take attendance
				</RouterLink>
				<button class="rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-accent-strong">
					Publish notice
				</button>
			</div>
		</header>

		<section class="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-[13px]">
			<component
				:is="isAdmin ? 'RouterLink' : 'div'"
				:to="isAdmin ? '/attendance?status=PRESENT' : undefined"
				class="flex min-h-[116px] flex-col justify-between rounded-xl border border-line bg-surface p-[16px_18px]"
				:class="isAdmin ? 'cursor-pointer transition-colors hover:border-accent hover:bg-mint/40' : ''"
			>
				<Label>Attendance today</Label>
				<div class="mt-2.5 text-[32px] font-semibold leading-none tracking-[-0.03em]">
					{{ rate.toFixed(1) }}<span class="text-[18px] font-medium">%</span>
				</div>
				<div class="mt-2.5"><Bar :pct="rate" /></div>
			</component>
			<StatCard label="Students" :value="NUM.format(data.studentCount ?? 0)" :to="isAdmin ? '/students' : undefined" />
			<StatCard
				label="Present"
				:value="NUM.format(present)"
				:note="`of ${NUM.format(marked)} marked`"
				:to="isAdmin ? '/attendance?status=PRESENT' : undefined"
			/>
			<StatCard label="Absent" :value="NUM.format(absent)" tone="warn" :to="isAdmin ? '/attendance?status=ABSENT' : undefined" />
			<StatCard
				:to="isAdmin ? '/staff?tab=teaching' : undefined"
				label="Instructors"
				:value="NUM.format(data.instructorCount ?? 0)"
				:note="`${NUM.format(data.employeeCount ?? 0)} employees`"
			/>
		</section>

		<section class="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
			<Card>
				<CardHead title="Attendance by section">
					<template #action><RouterLink to="/attendance" :class="LINK">All groups →</RouterLink></template>
				</CardHead>
				<p class="mb-[18px] mt-1 text-[12.5px] text-black/50">Marked for today. Groups under 85% are flagged.</p>
				<p v-if="groups.length === 0" class="text-[13px] text-black/45">No attendance marked for today yet.</p>
				<div v-else class="flex flex-col gap-3">
					<div
						v-for="g in groups"
						:key="g.name"
						class="grid grid-cols-[minmax(70px,120px)_minmax(48px,1fr)_auto] items-center gap-2.5"
					>
						<span class="truncate text-[13px] font-medium">{{ g.name }}</span>
						<Bar :pct="g.pct" :tone="g.pct < 80 ? 'danger' : g.pct < 85 ? 'warn' : undefined" />
						<span class="text-right text-[12.5px] font-semibold tabular-nums">{{ g.pct }}%</span>
					</div>
				</div>
				<div class="mt-[22px] border-t border-line-soft pt-[18px]">
					<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
						<h3 class="text-[12.5px] font-semibold text-black/70">Last 14 school days</h3>
						<span class="text-[11.5px] text-black/45">school-wide rate</span>
					</div>
					<p v-if="trendColumns.length === 0" class="text-[13px] text-black/45">No attendance history yet.</p>
					<Columns v-else highlight-last :max="100" :height="72" :data="trendColumns" />
				</div>
			</Card>

			<div class="flex flex-col gap-4">
				<Card>
					<CardHead title="Needs your attention" />
					<p class="mb-3.5 mt-1 text-[12.5px] text-black/50">Ordered by urgency.</p>
					<p v-if="attentionItems.length === 0" class="text-[13px] text-black/45">Nothing needs attention right now.</p>
					<div v-else class="flex flex-col gap-0.5">
						<AttentionItem
							v-for="item in attentionItems"
							:key="item.title"
							:tone="item.tone"
							:href="item.href"
							:title="item.title"
							:meta="item.meta"
						/>
					</div>
				</Card>

				<Card>
					<CardHead title="Fee collection" />
					<p v-if="!fees || fees.billed === 0" class="mt-3.5 text-[13px] text-black/45">No fee invoices raised yet.</p>
					<template v-else>
						<div class="mt-3.5 flex flex-wrap items-baseline gap-2">
							<span class="text-[27px] font-semibold tracking-[-0.03em]">{{ formatINR(fees.collected) }}</span>
							<span class="text-[12.5px] text-black/50">of {{ formatINR(fees.billed) }} billed</span>
						</div>
						<div class="mt-3 flex h-2 overflow-hidden rounded-full bg-black/[0.07]">
							<div class="bg-accent" :style="{ width: `${collectedPct}%` }" />
							<div class="bg-warn" :style="{ width: `${outstandingPct}%` }" />
						</div>
						<div class="mt-3.5 flex flex-wrap gap-5">
							<div>
								<Label>Collected</Label>
								<div class="mt-1 text-sm font-semibold">{{ collectedPct.toFixed(1) }}%</div>
							</div>
							<div>
								<Label>Overdue</Label>
								<div class="mt-1 text-sm font-semibold text-warn">{{ formatINR(fees.overdue) }}</div>
							</div>
							<div>
								<Label>Students</Label>
								<div class="mt-1 text-sm font-semibold">{{ fees.unpaidStudents }} unpaid</div>
							</div>
						</div>
					</template>
				</Card>
			</div>
		</section>

		<section class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
			<Card>
				<CardHead title="Mid-term results">
					<template #action><RouterLink to="/exams" :class="LINK">Open exams →</RouterLink></template>
				</CardHead>
				<p v-if="!exam || exam.totalResults === 0" class="mt-1.5 text-[13px] text-black/45">No results published yet.</p>
				<template v-else>
					<p class="mb-[18px] mt-1.5 text-[12.5px] text-black/50">
						Published for {{ exam.publishedGroups }} of {{ exam.totalGroups }} groups ·
						{{ NUM.format(exam.totalResults) }} result records
					</p>
					<div class="flex items-end gap-2" style="height: 88px">
						<div v-for="g in grades" :key="g.label" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[7px]">
							<span class="text-[11.5px] font-semibold tabular-nums">{{ g.value }}</span>
							<div class="w-full rounded-t" :class="gradeBar(g.label)" :style="{ height: `${(g.value / maxGradeValue) * 100}%` }" />
							<span class="text-[11.5px] font-medium text-black/50">{{ g.label }}</span>
						</div>
					</div>
					<div class="mt-[18px] flex flex-wrap gap-[22px] border-t border-line-soft pt-4">
						<div><Label>Pass rate</Label><div class="mt-1 text-base font-semibold">{{ exam.passRate }}%</div></div>
						<div><Label>Median score</Label><div class="mt-1 text-base font-semibold">{{ exam.medianScore }} / 100</div></div>
						<div><Label>Below 40</Label><div class="mt-1 text-base font-semibold text-danger">{{ exam.below40 }}</div></div>
					</div>
				</template>
			</Card>

			<Card>
				<CardHead title="Staff today">
					<template #action><RouterLink to="/staff" :class="LINK">Staff →</RouterLink></template>
				</CardHead>
				<p class="mb-4 mt-1.5 text-[12.5px] text-black/50">
					{{ NUM.format(data.employeeCount ?? 0) }} employees · {{ NUM.format(data.instructorCount ?? 0) }} teachers
				</p>
				<div class="flex flex-col">
					<div v-for="s in staffRows" :key="s.label" class="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
						<span class="flex items-center gap-2.5">
							<span class="h-[7px] w-[7px] shrink-0 rounded-full" :class="s.dot" />
							<span class="text-[13px]">{{ s.label }}</span>
						</span>
						<span class="text-[13px] font-semibold tabular-nums">{{ s.value }}</span>
					</div>
				</div>
			</Card>
		</section>
	</div>
</template>
