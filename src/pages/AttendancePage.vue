<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { PERIODS, periodRange, type Period } from "@/lib/period";
import { inputClass } from "@/lib/styles";
import { formatDate, titleCase } from "@/lib/format";
import type { Ref as NamedRef, StaffAttendance, StaffAttendanceStatus, StudentAttendance, StudentAttendanceStatus } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";
import EmptyState from "@/components/EmptyState.vue";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import AttendanceTable from "./attendance/AttendanceTable.vue";
import MarkStudents from "./attendance/MarkStudents.vue";
import MarkStaff from "./attendance/MarkStaff.vue";

const STUDENT_STATUSES: StudentAttendanceStatus[] = ["PRESENT", "ABSENT", "LEAVE"];
const STAFF_STATUSES: StaffAttendanceStatus[] = ["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY", "WORK_FROM_HOME"];

const route = useRoute();
const { role } = storeToRefs(useSession());
const canFilter = computed(() => role.value === "admin" || role.value === "teacher");
const isAdmin = computed(() => role.value === "admin");

type Tab = "students" | "employees" | "mark-students" | "mark-staff";
const initialTab = (): Tab => {
	const k = route.query.kind;
	return k === "employees" || k === "mark-students" || k === "mark-staff" ? k : "students";
};
const kind = ref<Tab>(initialTab());
const status = ref(typeof route.query.status === "string" ? route.query.status.toUpperCase() : "");
const period = ref<Period>("today");
const customFrom = ref("");
const customTo = ref("");
const classId = ref("");
const sectionId = ref("");
const staffId = ref("");

const studentRows = ref<StudentAttendance[] | null>(null);
const employeeRows = ref<StaffAttendance[] | null>(null);
const error = ref<string | null>(null);

// Classes and sections to filter and mark by: everything for admins, the sections they teach
// for teachers (the API decides).
const classes = ref<NamedRef[]>([]);
const sections = ref<(NamedRef & { classId: string })[]>([]);
const staff = ref<NamedRef[]>([]);
watch(
	canFilter,
	(ok) => {
		if (!ok) return;
		api.timetable
			.options()
			.then((o) => {
				classes.value = o.classes;
				sections.value = o.sections;
			})
			.catch(() => undefined);
		if (isAdmin.value) {
			api.staff
				.list()
				.then((list) => (staff.value = list.map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name))))
				.catch(() => undefined);
		}
	},
	{ immediate: true },
);

const sectionOptions = computed(() => sections.value.filter((s) => !classId.value || s.classId === classId.value));

const rangeError = computed(() =>
	period.value === "custom" && customFrom.value && customTo.value && customFrom.value > customTo.value
		? "The 'from' date must be on or before the 'to' date."
		: null,
);
const range = computed<{ from?: string; to?: string } | null>(() => {
	if (period.value === "all") return {};
	if (period.value !== "custom") {
		const r = periodRange(period.value);
		return { from: r.from_date, to: r.to_date };
	}
	if (!customFrom.value || !customTo.value || rangeError.value) return null; // incomplete: don't fetch yet
	return { from: customFrom.value, to: customTo.value };
});

let seq = 0;
const loadRecords = () => {
	if (!canFilter.value || !range.value || kind.value.startsWith("mark")) return;
	const mine = ++seq;
	error.value = null;
	if (kind.value === "students") {
		studentRows.value = null;
		api.attendance
			.students({
				...range.value,
				status: (status.value || undefined) as StudentAttendanceStatus | undefined,
				classId: classId.value || undefined,
				sectionId: sectionId.value || undefined,
			})
			.then((v) => mine === seq && (studentRows.value = v))
			.catch((err) => mine === seq && (error.value = err.message));
	} else {
		employeeRows.value = null;
		api.attendance
			.staff({ ...range.value, status: (status.value || undefined) as StaffAttendanceStatus | undefined, staffId: staffId.value || undefined })
			.then((v) => mine === seq && (employeeRows.value = v))
			.catch((err) => mine === seq && (error.value = err.message));
	}
};
watch([kind, status, period, customFrom, customTo, classId, sectionId, staffId, canFilter], loadRecords, { immediate: true });

// A section belongs to a class: clear it when the class changes; statuses differ per tab.
watch(classId, () => (sectionId.value = ""));
watch(kind, () => (status.value = ""));

const studentColumns: DataTableColumn<StudentAttendance>[] = [
	{ key: "student", label: "Student", sortable: true, value: (r) => r.student?.name ?? "" },
	{ key: "section", label: "Section", sortable: true, value: (r) => r.section.name },
	{ key: "date", label: "Date", sortable: true, value: (r) => r.date },
	{ key: "status", label: "Status", sortable: true, value: (r) => titleCase(r.status) },
];
const employeeColumns: DataTableColumn<StaffAttendance>[] = [
	{ key: "staff", label: "Name", sortable: true, value: (r) => r.staff.name },
	{ key: "department", label: "Department", sortable: true, value: (r) => r.department.name },
	{ key: "date", label: "Date", sortable: true, value: (r) => r.date },
	{ key: "status", label: "Status", sortable: true, value: (r) => titleCase(r.status) },
];

const periodLabel = computed(() => {
	if (period.value === "custom") return customFrom.value && customTo.value ? `${formatDate(customFrom.value)} to ${formatDate(customTo.value)}` : "pick a date range";
	return PERIODS.find((p) => p.key === period.value)!.label.toLowerCase();
});
const count = computed(() => (kind.value === "students" ? studentRows.value : employeeRows.value)?.length);
const emptyLabel = computed(
	() => `No ${kind.value === "students" ? "student" : "staff"} attendance${status.value ? ` marked ${titleCase(status.value).toLowerCase()}` : ""} for ${periodLabel.value}.`,
);

const pill = "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors";
const tabCls = (on: boolean) =>
	`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${on ? "border-accent text-accent" : "border-transparent text-black/50 hover:text-black"}`;
const statusCls = (s: string) =>
	s === "PRESENT" ? "bg-mint text-accent" : s === "ABSENT" ? "bg-danger/10 text-danger" : "bg-amber-100 text-amber-800";

const myRows = () =>
	api.attendance.mine().then((rows) => rows.map((r) => ({ name: r.id, date: formatDate(r.date), section: r.section.name, status: titleCase(r.status) })));
</script>

<template>
	<div v-if="canFilter">
		<PageHeader title="Attendance" :subtitle="kind.startsWith('mark') ? 'Take attendance for a day' : `Showing ${periodLabel}`" />

		<div class="mb-4 flex gap-2 overflow-x-auto border-b border-line">
			<button :class="tabCls(kind === 'students')" @click="kind = 'students'">{{ isAdmin ? "Student Attendance" : "My Class Attendance" }}</button>
			<button :class="tabCls(kind === 'employees')" @click="kind = 'employees'">{{ isAdmin ? "Staff Attendance" : "My Attendance" }}</button>
			<button :class="tabCls(kind === 'mark-students')" @click="kind = 'mark-students'">Mark students</button>
			<button v-if="isAdmin" :class="tabCls(kind === 'mark-staff')" @click="kind = 'mark-staff'">Mark staff</button>
		</div>

		<MarkStudents v-if="kind === 'mark-students'" :sections="sections" />
		<MarkStaff v-else-if="kind === 'mark-staff'" />

		<template v-else>
			<div class="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Period">
				<button
					v-for="p in PERIODS"
					:key="p.key"
					:class="[pill, period === p.key ? 'border-accent bg-accent text-white' : 'border-black/15 text-black/70 hover:bg-mint']"
					@click="period = p.key"
				>
					{{ p.label }}
				</button>
				<template v-if="period === 'custom'">
					<label class="ml-2 flex items-center gap-1.5 text-[13px] text-black/60">
						From
						<input v-model="customFrom" type="date" aria-label="From date" :max="customTo || undefined" :class="inputClass" />
					</label>
					<label class="flex items-center gap-1.5 text-[13px] text-black/60">
						To
						<input v-model="customTo" type="date" aria-label="To date" :min="customFrom || undefined" :class="inputClass" />
					</label>
				</template>
			</div>
			<p v-if="rangeError" role="alert" class="mb-3 text-[12px] font-medium text-danger">{{ rangeError }}</p>
			<p v-else-if="period === 'custom' && !range" class="mb-3 text-[12.5px] text-black/50">Pick both dates to load the list.</p>

			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="range && (kind === 'students' ? !studentRows : !employeeRows)" />
			<EmptyState v-else-if="!range" label="Choose a from and to date." />
			<template v-else>
				<DataTable
					v-if="kind === 'students'"
					:rows="studentRows!"
					:row-key="(r) => r.id"
					:columns="studentColumns"
					search-placeholder="Search student..."
					:search-value="(r) => r.student?.name ?? ''"
					:empty-label="emptyLabel"
				>
					<template #filters>
						<select v-model="status" aria-label="Filter by status" :class="inputClass">
							<option value="">All statuses</option>
							<option v-for="s in STUDENT_STATUSES" :key="s" :value="s">{{ titleCase(s) }}</option>
						</select>
						<select v-if="classes.length > 1" v-model="classId" aria-label="Filter by class" :class="inputClass">
							<option value="">All classes</option>
							<option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
						</select>
						<select v-if="sectionOptions.length" v-model="sectionId" aria-label="Filter by section" :class="inputClass">
							<option value="">All sections</option>
							<option v-for="s in sectionOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
						</select>
						<span class="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-accent">{{ count }} records</span>
					</template>
					<template #cell-date="{ row }">{{ formatDate(row.date) }}</template>
					<template #cell-status="{ row }">
						<span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusCls(row.status)">{{ titleCase(row.status) }}</span>
					</template>
				</DataTable>
				<DataTable
					v-else
					:rows="employeeRows!"
					:row-key="(r) => r.id"
					:columns="employeeColumns"
					search-placeholder="Search staff..."
					:search-value="(r) => r.staff.name"
					:empty-label="emptyLabel"
				>
					<template #filters>
						<select v-model="status" aria-label="Filter by status" :class="inputClass">
							<option value="">All statuses</option>
							<option v-for="s in STAFF_STATUSES" :key="s" :value="s">{{ titleCase(s) }}</option>
						</select>
						<select v-if="isAdmin" v-model="staffId" aria-label="Filter by person" :class="inputClass">
							<option value="">All staff</option>
							<option v-for="e in staff" :key="e.id" :value="e.id">{{ e.name }}</option>
						</select>
						<span class="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-accent">{{ count }} records</span>
					</template>
					<template #cell-date="{ row }">{{ formatDate(row.date) }}</template>
					<template #cell-status="{ row }">
						<span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusCls(row.status)">{{ titleCase(row.status) }}</span>
					</template>
				</DataTable>
			</template>
		</template>
	</div>

	<div v-else>
		<PageHeader title="Attendance" />
		<div v-if="role === 'student'">
			<h2 class="mb-3 text-sm font-medium text-black/60">My attendance (last 30 days)</h2>
			<AttendanceTable
				:fetch="myRows"
				:columns="[
					{ label: 'Date', key: 'date' },
					{ label: 'Section', key: 'section' },
					{ label: 'Status', key: 'status' },
				]"
				empty="No attendance recorded yet."
			/>
		</div>
		<EmptyState v-else label="Attendance is not part of the Accounts view." />
	</div>
</template>
