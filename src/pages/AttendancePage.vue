<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import { PERIODS, periodRange, type Period } from "@/lib/period";
import { inputClass } from "@/lib/styles";
import type { EmployeeAttendanceRow, StudentAttendanceRow } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";
import EmptyState from "@/components/EmptyState.vue";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import AttendanceTable from "./attendance/AttendanceTable.vue";

const STUDENT_STATUSES = ["Present", "Absent", "Leave"];
const EMPLOYEE_STATUSES = ["Present", "Absent", "On Leave", "Half Day", "Work From Home"];

const route = useRoute();
const { role } = storeToRefs(useSession());
const canFilter = computed(() => role.value === "admin" || role.value === "teacher");
const isAdmin = computed(() => role.value === "admin");

const kind = ref<"students" | "employees">(route.query.kind === "employees" ? "employees" : "students");
const status = ref(typeof route.query.status === "string" ? route.query.status : "");
const period = ref<Period>("today");
const customFrom = ref("");
const customTo = ref("");
const program = ref("");
const section = ref("");
const employee = ref("");

const studentRows = ref<StudentAttendanceRow[] | null>(null);
const employeeRows = ref<EmployeeAttendanceRow[] | null>(null);
const error = ref<string | null>(null);

// Admin-only lookups feeding the Class / Section / Employee dropdowns.
const { rows: programs, load: loadPrograms } = useList(api.listPrograms, false);
const { rows: groups, load: loadGroups } = useList(api.listStudentGroups, false);
const staff = ref<{ employee: string; employee_name: string }[]>([]);
watch(
	role,
	(r) => {
		if (r !== "admin") return;
		loadPrograms();
		loadGroups();
		api
			.getStaffDirectory()
			.then((d) => (staff.value = [...d.teachingStaff, ...d.nonTeachingStaff].sort((a, b) => a.employee_name.localeCompare(b.employee_name))))
			.catch(() => undefined);
	},
	{ immediate: true },
);

const sortedPrograms = computed(() =>
	[...programs.value].sort((a, b) => {
		const na = parseInt(a.program_name.match(/\d+/)?.[0] ?? "0", 10);
		const nb = parseInt(b.program_name.match(/\d+/)?.[0] ?? "0", 10);
		return na - nb || a.program_name.localeCompare(b.program_name);
	}),
);

// A teacher has no lookup API, so their Section list is whatever sections appear in their own data.
const seenSections = ref<string[]>([]);
const sectionOptions = computed(() => {
	if (isAdmin.value) {
		const list = groups.value.filter((g) => !program.value || g.program === program.value);
		return list.map((g) => g.name).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
	}
	return seenSections.value;
});

const rangeError = computed(() =>
	period.value === "custom" && customFrom.value && customTo.value && customFrom.value > customTo.value
		? "The 'from' date must be on or before the 'to' date."
		: null,
);
const range = computed<{ from_date?: string; to_date?: string } | null>(() => {
	if (period.value === "all") return {};
	if (period.value !== "custom") return periodRange(period.value);
	if (!customFrom.value || !customTo.value || rangeError.value) return null; // incomplete: don't fetch yet
	return { from_date: customFrom.value, to_date: customTo.value };
});

let seq = 0;
watch(
	[kind, status, period, customFrom, customTo, program, section, employee, canFilter],
	() => {
		if (!canFilter.value || !range.value) return;
		const mine = ++seq;
		error.value = null;
		const base = { ...range.value, status: status.value || undefined };
		if (kind.value === "students") {
			studentRows.value = null;
			api
				.getStudentAttendance({ ...base, program: program.value || undefined, student_group: section.value || undefined })
				.then((v) => {
					if (mine !== seq) return;
					studentRows.value = v;
					if (!section.value && !isAdmin.value) seenSections.value = [...new Set(v.map((r) => r.student_group))].sort();
				})
				.catch((err) => mine === seq && (error.value = err.message));
		} else {
			employeeRows.value = null;
			api
				.getEmployeeAttendance({ ...base, employee: employee.value || undefined })
				.then((v) => mine === seq && (employeeRows.value = v))
				.catch((err) => mine === seq && (error.value = err.message));
		}
	},
	{ immediate: true },
);

// Section belongs to a Class: clear it when the Class changes; status options differ per tab.
watch(program, () => (section.value = ""));
watch(kind, () => (status.value = ""));

const studentColumns: DataTableColumn<StudentAttendanceRow>[] = [
	{ key: "student_name", label: "Student", sortable: true, value: (r) => r.student_name },
	{ key: "student_group", label: "Class / Section", sortable: true, value: (r) => r.student_group },
	{ key: "date", label: "Date", sortable: true, value: (r) => r.date },
	{ key: "status", label: "Status", sortable: true, value: (r) => r.status },
];
const employeeColumns: DataTableColumn<EmployeeAttendanceRow>[] = [
	{ key: "employee_name", label: "Employee", sortable: true, value: (r) => r.employee_name },
	{ key: "department", label: "Department", sortable: true, value: (r) => r.department || "-" },
	{ key: "attendance_date", label: "Date", sortable: true, value: (r) => r.attendance_date },
	{ key: "status", label: "Status", sortable: true, value: (r) => r.status },
];

const periodLabel = computed(() => {
	if (period.value === "custom") return customFrom.value && customTo.value ? `${customFrom.value} to ${customTo.value}` : "pick a date range";
	return PERIODS.find((p) => p.key === period.value)!.label.toLowerCase();
});
const count = computed(() => (kind.value === "students" ? studentRows.value : employeeRows.value)?.length);
const emptyLabel = computed(
	() => `No ${kind.value === "students" ? "student" : "employee"} attendance${status.value ? ` marked ${status.value.toLowerCase()}` : ""} for ${periodLabel.value}.`,
);

const pill = "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors";
const tabCls = (on: boolean) =>
	`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${on ? "border-accent text-accent" : "border-transparent text-black/50 hover:text-black"}`;
</script>

<template>
	<div v-if="canFilter">
		<PageHeader title="Attendance" :subtitle="`Showing ${periodLabel}`" />

		<div class="mb-4 flex gap-2 border-b border-line">
			<button :class="tabCls(kind === 'students')" @click="kind = 'students'">
				{{ isAdmin ? "Student Attendance" : "My Class Attendance" }}
			</button>
			<button :class="tabCls(kind === 'employees')" @click="kind = 'employees'">
				{{ isAdmin ? "Employee Attendance" : "My Attendance" }}
			</button>
		</div>

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
				:row-key="(r) => r.name"
				:columns="studentColumns"
				search-placeholder="Search student..."
				:search-value="(r) => `${r.student_name} ${r.student}`"
				:empty-label="emptyLabel"
			>
				<template #filters>
					<select v-model="status" aria-label="Filter by status" :class="inputClass">
						<option value="">All statuses</option>
						<option v-for="s in STUDENT_STATUSES" :key="s" :value="s">{{ s }}</option>
					</select>
					<select v-if="isAdmin" v-model="program" aria-label="Filter by class" :class="inputClass">
						<option value="">All classes</option>
						<option v-for="p in sortedPrograms" :key="p.name" :value="p.name">{{ p.program_name }}</option>
					</select>
					<select v-if="sectionOptions.length" v-model="section" aria-label="Filter by section" :class="inputClass">
						<option value="">All sections</option>
						<option v-for="g in sectionOptions" :key="g" :value="g">{{ g }}</option>
					</select>
					<span class="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-accent">{{ count }} records</span>
				</template>
			</DataTable>
			<DataTable
				v-else
				:rows="employeeRows!"
				:row-key="(r) => r.name"
				:columns="employeeColumns"
				search-placeholder="Search employee..."
				:search-value="(r) => r.employee_name"
				:empty-label="emptyLabel"
			>
				<template #filters>
					<select v-model="status" aria-label="Filter by status" :class="inputClass">
						<option value="">All statuses</option>
						<option v-for="s in EMPLOYEE_STATUSES" :key="s" :value="s">{{ s }}</option>
					</select>
					<select v-if="isAdmin" v-model="employee" aria-label="Filter by employee" :class="inputClass">
						<option value="">All employees</option>
						<option v-for="e in staff" :key="e.employee" :value="e.employee">{{ e.employee_name }}</option>
					</select>
					<span class="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-accent">{{ count }} records</span>
				</template>
			</DataTable>
		</template>
	</div>

	<div v-else>
		<PageHeader title="Attendance" />
		<div v-if="role === 'student'">
			<h2 class="mb-3 text-sm font-medium text-black/60">My Attendance</h2>
			<AttendanceTable :fetch="() => api.getMyAttendance()" :columns="[{ label: 'Date', key: 'date' }, { label: 'Group', key: 'student_group' }, { label: 'Status', key: 'status' }]" empty="No attendance recorded yet." />
		</div>
		<EmptyState v-else label="Attendance is not part of the Accounts view." />
	</div>
</template>
