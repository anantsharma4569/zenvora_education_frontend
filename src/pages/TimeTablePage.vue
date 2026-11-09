<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarOptions, EventInput } from "@fullcalendar/core";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { inputClass } from "@/lib/styles";
import type { Slot } from "@/lib/types";

/** The shape this page was built around; lessons from the API are mapped onto it. */
interface TimetableRow {
	name: string;
	student_group: string;
	student_group_name: string;
	program: string;
	course: string;
	course_name: string;
	instructor: string;
	instructor_name: string;
	room: string;
	room_name: string;
	schedule_date: string;
	from_time: string;
	to_time: string;
	color: string;
}
const toRow = (x: Slot): TimetableRow => ({
	name: x.id,
	student_group: x.section.id,
	student_group_name: x.section.name,
	program: x.class.name,
	course: x.subject.id,
	course_name: x.subject.name,
	instructor: x.teacher.id,
	instructor_name: x.teacher.name,
	room: x.room.id,
	room_name: x.room.name,
	schedule_date: x.date,
	from_time: x.startTime,
	to_time: x.endTime,
	color: x.color ?? "",
});
import Modal from "@/components/Modal.vue";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import ErrorState from "@/components/ErrorState.vue";
import Chip from "@/components/Chip.vue";

const { role } = storeToRefs(useSession());
const isAdmin = computed(() => role.value === "admin");
// Teachers see their own lessons (with the class taught); students see their section's (with the teacher).
const isTeacher = computed(() => role.value === "teacher");

// Frappe's Course Schedule colour is a name ("blue"); anything unknown falls back to the accent green.
const COLORS: Record<string, string> = {
	blue: "#2563eb",
	green: "#0f7b4a",
	red: "#dc2626",
	orange: "#ea580c",
	yellow: "#ca8a04",
	teal: "#0d9488",
	violet: "#7c3aed",
	cyan: "#0891b2",
	amber: "#d97706",
	pink: "#db2777",
	purple: "#9333ea",
};
const colorOf = (name: string) => COLORS[name] ?? "#0f7b4a";

// Frappe returns times as "9:00:00".
const hhmm = (t: string) => {
	const [h = "", m = ""] = (t || "").split(":");
	return h ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}` : "";
};
const mins = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Admin pickers.
const programs = ref<{ name: string; program_name: string }[]>([]);
const sections = ref<{ name: string; student_group_name: string; program: string }[]>([]);
const program = ref("");
const section = ref("");
const sectionOptions = computed(() => sections.value.filter((s) => !program.value || s.program === program.value));
const sectionLabel = computed(() => sections.value.find((s) => s.name === section.value)?.student_group_name ?? section.value);
const programLabel = computed(() => programs.value.find((p) => p.name === program.value)?.program_name ?? program.value);
watch(program, () => {
	if (section.value && !sectionOptions.value.some((s) => s.name === section.value)) section.value = "";
});
watch(
	isAdmin,
	(admin) => {
		if (!admin) return;
		api.timetable
			.options()
			.then((o) => {
				programs.value = o.classes.map((c) => ({ name: c.id, program_name: c.name }));
				sections.value = o.sections.map((x) => ({ name: x.id, student_group_name: x.name, program: x.classId }));
			})
			.catch(() => undefined);
	},
	{ immediate: true },
);

const ready = computed(() => !isAdmin.value || !!section.value);

// Load whatever range the calendar is showing.
const range = ref<{ from: string; to: string } | null>(null);
const rows = ref<TimetableRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
let seq = 0;
watch(
	[range, section, ready, role],
	async () => {
		const mine = ++seq;
		if (!ready.value || !range.value) {
			rows.value = [];
			loading.value = false;
			return;
		}
		loading.value = true;
		error.value = null;
		try {
			const { from, to } = range.value;
			const data = isAdmin.value ? await api.timetable.section(section.value, from, to) : await api.timetable.mine(from, to);
			if (mine === seq) rows.value = data.map(toRow);
		} catch (e) {
			if (mine === seq) {
				rows.value = [];
				error.value = e instanceof Error ? e.message : "Could not load the time table.";
			}
		} finally {
			if (mine === seq) loading.value = false;
		}
	},
	{ immediate: true },
);

const groupText = (r: TimetableRow) => [r.program, r.student_group_name].filter(Boolean).join(" - ");
const otherText = (r: TimetableRow) => (isTeacher.value ? groupText(r) : r.instructor_name);

// --- Static placeholder: teacher leave / substitute -----------------------------------------
// There's no Leave / Substitute API yet, so this stands in for it: a handful of lessons per
// week are deterministically (not randomly - same lesson always shows the same thing) marked
// as the teacher being on leave, with or without a substitute covering the class. Swap
// `leaveInfo` for a real lookup once the backend has one.
type LeaveStatus = "scheduled" | "leave" | "substitute";
const SUBSTITUTES = ["Ms. Kavita Nair", "Mr. Rohan Mehta", "Mrs. Anjali Verma", "Mr. Farhan Ali"];
const hashOf = (s: string) => {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
};
const leaveInfo = (r: TimetableRow): { status: LeaveStatus; substitute?: string } => {
	const h = hashOf(r.name || `${r.schedule_date}-${r.from_time}-${r.instructor}`);
	if (h % 9 === 0) return { status: "leave" };
	if (h % 9 === 1) return { status: "substitute", substitute: SUBSTITUTES[h % SUBSTITUTES.length] };
	return { status: "scheduled" };
};
// ----------------------------------------------------------------------------------------------

const events = computed<EventInput[]>(() =>
	rows.value.map((r) => {
		const leave = leaveInfo(r);
		return {
			title: r.course_name,
			start: `${r.schedule_date}T${hhmm(r.from_time)}:00`,
			end: `${r.schedule_date}T${hhmm(r.to_time)}:00`,
			backgroundColor: "transparent",
			borderColor: "transparent",
			extendedProps: { other: otherText(r), room: r.room_name, color: colorOf(r.color), ...leave },
		};
	}),
);

// Day popup.
interface Row {
	kind: "lesson" | "break";
	period?: number;
	start: string;
	end: string;
	course?: string;
	other?: string;
	room?: string;
	color?: string;
	status?: LeaveStatus;
	substitute?: string;
}

const selectedDate = ref<Date | null>(null);
const dayRows = computed<Row[]>(() => {
	if (!selectedDate.value) return [];
	const day = iso(selectedDate.value);
	const lessons = rows.value
		.filter((r) => r.schedule_date === day)
		.map((r) => ({ start: hhmm(r.from_time), end: hhmm(r.to_time), r }))
		.sort((a, b) => a.start.localeCompare(b.start));
	const out: Row[] = [];
	lessons.forEach(({ start, end, r }, i) => {
		const prev = lessons[i - 1];
		// A section's gap is a break; a teacher's gap is just free time, so no row for it.
		if (!isTeacher.value && prev && mins(start) - mins(prev.end) >= 15) out.push({ kind: "break", start: prev.end, end: start });
		out.push({
			kind: "lesson",
			period: i + 1,
			start,
			end,
			course: r.course_name,
			other: otherText(r),
			room: r.room_name,
			color: colorOf(r.color),
			...leaveInfo(r),
		});
	});
	return out;
});
const heading = computed(() =>
	isAdmin.value ? `${programLabel.value ? programLabel.value + " - " : ""}Section ${sectionLabel.value}` : isTeacher.value ? "My schedule" : "My class schedule",
);
const dayTitle = computed(() =>
	selectedDate.value
		? `${heading.value} · ${DAY_NAMES[selectedDate.value.getDay()]}, ${selectedDate.value.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`
		: "",
);

const options = computed<CalendarOptions>(() => ({
	plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
	dateClick: (arg) => (selectedDate.value = arg.date),
	eventClick: (arg) => (selectedDate.value = arg.event.start),
	moreLinkClick: (arg) => {
		selectedDate.value = arg.date;
		return "none";
	},
	datesSet: (arg) => {
		const to = new Date(arg.end);
		to.setDate(to.getDate() - 1); // FullCalendar's end is exclusive
		const next = { from: iso(arg.start), to: iso(to) };
		if (next.from !== range.value?.from || next.to !== range.value?.to) range.value = next;
	},
	initialView: "dayGridMonth",
	headerToolbar: { left: "title", center: "", right: "today prev,next dayGridMonth,timeGridWeek" },
	buttonText: { today: "Today", month: "Month", week: "Week" },
	weekends: false,
	firstDay: 1,
	height: "auto",
	dayMaxEvents: 3,
	moreLinkText: (n) => `+${n} more`,
	dayHeaderFormat: { weekday: "long" },
	slotMinTime: "07:00:00",
	slotMaxTime: "17:00:00",
	slotDuration: "00:30:00",
	slotLabelFormat: { hour: "numeric", minute: "2-digit", hour12: false },
	allDaySlot: false,
	nowIndicator: true,
	eventDisplay: "block",
	events: events.value,
	eventContent: (arg) => {
		const el = document.createElement("div");
		const { other, room, color, status, substitute } = arg.event.extendedProps as {
			other: string;
			room: string;
			color: string;
			status: LeaveStatus;
			substitute?: string;
		};
		el.style.setProperty("--c", color);
		const flagClass = status === "leave" ? " tt-leave" : status === "substitute" ? " tt-substitute" : "";
		if (arg.view.type === "dayGridMonth") {
			el.className = "tt-pill" + flagClass;
			el.innerHTML = `<i></i><span class="tt-pill-time"></span><b></b><span class="tt-pill-flag"></span>`;
			el.querySelector(".tt-pill-time")!.textContent = arg.timeText.slice(0, 5);
			el.querySelector("b")!.textContent = arg.event.title;
			el.querySelector(".tt-pill-flag")!.textContent = status === "leave" ? "\u{1F6AB}" : status === "substitute" ? "\u{1F501}" : "";
			return { domNodes: [el] };
		}
		el.className = "tt-block" + flagClass;
		const t = document.createElement("div");
		t.className = "tt-block-title";
		t.textContent = arg.event.title;
		el.append(t);
		if (status === "leave") {
			const badge = document.createElement("div");
			badge.className = "tt-badge tt-badge-leave";
			badge.textContent = "On leave · no substitute";
			el.append(badge);
		} else if (status === "substitute") {
			const badge = document.createElement("div");
			badge.className = "tt-badge tt-badge-sub";
			badge.textContent = `Substitute: ${substitute}`;
			el.append(badge);
		}
		const m = document.createElement("div");
		m.className = "tt-block-meta";
		if (status === "leave") {
			const struck = document.createElement("s");
			struck.textContent = other;
			m.append(struck);
		}
		else m.textContent = [other, room].filter(Boolean).join(" · ");
		el.append(m);
		return { domNodes: [el] };
	},
}));
</script>

<template>
	<div>
		<PageHeader
			title="View Time Table"
			:subtitle="isAdmin ? 'Pick a class and section to see its schedule.' : isTeacher ? 'Your teaching schedule.' : 'Your class schedule.'"
		/>

		<div v-if="isAdmin" class="mb-5 flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1 text-xs font-medium text-black/60">
				Class
				<select v-model="program" :class="[inputClass, 'min-w-40']">
					<option value="">All classes</option>
					<option v-for="p in programs" :key="p.name" :value="p.name">{{ p.program_name }}</option>
				</select>
			</label>
			<label class="flex flex-col gap-1 text-xs font-medium text-black/60">
				Section
				<select v-model="section" :class="[inputClass, 'min-w-40']">
					<option value="">Select section</option>
					<option v-for="s in sectionOptions" :key="s.name" :value="s.name">{{ s.student_group_name }}</option>
				</select>
			</label>
		</div>

		<ErrorState v-if="error" :message="error" />
		<div v-if="ready" class="timetable rounded-xl border border-line bg-surface p-4" :class="{ 'opacity-70': loading }">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<p class="text-sm font-medium">{{ heading }}</p>
				<div class="flex flex-wrap items-center gap-1.5">
					<Chip tone="bad">🚫 On leave</Chip>
					<Chip tone="warn">🔁 Substitute assigned</Chip>
				</div>
			</div>
			<FullCalendar :options="options" />
		</div>
		<EmptyState v-else label="Choose a section to view its time table." />

		<Modal v-if="selectedDate" :title="dayTitle" @close="selectedDate = null">
			<div v-if="dayRows.length" class="overflow-x-auto">
				<table class="w-full min-w-[520px] text-left text-sm">
					<thead>
						<tr class="border-b border-line text-xs uppercase tracking-wide text-black/50">
							<th class="py-2 pr-3 font-medium">#</th>
							<th class="py-2 pr-3 font-medium">Time</th>
							<th class="py-2 pr-3 font-medium">Subject</th>
							<th class="py-2 pr-3 font-medium">{{ isTeacher ? "Class" : "Teacher" }}</th>
							<th class="py-2 pr-3 font-medium">Room</th>
							<th class="py-2 font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						<template v-for="r in dayRows" :key="r.start">
							<tr v-if="r.kind === 'break'" class="border-b border-line bg-mint/60 text-black/60">
								<td class="py-2 pr-3" />
								<td class="whitespace-nowrap py-2 pr-3">{{ r.start }} - {{ r.end }}</td>
								<td colspan="4" class="py-2 italic">Break</td>
							</tr>
							<tr v-else class="border-b border-line last:border-0">
								<td class="py-2.5 pr-3 text-black/50">{{ r.period }}</td>
								<td class="whitespace-nowrap py-2.5 pr-3">{{ r.start }} - {{ r.end }}</td>
								<td class="py-2.5 pr-3 font-medium">
									<span class="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" :style="{ background: r.color }" />{{ r.course }}
								</td>
								<td class="py-2.5 pr-3" :class="{ 'text-black/40 line-through': r.status === 'leave' }">{{ r.other }}</td>
								<td class="py-2.5 pr-3">{{ r.room }}</td>
								<td class="py-2.5">
									<Chip v-if="r.status === 'leave'" tone="bad">On leave</Chip>
									<Chip v-else-if="r.status === 'substitute'" tone="warn">Sub: {{ r.substitute }}</Chip>
									<Chip v-else tone="ok">Scheduled</Chip>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>
			<p v-else class="text-sm text-black/50">No classes scheduled on this day.</p>
		</Modal>
	</div>
</template>

<style>
.timetable {
	--fc-border-color: #e6e9e7;
	--fc-today-bg-color: #f3faf6;
	--fc-neutral-bg-color: #f6f8f7;
	--fc-button-bg-color: #fff;
	--fc-button-border-color: #d5dad7;
	--fc-button-text-color: #333;
	--fc-button-hover-bg-color: #e8f3ed;
	--fc-button-hover-border-color: #b9d8c8;
	--fc-button-active-bg-color: #0f7b4a;
	--fc-button-active-border-color: #0f7b4a;
	--fc-event-border-color: transparent;
}
.timetable .fc-toolbar { flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem !important; }
.timetable .fc-toolbar-title { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; }
.timetable .fc-button { border-radius: 999px !important; padding: 0.4rem 0.9rem; font-size: 0.8125rem; font-weight: 500; box-shadow: none !important; text-transform: none; }
.timetable .fc-button-group { gap: 0.25rem; }
.timetable .fc-button-group > .fc-button { border-radius: 999px !important; margin: 0 !important; }
.timetable .fc-button-active { color: #fff !important; }
.timetable .fc-theme-standard td, .timetable .fc-theme-standard th, .timetable .fc-theme-standard .fc-scrollgrid { border-color: var(--fc-border-color); }
.timetable .fc-col-header-cell { background: #f6f8f7; padding: 0.6rem 0; }
.timetable .fc-col-header-cell-cushion { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #667; }
.timetable .fc-daygrid-day, .timetable .fc-timegrid-col, .timetable .fc-event { cursor: pointer; }
.timetable .fc-daygrid-day:hover { background: #f8fbf9; }
.timetable .fc-daygrid-day-number { font-size: 0.8125rem; color: #444; padding: 0.4rem 0.55rem; }
.timetable .fc-day-today .fc-daygrid-day-number { background: #0f7b4a; color: #fff; border-radius: 999px; margin: 0.3rem; padding: 0.1rem 0.5rem; }
.timetable .fc-daygrid-day-frame { min-height: 8.5rem; }
.timetable .fc-daygrid-event { background: transparent; border: 0; margin: 1px 4px; }
.timetable .fc-daygrid-more-link { font-size: 0.75rem; font-weight: 600; color: #0f7b4a; margin: 0 6px; }
.timetable .fc-timegrid-slot { height: 3.25rem; }
.timetable .fc-timegrid-slot-label-cushion { font-size: 0.75rem; color: #778; }
.timetable .fc-timegrid-event, .timetable .fc-timegrid-event .fc-event-main { background: transparent; border: 0; box-shadow: none; }
.timetable .fc-timegrid-event-harness { padding: 1px 2px; }
.timetable .fc-bg-event { opacity: 1; }
.timetable .tt-break-label { text-align: center; font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #8a918d; padding-top: 1.1rem; }
.timetable .tt-pill { display: flex; align-items: center; gap: 0.35rem; overflow: hidden; white-space: nowrap; border-radius: 6px; padding: 2px 6px; font-size: 0.75rem; background: color-mix(in srgb, var(--c) 12%, white); color: #222; }
.timetable .tt-pill:hover { background: color-mix(in srgb, var(--c) 22%, white); }
.timetable .tt-pill i { width: 6px; height: 6px; flex: none; border-radius: 999px; background: var(--c); }
.timetable .tt-pill-time { color: #667; font-variant-numeric: tabular-nums; }
.timetable .tt-pill b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.timetable .tt-block { height: 100%; overflow: hidden; border-radius: 8px; border-left: 4px solid var(--c); padding: 0.3rem 0.5rem; background: color-mix(in srgb, var(--c) 13%, white); color: #222; line-height: 1.25; }
.timetable .tt-block-title { font-size: 0.8125rem; font-weight: 600; }
.timetable .tt-block-meta { font-size: 0.6875rem; color: #555; }
.timetable .tt-badge { display: inline-block; margin-top: 1px; border-radius: 4px; padding: 0 4px; font-size: 0.625rem; font-weight: 600; line-height: 1.4; }
.timetable .tt-badge-leave { background: #fee2e2; color: #b91c1c; }
.timetable .tt-badge-sub { background: #fef3c7; color: #92400e; }
.timetable .tt-pill.tt-leave { background: #fee2e2; opacity: 0.85; }
.timetable .tt-pill.tt-leave i { background: #dc2626; }
.timetable .tt-pill.tt-substitute { background: #fef3c7; }
.timetable .tt-pill.tt-substitute i { background: #d97706; }
.timetable .tt-pill-flag { margin-left: auto; flex: none; font-size: 0.7rem; line-height: 1; }
.timetable .tt-block.tt-leave { border-left-color: #dc2626; background: #fef2f2; }
.timetable .tt-block.tt-substitute { border-left-color: #d97706; background: #fffbeb; }
</style>
