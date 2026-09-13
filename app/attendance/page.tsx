"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import type { EmployeeAttendanceRow, StudentAttendanceRow } from "@/lib/types";

export default function AttendancePage() {
	const { role } = useRole();

	return (
		<div>
			<PageHeader title="Attendance" />

			{role === "admin" && (
				<div className="flex flex-col gap-8">
					<Section title="Employee Attendance">
						<EmployeeAttendanceTable />
					</Section>
					<Section title="Student Attendance">
						<StudentAttendanceTable />
					</Section>
				</div>
			)}

			{role === "teacher" && (
				<div className="flex flex-col gap-8">
					<Section title="My Class Attendance">
						<StudentAttendanceTable />
					</Section>
					<Section title="My Attendance">
						<EmployeeAttendanceTable />
					</Section>
				</div>
			)}

			{role === "student" && (
				<Section title="My Attendance">
					<MyAttendanceTable />
				</Section>
			)}

			{role === "accounts" && (
				<EmptyState label="Attendance is not part of the Accounts view." />
			)}
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div>
			<h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">{title}</h2>
			{children}
		</div>
	);
}

function EmployeeAttendanceTable() {
	const [rows, setRows] = useState<EmployeeAttendanceRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.getEmployeeAttendance().then(setRows).catch((err) => setError(err.message));
	}, []);

	if (error) return <ErrorState message={error} />;
	if (!rows) return <LoadingState />;
	if (rows.length === 0) return <EmptyState label="No employee attendance records." />;

	return (
		<table className="w-full text-left text-sm">
			<thead className="text-black/50 dark:text-white/50">
				<tr>
					<th className="py-2">Employee</th>
					<th className="py-2">Date</th>
					<th className="py-2">Status</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.name} className="border-t border-black/10 dark:border-white/10">
						<td className="py-2">{row.employee_name}</td>
						<td className="py-2">{row.attendance_date}</td>
						<td className="py-2">{row.status}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function StudentAttendanceTable() {
	const [rows, setRows] = useState<StudentAttendanceRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.getStudentAttendance().then(setRows).catch((err) => setError(err.message));
	}, []);

	if (error) return <ErrorState message={error} />;
	if (!rows) return <LoadingState />;
	if (rows.length === 0) return <EmptyState label="No student attendance records." />;

	return (
		<table className="w-full text-left text-sm">
			<thead className="text-black/50 dark:text-white/50">
				<tr>
					<th className="py-2">Student</th>
					<th className="py-2">Group</th>
					<th className="py-2">Date</th>
					<th className="py-2">Status</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.name} className="border-t border-black/10 dark:border-white/10">
						<td className="py-2">{row.student_name}</td>
						<td className="py-2">{row.student_group}</td>
						<td className="py-2">{row.date}</td>
						<td className="py-2">{row.status}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function MyAttendanceTable() {
	const [rows, setRows] = useState<StudentAttendanceRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.getMyAttendance().then(setRows).catch((err) => setError(err.message));
	}, []);

	if (error) return <ErrorState message={error} />;
	if (!rows) return <LoadingState />;
	if (rows.length === 0) return <EmptyState label="No attendance recorded yet." />;

	return (
		<table className="w-full text-left text-sm">
			<thead className="text-black/50 dark:text-white/50">
				<tr>
					<th className="py-2">Date</th>
					<th className="py-2">Group</th>
					<th className="py-2">Status</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.name} className="border-t border-black/10 dark:border-white/10">
						<td className="py-2">{row.date}</td>
						<td className="py-2">{row.student_group}</td>
						<td className="py-2">{row.status}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
