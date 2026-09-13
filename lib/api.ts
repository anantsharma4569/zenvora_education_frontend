const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "http://school.localhost:8000";

async function callMethod<T>(
	method: string,
	params: Record<string, unknown> = {},
	options: { method?: "GET" | "POST" } = {},
): Promise<T> {
	const httpMethod = options.method || "GET";
	const url = new URL(`${FRAPPE_URL}/api/method/${method}`);

	const init: RequestInit = {
		method: httpMethod,
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	};

	if (httpMethod === "GET") {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}
	} else {
		init.body = JSON.stringify(params);
	}

	const response = await fetch(url.toString(), init);
	if (!response.ok) {
		const body = await response.text();
		throw new Error(`${method} failed (${response.status}): ${body}`);
	}

	const json = await response.json();
	return json.message as T;
}

import type { CourseRow, DashboardData, EmployeeAttendanceRow, EmployeeRow, StudentAttendanceRow } from "./types";

export const api = {
	getDashboard: () => callMethod<DashboardData>("zenvora_education.api.dashboard.get_dashboard"),

	getEmployeeAttendance: (params?: { employee?: string; from_date?: string; to_date?: string }) =>
		callMethod<EmployeeAttendanceRow[]>("zenvora_education.api.attendance.get_employee_attendance", params),

	getStudentAttendance: (params?: { student_group?: string; date?: string }) =>
		callMethod<StudentAttendanceRow[]>("zenvora_education.api.attendance.get_student_attendance", params),

	getMyAttendance: (params?: { from_date?: string; to_date?: string }) =>
		callMethod<StudentAttendanceRow[]>("zenvora_education.api.attendance.get_my_attendance", params),

	markStudentAttendance: (student_group: string, date: string, attendance: { student: string; status: string }[]) =>
		callMethod<string[]>(
			"zenvora_education.api.attendance.mark_student_attendance",
			{ student_group, date, attendance },
			{ method: "POST" },
		),

	listEmployees: (params?: { department?: string }) =>
		callMethod<EmployeeRow[]>("zenvora_education.api.employee.list_employees", params),

	createEmployee: (params: {
		employee_name: string;
		department: string;
		designation: string;
		date_of_joining: string;
		company: string;
		personal_email?: string;
		is_instructor?: boolean;
	}) => callMethod("zenvora_education.api.employee.create_employee", params, { method: "POST" }),

	listCourses: (params?: { department?: string }) =>
		callMethod<CourseRow[]>("zenvora_education.api.course.list_courses", params),

	createCourse: (params: { course_name: string; department?: string; description?: string }) =>
		callMethod("zenvora_education.api.course.create_course", params, { method: "POST" }),
};
