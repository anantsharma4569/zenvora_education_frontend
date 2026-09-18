<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSession } from "@/stores/session";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import AttendanceTable from "./attendance/AttendanceTable.vue";
import { api } from "@/lib/api";

const { role } = storeToRefs(useSession());

const employeeCols = [
	{ label: "Employee", key: "employee_name" },
	{ label: "Date", key: "attendance_date" },
	{ label: "Status", key: "status" },
];
const studentCols = [
	{ label: "Student", key: "student_name" },
	{ label: "Group", key: "student_group" },
	{ label: "Date", key: "date" },
	{ label: "Status", key: "status" },
];
const myCols = [
	{ label: "Date", key: "date" },
	{ label: "Group", key: "student_group" },
	{ label: "Status", key: "status" },
];
</script>

<template>
	<div>
		<PageHeader title="Attendance" />

		<div v-if="role === 'admin'" class="flex flex-col gap-8">
			<div>
				<h2 class="mb-3 text-sm font-medium text-black/60">Employee Attendance</h2>
				<AttendanceTable :fetch="() => api.getEmployeeAttendance()" :columns="employeeCols" empty="No employee attendance records." />
			</div>
			<div>
				<h2 class="mb-3 text-sm font-medium text-black/60">Student Attendance</h2>
				<AttendanceTable :fetch="() => api.getStudentAttendance()" :columns="studentCols" empty="No student attendance records." />
			</div>
		</div>

		<div v-else-if="role === 'teacher'" class="flex flex-col gap-8">
			<div>
				<h2 class="mb-3 text-sm font-medium text-black/60">My Class Attendance</h2>
				<AttendanceTable :fetch="() => api.getStudentAttendance()" :columns="studentCols" empty="No student attendance records." />
			</div>
			<div>
				<h2 class="mb-3 text-sm font-medium text-black/60">My Attendance</h2>
				<AttendanceTable :fetch="() => api.getEmployeeAttendance()" :columns="employeeCols" empty="No employee attendance records." />
			</div>
		</div>

		<div v-else-if="role === 'student'">
			<h2 class="mb-3 text-sm font-medium text-black/60">My Attendance</h2>
			<AttendanceTable :fetch="() => api.getMyAttendance()" :columns="myCols" empty="No attendance recorded yet." />
		</div>

		<EmptyState v-else label="Attendance is not part of the Accounts view." />
	</div>
</template>
