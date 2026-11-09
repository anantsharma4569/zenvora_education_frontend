<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import { btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import { formatDate } from "@/lib/format";
import type { FieldDef, Values } from "@/lib/resource";
import type { Slot } from "@/lib/types";
import ResourcePage from "@/components/ResourcePage.vue";
import Modal from "@/components/Modal.vue";
import FormField from "@/components/FormField.vue";

const COLORS = ["blue", "green", "red", "orange", "yellow", "teal", "violet", "cyan", "amber", "pink", "purple"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const { rows: sections } = useList(() => api.sections.list());
const { rows: classes } = useList(() => api.classes.list());
const { rows: subjects } = useList(() => api.subjects.list());
const { rows: staff } = useList(() => api.staff.list());
const { rows: rooms } = useList(() => api.rooms.list());
const { rows: terms } = useList(() => api.academicTerms.list());
const { rows: years } = useList(() => api.academicYears.list());

const teachers = computed(() => staff.value.filter((s) => s.isTeacher && s.status === "ACTIVE"));

// Lessons must fall inside the section's term, else its academic year (the API enforces it too).
const windowFor = (sectionId: string): { from: string; to: string; label: string } | null => {
	const s = sections.value.find((x) => x.id === sectionId);
	if (!s) return null;
	const t = s.academicTermId ? terms.value.find((x) => x.id === s.academicTermId) : undefined;
	if (t) return { from: t.startDate, to: t.endDate, label: t.name };
	const y = years.value.find((x) => x.id === s.academicYearId);
	return y ? { from: y.startDate, to: y.endDate, label: y.name } : null;
};

const fieldList = (): FieldDef[] => [
	{
		key: "sectionId",
		label: "Section",
		type: "select",
		required: true,
		options: sections.value.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name, group: s.class.name })),
	},
	{ key: "subjectId", label: "Subject", type: "select", required: true, options: subjects.value.map((c) => ({ value: c.id, label: c.name })) },
	{ key: "teacherId", label: "Teacher", type: "select", required: true, options: teachers.value.map((t) => ({ value: t.id, label: t.name })) },
	{ key: "roomId", label: "Room", type: "select", required: true, options: rooms.value.map((r) => ({ value: r.id, label: r.name })) },
	{
		key: "date",
		label: "Date",
		type: "date",
		required: true,
		min: (v) => windowFor(v.sectionId as string)?.from,
		max: (v) => windowFor(v.sectionId as string)?.to,
		help: (v) => {
			const w = windowFor(v.sectionId as string);
			return w ? `Must fall in ${w.label}: ${formatDate(w.from)} to ${formatDate(w.to)}.` : "Pick a section to see its allowed dates.";
		},
		validate: (v) => {
			const w = windowFor(v.sectionId as string);
			const d = v.date as string;
			return w && d && (d < w.from || d > w.to) ? `Date must be within ${w.label}` : null;
		},
	},
	{
		key: "color",
		label: "Calendar Colour",
		type: "select",
		placeholder: "Default",
		options: COLORS.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })),
	},
	{ key: "startTime", label: "From Time", type: "time", required: true },
	{
		key: "endTime",
		label: "To Time",
		type: "time",
		required: true,
		validate: (v) => (v.startTime && v.endTime && (v.endTime as string) <= (v.startTime as string) ? "To Time must be after From Time" : null),
	},
];

const emptyValues = (): Values => ({ sectionId: "", subjectId: "", teacherId: "", roomId: "", date: "", color: "", startTime: "", endTime: "" });
const slotBody = (v: Values) => ({
	sectionId: v.sectionId as string,
	subjectId: v.subjectId as string,
	teacherId: v.teacherId as string,
	roomId: v.roomId as string,
	date: v.date as string,
	startTime: v.startTime as string,
	endTime: v.endTime as string,
	color: (v.color as string) || null,
});

// ---- filters: sent to the API, so only the lessons asked for are loaded ----
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rangeOf = (p: string): { from: string; to: string } | null => {
	const now = new Date();
	const start = new Date(now);
	if (p === "today") return { from: iso(now), to: iso(now) };
	if (p === "week" || p === "next") {
		start.setDate(now.getDate() - ((now.getDay() + 6) % 7) + (p === "next" ? 7 : 0));
		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		return { from: iso(start), to: iso(end) };
	}
	if (p === "month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
	return null;
};

const classFilter = ref("");
const sectionFilter = ref("");
const teacherFilter = ref("");
const dateFilter = ref<"today" | "week" | "next" | "month" | "custom">("week");
const from = ref("");
const to = ref("");
const dateError = computed(() => (dateFilter.value === "custom" && from.value && to.value && from.value > to.value ? "The 'from' date must be on or before the 'to' date." : null));

const rows = ref<Slot[]>([]);
const load = async () => {
	if (dateError.value) return;
	const range = dateFilter.value === "custom" ? { from: from.value || undefined, to: to.value || undefined } : rangeOf(dateFilter.value);
	rows.value = await api.schedule
		.list({ classId: classFilter.value || undefined, sectionId: sectionFilter.value || undefined, teacherId: teacherFilter.value || undefined, ...range })
		.catch(() => rows.value);
};
watch([classFilter, sectionFilter, teacherFilter, dateFilter, from, to], load, { immediate: true });

const sectionOptions = computed(() => sections.value.filter((s) => !classFilter.value || s.classId === classFilter.value));
const filterCount = computed(() => [classFilter.value, sectionFilter.value, teacherFilter.value].filter(Boolean).length + (dateFilter.value !== "week" ? 1 : 0));
const clearFilters = () => {
	classFilter.value = sectionFilter.value = teacherFilter.value = "";
	dateFilter.value = "week";
	from.value = to.value = "";
};

// ---- bulk scheduling: one lesson on every ticked weekday between two dates ----
const uid = useId();
const bulkOpen = ref(false);
const emptyBulk = () => ({ sectionId: "", subjectId: "", teacherId: "", roomId: "", startTime: "", endTime: "", startDate: "", endDate: "", color: "", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });
const bulk = ref(emptyBulk());
const bulkWindow = computed(() => windowFor(bulk.value.sectionId));
const bulkErrors = ref<Record<string, string>>({});
const bulkError = ref<string | null>(null);
const bulkBusy = ref(false);
const bulkResult = ref<{ created: number; skipped: { date: string; reason: string }[] } | null>(null);

const openBulk = () => {
	bulk.value = { ...emptyBulk(), days: bulk.value.days, roomId: rooms.value.length === 1 ? rooms.value[0]!.id : "" };
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
	const required = [["sectionId", "Section"], ["subjectId", "Subject"], ["teacherId", "Teacher"], ["roomId", "Room"], ["startTime", "From Time"], ["endTime", "To Time"], ["startDate", "Start Date"], ["endDate", "End Date"]] as const;
	for (const [k, label] of required) if (!b[k]) errs[k] = `${label} is required`;
	if (!errs.endTime && b.endTime <= b.startTime) errs.endTime = "To Time must be after From Time";
	if (!errs.endDate && b.endDate < b.startDate) errs.endDate = "End date must be on or after the start date";
	if (!b.days.length) errs.days = "Pick at least one day";
	bulkErrors.value = errs;
	if (Object.keys(errs).length) {
		bulkError.value = "Please fix the highlighted fields.";
		return;
	}
	bulkError.value = null;
	bulkBusy.value = true;
	try {
		bulkResult.value = await api.schedule.bulk({
			sectionId: b.sectionId,
			subjectId: b.subjectId,
			teacherId: b.teacherId,
			roomId: b.roomId,
			startTime: b.startTime,
			endTime: b.endTime,
			startDate: b.startDate,
			endDate: b.endDate,
			days: b.days,
			color: b.color || null,
		});
		await load();
	} catch (err) {
		bulkError.value = (err as Error).message;
	} finally {
		bulkBusy.value = false;
	}
};
const bulkInput = (k: string) => [inputClass, "w-full", bulkErrors.value[k] ? "border-danger!" : ""];
const label = (r: Slot) => `${r.subject.name} · ${r.section.name} · ${formatDate(r.date)} ${r.startTime}`;
</script>

<template>
	<ResourcePage
		title="Course Schedule"
		singular="Lesson"
		description="Timetable entries: which section has which subject, with which teacher, in which room and when. Clashes are refused."
		:rows="rows"
		:row-key="(r: Slot) => r.id"
		:row-label="label"
		search-placeholder="Search subject, section or teacher..."
		:search-value="(r: Slot) => `${r.subject.name} ${r.section.name} ${r.teacher.name} ${r.room.name}`"
		:empty-label="filterCount ? 'No lessons match these filters.' : 'No lessons this week.'"
		:columns="[
			{ key: 'date', label: 'Date', sortable: true, value: (r: Slot) => `${r.date} ${r.startTime}` },
			{ key: 'time', label: 'Time', value: (r: Slot) => `${r.startTime} - ${r.endTime}` },
			{ key: 'section', label: 'Section', sortable: true, value: (r: Slot) => r.section.name },
			{ key: 'subject', label: 'Subject', sortable: true, value: (r: Slot) => r.subject.name },
			{ key: 'teacher', label: 'Teacher', sortable: true, value: (r: Slot) => r.teacher.name },
			{ key: 'room', label: 'Room', value: (r: Slot) => r.room.name },
		]"
		:fields="fieldList()"
		:empty-values="emptyValues"
		:open-values="(): Values => ({ ...(rooms.length === 1 ? { roomId: rooms[0]!.id } : {}), ...(sectionFilter ? { sectionId: sectionFilter } : {}) })"
		:reload="load"
		:on-create="(v) => api.schedule.create(slotBody(v))"
		:load-for-edit="
			async (r: Slot) => ({
				sectionId: r.section.id,
				subjectId: r.subject.id,
				teacherId: r.teacher.id,
				roomId: r.room.id,
				date: r.date,
				color: r.color ?? '',
				startTime: r.startTime,
				endTime: r.endTime,
			})
		"
		:on-update="(r: Slot, v) => api.schedule.update(r.id, slotBody(v))"
		:on-delete="(list: Slot[]) => deleteEach(list, label, (r) => api.schedule.remove(r.id))"
	>
		<template #before-table>
			<div class="mb-3 flex justify-end">
				<button :class="btnGhost" @click="openBulk">Schedule a subject (bulk)</button>
			</div>
		</template>
		<template #cell-date="{ row }">{{ formatDate(row.date) }}</template>
		<template #filters>
			<select v-model="dateFilter" aria-label="Filter by date" :class="inputClass">
				<option value="today">Today</option>
				<option value="week">This week</option>
				<option value="next">Next week</option>
				<option value="month">This month</option>
				<option value="custom">Custom range</option>
			</select>
			<template v-if="dateFilter === 'custom'">
				<input v-model="from" type="date" aria-label="From date" :max="to || undefined" :class="inputClass" />
				<input v-model="to" type="date" aria-label="To date" :min="from || undefined" :class="inputClass" />
			</template>
			<select v-model="classFilter" aria-label="Filter by class" :class="inputClass" @change="sectionFilter = ''">
				<option value="">All classes</option>
				<option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
			</select>
			<select v-model="sectionFilter" aria-label="Filter by section" :class="inputClass">
				<option value="">All sections</option>
				<option v-for="s in sectionOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
			</select>
			<select v-model="teacherFilter" aria-label="Filter by teacher" :class="inputClass">
				<option value="">All teachers</option>
				<option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
			</select>
			<button v-if="filterCount" class="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/60 hover:bg-mint" @click="clearFilters">
				Clear filters ({{ filterCount }})
			</button>
			<span v-if="dateError" role="alert" class="w-full text-[12px] font-medium text-danger">{{ dateError }}</span>
		</template>
	</ResourcePage>

	<Modal v-if="bulkOpen" title="Schedule a subject (bulk)" :busy="bulkBusy" @close="bulkOpen = false">
		<template v-if="bulkResult">
			<p class="rounded-xl bg-mint px-4 py-2.5 text-sm font-medium text-accent">{{ bulkResult.created }} lesson{{ bulkResult.created === 1 ? "" : "s" }} created.</p>
			<div v-if="bulkResult.skipped.length" class="mt-3">
				<p class="mb-2 text-sm font-medium text-danger">{{ bulkResult.skipped.length }} day{{ bulkResult.skipped.length === 1 ? "" : "s" }} skipped:</p>
				<ul class="max-h-48 overflow-y-auto text-sm">
					<li v-for="s in bulkResult.skipped" :key="s.date" class="border-b border-line-soft py-1.5"><span class="font-semibold">{{ formatDate(s.date) }}</span>: {{ s.reason }}</li>
				</ul>
			</div>
		</template>
		<form v-else :id="`${uid}-bulk`" novalidate @submit.prevent="submitBulk">
			<p class="mb-4 text-xs text-black/50">
				Creates one lesson on every ticked weekday between the two dates (both included). Days that would clash are skipped and listed.
				Fields marked <span class="font-semibold text-danger">*</span> are mandatory.
			</p>
			<div v-if="bulkError" role="alert" class="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">{{ bulkError }}</div>
			<div class="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
				<FormField :id="`${uid}-sg`" label="Section" required :error="bulkErrors.sectionId">
					<select :id="`${uid}-sg`" v-model="bulk.sectionId" :class="bulkInput('sectionId')">
						<option value="">Select section...</option>
						<option v-for="s in sections.filter((x) => x.isActive)" :key="s.id" :value="s.id">{{ s.name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-co`" label="Subject" required :error="bulkErrors.subjectId">
					<select :id="`${uid}-co`" v-model="bulk.subjectId" :class="bulkInput('subjectId')">
						<option value="">Select subject...</option>
						<option v-for="c in subjects" :key="c.id" :value="c.id">{{ c.name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-in`" label="Teacher" required :error="bulkErrors.teacherId">
					<select :id="`${uid}-in`" v-model="bulk.teacherId" :class="bulkInput('teacherId')">
						<option value="">Select teacher...</option>
						<option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-ro`" label="Room" required :error="bulkErrors.roomId">
					<select :id="`${uid}-ro`" v-model="bulk.roomId" :class="bulkInput('roomId')">
						<option value="">Select room...</option>
						<option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-ft`" label="From Time" required :error="bulkErrors.startTime"><input :id="`${uid}-ft`" v-model="bulk.startTime" type="time" :class="bulkInput('startTime')" /></FormField>
				<FormField :id="`${uid}-tt`" label="To Time" required :error="bulkErrors.endTime"><input :id="`${uid}-tt`" v-model="bulk.endTime" type="time" :class="bulkInput('endTime')" /></FormField>
				<FormField
					:id="`${uid}-sd`"
					label="Start Date"
					required
					:error="bulkErrors.startDate"
					:help="bulkWindow ? `Allowed: ${formatDate(bulkWindow.from)} to ${formatDate(bulkWindow.to)} (${bulkWindow.label}).` : undefined"
				>
					<input :id="`${uid}-sd`" v-model="bulk.startDate" type="date" :min="bulkWindow?.from" :max="bulkWindow?.to" :class="bulkInput('startDate')" />
				</FormField>
				<FormField :id="`${uid}-ed`" label="End Date" required :error="bulkErrors.endDate">
					<input :id="`${uid}-ed`" v-model="bulk.endDate" type="date" :min="bulkWindow?.from" :max="bulkWindow?.to" :class="bulkInput('endDate')" />
				</FormField>
				<FormField :id="`${uid}-cl`" label="Calendar Colour">
					<select :id="`${uid}-cl`" v-model="bulk.color" :class="bulkInput('color')">
						<option value="">Default</option>
						<option v-for="c in COLORS" :key="c" :value="c">{{ c[0]!.toUpperCase() + c.slice(1) }}</option>
					</select>
				</FormField>
				<FormField :id="`${uid}-days`" label="Days" required :error="bulkErrors.days" full>
					<div :id="`${uid}-days`" class="flex flex-wrap gap-2">
						<label
							v-for="d in WEEKDAYS"
							:key="d"
							class="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]"
							:class="bulk.days.includes(d) ? 'border-accent bg-mint text-accent' : 'border-black/15 text-black/60'"
						>
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
				<button type="submit" :form="`${uid}-bulk`" :class="btnPrimary" :disabled="bulkBusy">{{ bulkBusy ? "Scheduling..." : "Schedule" }}</button>
			</template>
		</template>
	</Modal>
</template>
