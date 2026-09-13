const FRAPPE_URL = process.env.NEXT_PUBLIC_FRAPPE_URL || "http://localhost:8002";

function extractErrorMessage(status: number, body: string): string {
	try {
		const parsed = JSON.parse(body);
		if (typeof parsed.message === "string") return parsed.message;
		if (parsed._server_messages) {
			const messages = JSON.parse(parsed._server_messages) as string[];
			const first = JSON.parse(messages[0]);
			if (first.message) return first.message;
		}
		if (parsed.exception) return String(parsed.exception).split("\n").pop() || parsed.exception;
	} catch {
		// fall through to raw body
	}
	return `Request failed (${status})`;
}

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
		throw new Error(extractErrorMessage(response.status, body));
	}

	const json = await response.json();
	return json.message as T;
}

import type {
	AcademicYearRow,
	CourseRow,
	DashboardData,
	EmployeeAttendanceRow,
	EmployeeRow,
	FeeRow,
	ProgramRow,
	ResultRow,
	Session,
	StudentAttendanceRow,
	StudentRow,
} from "./types";

export const api = {
	getSession: () => callMethod<Session>("zenvora_education.api.auth.get_session"),

	login: (usr: string, pwd: string) => callMethod<string>("login", { usr, pwd }, { method: "POST" }),

	logout: () => callMethod("logout", {}, { method: "POST" }),

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

	listStudents: (params?: { search?: string }) =>
		callMethod<StudentRow[]>("zenvora_education.api.student.list_students", params),

	getResults: (params?: { student_group?: string }) =>
		callMethod<ResultRow[]>("zenvora_education.api.exam.get_results", params),

	getMyResults: () => callMethod<ResultRow[]>("zenvora_education.api.exam.get_my_results"),

	getFees: (params?: { student?: string }) => callMethod<FeeRow[]>("zenvora_education.api.fees.get_fees", params),

	getMyFees: () => callMethod<FeeRow[]>("zenvora_education.api.fees.get_my_fees"),

	createStudent: (params: {
		first_name: string;
		student_email_id: string;
		program: string;
		academic_year: string;
		last_name?: string;
		date_of_birth?: string;
		gender?: string;
		academic_term?: string;
	}) => callMethod("zenvora_education.api.student.create_student", params, { method: "POST" }),

	listPrograms: () => callMethod<ProgramRow[]>("zenvora_education.api.student.list_programs"),

	listAcademicYears: () => callMethod<AcademicYearRow[]>("zenvora_education.api.student.list_academic_years"),
};
