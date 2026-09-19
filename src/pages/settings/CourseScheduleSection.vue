<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import { periodRange } from "@/lib/period";
import { btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import type { FieldDef, Values } from "@/lib/resource";
import type { CourseScheduleRow } from "@/lib/types";
import ResourcePage from "@/components/ResourcePage.vue";
import Modal from "@/components/Modal.vue";
import FormField from "@/components/FormField.vue";

const COLORS = ["blue", "green", "red", "orange", "yellow", "teal", "violet", "cyan", "amber", "pink", "purple"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const { rows, load } = useList(api.listCourseSchedules);
const { rows: groups } = useList(api.listStudentGroups);
const { rows: courses } = useList(() => api.listCourses());
const { rows: instructors } = useList(api.listInstructors);
const { rows: rooms } = useList(api.listRooms);
const { rows: terms } = useList(() => api.listAcademicTerms());
const { rows: years } = useList(api.listAcademicYears);

// Frappe only accepts a date inside the section's Academic Term (else its Academic Year).
const windowFor = (sectionName: string): { from: string; to: string; label: string } | null => {
	const g = groups.value.find((x) => x.name === sectionName);
	if (!g) return null;
	const t = terms.value.find((x) => x.name === g.academic_term);
	if (t?.term_start_date && t.term_end_date) return { from: t.term_start_date, to: t.term_end_date, label: t.name };
	const y = years.value.find((x) => x.name === g.academic_year);
	return y?.year_start_date && y.year_end_date ? { from: y.year_start_date, to: y.year_end_date, label: y.name } : null;
};

// Frappe returns times as "9:00:00"; <input type="time"> wants "09:00".
const hhmm = (t: string) => {
	const [h = "", m = ""] = (t || "").split(":");
	return h ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}` : "";
};
const shortTime = (t: string) => hhmm(t) || "-";

const fieldList = (): FieldDef[] => [
	{
		key: "student_group",
		label: "Student Group (Section)",
		type: "select",
		required: true,
		options: groups.value.map((g) => ({ value: g.name, label: g.student_group_name })),
	},
	{
		key: "course",
		label: "Course",
		type: "select",
		required: true,
		options: courses.value.map((c) => ({ value: c.name, label: c.course_name })),
	},
	{
		key: "instructor",
		label: "Instructor",
		type: "select",
		required: true,
		options: instructors.value.map((i) => ({ value: i.name, label: i.instructor_name })),
	},
	{
		key: "room",
		label: "Room",
		type: "select",
		required: true,
		options: rooms.value.map((r) => ({ value: r.name, label: r.room_name || r.name })),
	},
	{
		key: "schedule_date",
		label: "Schedule Date",
		type: "date",
		required: true,
		min: (v) => windowFor(v.student_group as string)?.from,
		max: (v) => windowFor(v.student_group as string)?.to,
		help: (v) => {
			const w = windowFor(v.student_group as string);
			return w ? `Must fall in ${w.label}: ${w.from} to ${w.to}.` : "Pick a section to see its allowed dates.";
		},
		validate: (v) => {
			const w = windowFor(v.student_group as string);
			const d = v.schedule_date as string;
			return w && d && (d < w.from || d > w.to) ? `Date must be within ${w.label} (${w.from} to ${w.to})` : null;
		},
	},
	{
		key: "class_schedule_color",
		label: "Calendar Colour",
		type: "select",
		options: COLORS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })),
	},
	{ key: "from_time", label: "From Time", type: "time", required: true },
	{
		key: "to_time",
		label: "To Time",
		type: "time",
		required: true,
		validate: (v) =>
			v.from_time && v.to_time && (v.to_time as string) <= (v.from_time as string) ? "To Time must be after From Time" : null,
	},
];

const emptyValues = (): Values => ({
	student_group: "",
	course: "",
	instructor: "",
	room: "",
	schedule_date: "",
	class_schedule_color: "",
	from_time: "",
	to_time: "",
});

// ---- filters (client-side over the loaded list) ----
const classFilter = ref("");
const sectionFilter = ref("");
const instructorFilter = ref("");
const dateFilter = ref<"" | "today" | "week" | "month" | "custom">("");
const from = ref("");
const to = ref("");

const classOptions = computed(() => [...new Set(rows.value.map((r) => r.program).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
const sectionOptions = computed(() =>
	[...new Set(rows.value.filter((r) => !classFilter.value || r.program === classFilter.value).map((r) => r.student_group))].sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true }),
	),
);
const instructorOptions = computed(() => [...new Set(rows.value.map((r) => r.instructor_name || r.instructor))].sort());
const dateError = computed(() => (dateFilter.value === "custom" && from.value && to.value && from.value > to.value ? "The 'from' date must be on or before the 'to' date." : null));

const shown = computed(() => {
	let range: { from_date: string; to_date: string } | null = null;
	if (dateFilter.value === "custom") {
		if ((from.value || to.value) && !dateError.value) range = { from_date: from.value || "0000-01-01", to_date: to.value || "9999-12-31" };
	} else if (dateFilter.value) range = periodRange(dateFilter.value);
	return rows.value.filter(
		(r) =>
			(!classFilter.value || r.program === classFilter.value) &&
			(!sectionFilter.value || r.student_group === sectionFilter.value) &&
			(!instructorFilter.value || (r.instructor_name || r.instructor) === instructorFilter.value) &&
			(!range || (r.schedule_date >= range.from_date && r.schedule_date <= range.to_date)),
	);
});
const filterCount = computed(() => [classFilter.value, sectionFilter.value, instructorFilter.value, dateFilter.value].filter(Boolean).length);
const clearFilters = () => {
	classFilter.value = sectionFilter.value = instructorFilter.value = dateFilter.value = "";
	from.value = to.value = "";
};

// ---- bulk "Schedule Course" (Frappe's Course Scheduling Tool) ----
const uid = useId();
const bulkOpen = ref(false);
const bulk = ref({ student_group: "", course: "", instructor: "", room: "", from_time: "", to_time: "", start_date: "", end_date: "", color: "", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as string[] });
const bulkWindow = computed(() => windowFor(bulk.value.student_group));
const bulkErrors = ref<Record<string, string>>({});
const bulkError = ref<string | null>(null);
const bulkBusy = ref(false);
const bulkResult = ref<{ created: number; skipped: { date: string; reason: string }[] } | null>(null);

const openBulk = () => {
	bulk.value = { ...bulk.value, student_group: "", course: "", instructor: "", room: rooms.value.length === 1 ? rooms.value[0].name : "", from_time: "", to_time: "", start_date: "", end_date: "", color: "" };
	bulkErrors.value = {};
	bulkError.value = null;
	bulkResult.value = null;
	bulkOpen.value = true;
};
const toggleDay = (d: string) => {
	bulk.value.days = bulk.value.days.includes(d) ? bulk.value.days.filter((x) => x !== d) : [...bulk.value.days, d];
};
const submitBulk = async () => {
	const b = bulk.value;
	const errs: Record<string, string> = {};
	for (const [k, label] of [["student_group", "Student Group"], ["course", "Course"], ["instructor", "Instructor"], ["room", "Room"], ["from_time", "From Time"], ["to_time", "To Time"], ["start_date", "Start Date"], ["end_date", "End Date"]] as const) {
		if (!b[k]) errs[k] = `${label} is required`;
	}
	if (!errs.to_time && b.to_time <= b.from_time) errs.to_time = "To Time must be after From Time";
	if (!errs.end_date && b.end_date < b.start_date) errs.end_date = "End date must be on or after the start date";
	if (!b.days.length) errs.days = "Pick at least one day";
	bulkErrors.value = errs;
	if (Object.keys(errs).length) {
		bulkError.value = "Please fix the highlighted fields.";
		return;
	}
	bulkError.value = null;
	bulkBusy.value = true;
	try {
		bulkResult.value = await api.createCourseSchedulesBulk({ student_group: b.student_group, course: b.course, instructor: b.instructor, room: b.room, from_time: b.from_time, to_time: b.to_time, start_date: b.start_date, end_date: b.end_date, days: b.days, class_schedule_color: b.color || undefined });
		await load();
	} catch (err) {
		bulkError.value = (err as Error).message;
	} finally {
		bulkBusy.value = false;
	}
};
const bulkInput = (k: string) => [inputClass, "w-full", bulkErrors.value[k] ? "border-danger!" : ""];
</script>

<template>
	<ResourcePage
		title="Course Schedule"
		singular="Course Schedule"
		description="Timetable entries: which section has which course, with which instructor, in which room and at what time"
		:rows="shown"
		:row-key="(r: CourseScheduleRow) => r.name"
		:row-label="(r: CourseScheduleRow) => `${r.course} · ${r.student_group} · ${r.schedule_date}`"
		search-placeholder="Search course, section or instructor..."
		:search-value="(r: CourseScheduleRow) => `${r.course} ${r.student_group} ${r.instructor_name} ${r.schedule_date}`"
		:empty-label="filterCount ? 'No schedules match these filters.' : 'No course schedules yet.'"
		:columns="[
			{ key: 'schedule_date', label: 'Date', sortable: true, value: (r: CourseScheduleRow) => r.schedule_date },
			{ key: 'time', label: 'Time', value: (r: CourseScheduleRow) => `${shortTime(r.from_time)} - ${shortTime(r.to_time)}` },
			{ key: 'student_group', label: 'Section', sortable: true, value: (r: CourseScheduleRow) => r.student_group },
			{ key: 'course', label: 'Course', sortable: true, value: (r: CourseScheduleRow) => r.course },
			{ key: 'instructor', label: 'Instructor', sortable: true, value: (r: CourseScheduleRow) => r.instructor_name || r.instructor },
			{ key: 'room', label: 'Room', value: (r: CourseScheduleRow) => r.room },
		]"
		:fields="fieldList()"
		:empty-values="emptyValues"
		:open-values="(): Values => (rooms.length === 1 ? { room: rooms[0].name } : {})"
		:reload="load"
		:on-create="(v) => api.createCourseSchedule({ student_group: v.student_group as string, course: v.course as string, instructor: v.instructor as string, room: v.room as string, schedule_date: v.schedule_date as string, from_time: v.from_time as string, to_time: v.to_time as string, class_schedule_color: (v.class_schedule_color as string) || undefined })"
		:load-for-edit="
			async (r: CourseScheduleRow) => {
				const rec = await api.getRecord('course_schedule', r.name);
				return {
					student_group: rec.student_group as string,
					course: rec.course as string,
					instructor: rec.instructor as string,
					room: rec.room as string,
					schedule_date: rec.schedule_date as string,
					class_schedule_color: rec.class_schedule_color as string,
					from_time: hhmm(rec.from_time as string),
					to_time: hhmm(rec.to_time as string),
				};
			}
		"
		:on-update="(r: CourseScheduleRow, v) => api.updateRecord('course_schedule', r.name, v)"
		:on-delete="(list: CourseScheduleRow[]) => api.deleteRecords('course_schedule', list.map((r) => r.name))"
	>
		<template #before-table>
			<div class="mb-3 flex justify-end">
				<button :class="btnGhost" @click="openBulk">Schedule Course (bulk)</button>
			</div>
		</template>
		<template #filters>
			<select v-model="classFilter" aria-label="Filter by class" :class="inputClass" @change="sectionFilter = ''">
				<option value="">All classes</option>
				<option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
			</select>
			<select v-model="sectionFilter" aria-label="Filter by section" :class="inputClass">
				<option value="">All sections</option>
				<option v-for="s in sectionOptions" :key="s" :value="s">{{ s }}</option>
			</select>
			<select v-model="instructorFilter" aria-label="Filter by instructor" :class="inputClass">
				<option value="">All instructors</option>
				<option v-for="i in instructorOptions" :key="i" :value="i">{{ i }}</option>
			</select>
			<select v-model="dateFilter" aria-label="Filter by date" :class="inputClass">
				<option value="">Any date</option>
				<option value="today">Today</option>
				<option value="week">This week</option>
				<option value="month">This month</option>
				<option value="custom">Custom range</option>
			</select>
			<template v-if="dateFilter === 'custom'">
				<input v-model="from" type="date" aria-label="From date" :max="to || undefined" :class="inputClass" />
				<input v-model="to" type="date" aria-label="To date" :min="from || undefined" :class="inputClass" />
			</template>
			<button v-if="filterCount" class="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/60 hover:bg-mint" @click="clearFilters">
				Clear filters ({{ filterCount }})
			</button>
			<span v-if="dateError" role="alert" class="w-full text-[12px] font-medium text-danger">{{ dateError }}</span>
		</template>
	</ResourcePage>

	<Modal v-if="bulkOpen" title="Schedule Course (bulk)" :busy="bulkBusy" @close="bulkOpen = false">
		<template v-if="bulkResult">
			<p class="rounded-xl bg-mint px-4 py-2.5 text-sm font-medium text-accent">{{ bulkResult.created }} schedule{{ bulkResult.created === 1 ? "" : "s" }} created.</p>
			<div v-if="bulkResult.skipped.length" class="mt-3">
				<p class="mb-2 text-sm font-medium text-danger">{{ bulkResult.skipped.length }} day{{ bulkResult.skipped.length === 1 ? "" : "s" }} skipped:</p>
				<ul class="max-h-48 overflow-y-auto text-sm">
					<li v-for="s in bulkResult.skipped" :key="s.date" class="border-b border-line-soft py-1.5"><span class="font-semibold">{{ s.date }}</span> - {{ s.reason }}</li>
				</ul>
			</div>
		</template>
		<form v-else :id="`${uid}-bulk`" novalidate @submit.prevent="submitBulk">
			<p class="mb-4 text-xs text-black/50">Creates one schedule for every ticked weekday between the two dates (both included). Fields marked <span class="font-semibold text-danger">*</span> are mandatory.</p>
			<div v-if="bulkError" role="alert" class="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">{{ bulkError }}</div>
			<div class="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
				<FormField :id="`${uid}-sg`" label="Student Group (Section)" required :error="bulkErrors.student_group">
					<select :id="`${uid}-sg`" v-model="bulk.student_group" :class="bulkInput('student_group')">
						<option value="">Select Student Group...</option>
						<option v-for="g in groups" :key="g.name" :value="g.name">{{ g.student_group_name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-co`" label="Course" required :error="bulkErrors.course">
					<select :id="`${uid}-co`" v-model="bulk.course" :class="bulkInput('course')">
						<option value="">Select Course...</option>
						<option v-for="c in courses" :key="c.name" :value="c.name">{{ c.course_name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-in`" label="Instructor" required :error="bulkErrors.instructor">
					<select :id="`${uid}-in`" v-model="bulk.instructor" :class="bulkInput('instructor')">
						<option value="">Select Instructor...</option>
						<option v-for="i in instructors" :key="i.name" :value="i.name">{{ i.instructor_name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-ro`" label="Room" required :error="bulkErrors.room">
					<select :id="`${uid}-ro`" v-model="bulk.room" :class="bulkInput('room')">
						<option value="">Select Room...</option>
						<option v-for="r in rooms" :key="r.name" :value="r.name">{{ r.room_name || r.name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-ft`" label="From Time" required :error="bulkErrors.from_time"><input :id="`${uid}-ft`" v-model="bulk.from_time" type="time" :class="bulkInput('from_time')" /></FormField>
				<FormField :id="`${uid}-tt`" label="To Time" required :error="bulkErrors.to_time"><input :id="`${uid}-tt`" v-model="bulk.to_time" type="time" :class="bulkInput('to_time')" /></FormField>
				<FormField :id="`${uid}-sd`" label="Course Start Date" required :error="bulkErrors.start_date" :help="bulkWindow ? `Allowed: ${bulkWindow.from} to ${bulkWindow.to} (${bulkWindow.label}).` : undefined"><input :id="`${uid}-sd`" v-model="bulk.start_date" type="date" :min="bulkWindow?.from" :max="bulkWindow?.to" :class="bulkInput('start_date')" /></FormField>
				<FormField :id="`${uid}-ed`" label="Course End Date" required :error="bulkErrors.end_date"><input :id="`${uid}-ed`" v-model="bulk.end_date" type="date" :min="bulkWindow?.from" :max="bulkWindow?.to" :class="bulkInput('end_date')" /></FormField>
				<FormField :id="`${uid}-cl`" label="Calendar Colour">
					<select :id="`${uid}-cl`" v-model="bulk.color" :class="bulkInput('color')">
						<option value="">Default</option>
						<option v-for="c in COLORS" :key="c" :value="c">{{ c[0].toUpperCase() + c.slice(1) }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-days`" label="Days" required :error="bulkErrors.days" full>
					<div :id="`${uid}-days`" class="flex flex-wrap gap-2">
						<label v-for="d in WEEKDAYS" :key="d" class="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]" :class="bulk.days.includes(d) ? 'border-accent bg-mint text-accent' : 'border-black/15 text-black/60'">
							<input type="checkbox" class="hidden" :checked="bulk.days.includes(d)" @change="toggleDay(d)" />{{ d }}
						</label>
					</div>
				</FormField>
			</div>
		</form>
		<template #footer>
			<template v-if="bulkResult"><button :class="btnPrimary" @click="bulkOpen = false">Close</button></template>
			<template v-else>
				<button type="button" :class="btnGhost" :disabled="bulkBusy" @click="bulkOpen = false">Cancel</button>
				<button type="submit" :form="`${uid}-bulk`" :class="btnPrimary" :disabled="bulkBusy">{{ bulkBusy ? "Scheduling..." : "Schedule Course" }}</button>
			</template>
		</template>
	</Modal>
</template>
