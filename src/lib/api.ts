// Empty = same origin (Vite proxies /api in dev; the built app is served next to Frappe).
const FRAPPE_URL = (import.meta.env.VITE_FRAPPE_URL as string | undefined) || "";

function extractErrorMessage(status: number, body: string): { message: string; sessionExpired: boolean } {
	try {
		const parsed = JSON.parse(body);
		// Frappe sets this explicit flag when the request had no valid session. Separately,
		// a request whose cookie no longer resolves to a real user (e.g. Redis/session cache
		// cleared by a backend restart) fails whitelisting entirely: status 403, exc_type
		// PermissionError, no session_expired flag, and often a *second*, more useful message
		// buried behind a generic "User None not found" one - both cases mean the same thing:
		// "please log in again", not "here's what was wrong with the form".
		if (parsed.session_expired || (status === 403 && parsed.exc_type === "PermissionError")) {
			return { message: "Your session has expired. Please log in again.", sessionExpired: true };
		}
		// _server_messages (msgprint-raised errors, e.g. our own frappe.throw calls) is the
		// most reliable source - check it first. `message` alone can be a stray leftover from
		// unrelated request handling (e.g. Frappe sets a login-status "message" during session
		// setup that has nothing to do with this request) and must not take priority when a
		// real error is also present.
		if (parsed._server_messages) {
			// Frappe queues informational toasts ("Document renamed...", alert: 1) in the same
			// list as real errors. Skip those, and prefer the last remaining message - the one
			// actually raised - over earlier generic ones.
			const parsedMessages = (JSON.parse(parsed._server_messages) as string[]).map((m) => JSON.parse(m));
			const errors = parsedMessages.filter((m) => m.message && !m.alert);
			const chosen = errors.length ? errors[errors.length - 1] : parsedMessages[0];
			if (chosen?.message) return { message: chosen.message, sessionExpired: false };
		}
		if (typeof parsed.message === "string") return { message: parsed.message, sessionExpired: false };
		if (parsed.exception) {
			return { message: String(parsed.exception).split("\n").pop() || parsed.exception, sessionExpired: false };
		}
	} catch {
		// fall through to raw body
	}
	return { message: `Request failed (${status})`, sessionExpired: false };
}

// Frappe rejects cookie-session POSTs that lack the session's CSRF token once one exists.
let csrfToken: string | null = null;

async function refreshCsrfToken(): Promise<string | null> {
	try {
		const url = new URL(`${FRAPPE_URL}/api/method/zenvora_education.api.auth.get_session`, window.location.origin);
		const res = await fetch(url.toString(), { credentials: "include" });
		csrfToken = ((await res.json()).message?.csrf_token as string | null | undefined) ?? null;
	} catch {
		csrfToken = null;
	}
	return csrfToken;
}

async function callMethod<T>(
	method: string,
	params: Record<string, unknown> = {},
	options: { method?: "GET" | "POST" } = {},
	retried = false,
): Promise<T> {
	const httpMethod = options.method || "GET";
	const url = new URL(`${FRAPPE_URL}/api/method/${method}`, window.location.origin);

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

	if (httpMethod === "POST" && method !== "login" && method !== "logout") {
		if (!csrfToken) await refreshCsrfToken();
		if (csrfToken) (init.headers as Record<string, string>)["X-Frappe-CSRF-Token"] = csrfToken;
	}

	const response = await fetch(url.toString(), init);
	if (!response.ok) {
		const body = await response.text();
		// A stale token (new login, session rotated): fetch a fresh one and retry once.
		if (httpMethod === "POST" && !retried && response.status === 400 && body.includes("CSRFTokenError")) {
			await refreshCsrfToken();
			return callMethod<T>(method, params, options, true);
		}
		const { message, sessionExpired } = extractErrorMessage(response.status, body);
		if (sessionExpired && window.location.pathname !== "/login") {
			window.location.href = "/login";
		}
		throw new Error(message);
	}

	const json = await response.json();
	return json.message as T;
}

import type {
	AcademicTermRow,
	AcademicYearRow,
	CompanyRow,
	CourseRow,
	CourseScheduleRow,
	DashboardData,
	DepartmentRow,
	DesignationRow,
	EmployeeAttendanceRow,
	EmployeeDetail,
	FeeCategoryRow,
	FeeRow,
	FeeStructureRow,
	InstructorRow,
	ProgramRow,
	ResultRow,
	RoomRow,
	Session,
	StaffMember,
	StudentAttendanceRow,
	StudentDetail,
	StudentGroupRow,
	StudentRow,
	TimetableOptions,
	TimetableRow,
} from "./types";

export const api = {
	getSession: () => callMethod<Session>("zenvora_education.api.auth.get_session"),

	login: (usr: string, pwd: string) => {
		csrfToken = null; // new session, new token
		return callMethod<string>("login", { usr, pwd }, { method: "POST" });
	},

	logout: () => {
		csrfToken = null;
		return callMethod("logout", {}, { method: "POST" });
	},

	getDashboard: () => callMethod<DashboardData>("zenvora_education.api.dashboard.get_dashboard"),

	getEmployeeAttendance: (params?: { employee?: string; from_date?: string; to_date?: string; status?: string }) =>
		callMethod<EmployeeAttendanceRow[]>("zenvora_education.api.attendance.get_employee_attendance", params),

	getStudentAttendance: (params?: {
		student_group?: string;
		date?: string;
		status?: string;
		from_date?: string;
		to_date?: string;
		program?: string;
		student?: string;
	}) =>
		callMethod<StudentAttendanceRow[]>("zenvora_education.api.attendance.get_student_attendance", params),

	getMyAttendance: (params?: { from_date?: string; to_date?: string }) =>
		callMethod<StudentAttendanceRow[]>("zenvora_education.api.attendance.get_my_attendance", params),

	markStudentAttendance: (student_group: string, date: string, attendance: { student: string; status: string }[]) =>
		callMethod<string[]>(
			"zenvora_education.api.attendance.mark_student_attendance",
			{ student_group, date, attendance },
			{ method: "POST" },
		),

	createEmployee: (params: {
		first_name: string;
		gender: string;
		date_of_birth: string;
		department: string;
		designation: string;
		date_of_joining: string;
		company: string;
		last_name?: string;
		personal_email?: string;
		is_instructor?: boolean;
		password?: string;
	}) => callMethod("zenvora_education.api.employee.create_employee", params, { method: "POST" }),

	getStaffDirectory: (params?: { company?: string; status?: "Active" | "Inactive" | "all" }) =>
		callMethod<{ teaching_staff: StaffMember[]; non_teaching_staff: StaffMember[] }>(
			"zenvora_education.api.staff.get_staff_directory",
			params ?? {},
		).then((res) => ({ teachingStaff: res.teaching_staff, nonTeachingStaff: res.non_teaching_staff })),

	getEmployeeDetail: (employee: string) =>
		callMethod<EmployeeDetail>("zenvora_education.api.staff.get_employee_detail", { employee }),

	listCourses: (params?: { department?: string }) =>
		callMethod<CourseRow[]>("zenvora_education.api.course.list_courses", params),

	createCourse: (params: { course_name: string; department?: string; description?: string }) =>
		callMethod("zenvora_education.api.course.create_course", params, { method: "POST" }),

	listStudents: (params?: { search?: string; program?: string; student_group?: string }) =>
		callMethod<StudentRow[]>("zenvora_education.api.student.list_students", params),

	getStudentDetail: (name: string) =>
		callMethod<StudentDetail>("zenvora_education.api.student.get_student_detail", { name }),

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
		student_group?: string;
	}) => callMethod("zenvora_education.api.student.create_student", params, { method: "POST" }),

	listPrograms: () => callMethod<ProgramRow[]>("zenvora_education.api.settings.list_programs"),

	createProgram: (params: { program_name: string; department?: string }) =>
		callMethod("zenvora_education.api.settings.create_program", params, { method: "POST" }),

	listAcademicYears: () => callMethod<AcademicYearRow[]>("zenvora_education.api.settings.list_academic_years"),

	createAcademicYear: (params: { academic_year_name: string; year_start_date: string; year_end_date: string }) =>
		callMethod("zenvora_education.api.settings.create_academic_year", params, { method: "POST" }),

	listAcademicTerms: (params?: { academic_year?: string }) =>
		callMethod<AcademicTermRow[]>("zenvora_education.api.settings.list_academic_terms", params),

	createAcademicTerm: (params: {
		academic_year: string;
		term_name: string;
		term_start_date: string;
		term_end_date: string;
	}) => callMethod("zenvora_education.api.settings.create_academic_term", params, { method: "POST" }),

	getRecord: (resource: string, name: string) =>
		callMethod<Record<string, string | Array<Record<string, string>>>>("zenvora_education.api.crud.get_record", {
			resource,
			name,
		}),

	updateRecord: (resource: string, name: string, values: Record<string, unknown>) =>
		callMethod<string>("zenvora_education.api.crud.update_record", { resource, name, values }, { method: "POST" }),

	deleteRecords: (resource: string, names: string[]) =>
		callMethod<{ name: string; ok: boolean; message: string }[]>(
			"zenvora_education.api.crud.delete_records",
			{ resource, names },
			{ method: "POST" },
		),

	listInstructors: () => callMethod<InstructorRow[]>("zenvora_education.api.schedule.list_instructors"),

	listRooms: () => callMethod<RoomRow[]>("zenvora_education.api.schedule.list_rooms"),

	getTimetableOptions: () => callMethod<TimetableOptions>("zenvora_education.api.timetable.get_timetable_options"),
	getTimetable: (student_group: string, from_date: string, to_date: string) =>
		callMethod<TimetableRow[]>("zenvora_education.api.timetable.get_timetable", { student_group, from_date, to_date }),
	getMyTimetable: (from_date: string, to_date: string) =>
		callMethod<TimetableRow[]>("zenvora_education.api.timetable.get_my_timetable", { from_date, to_date }),

	listCourseSchedules: () =>
		callMethod<CourseScheduleRow[]>("zenvora_education.api.schedule.list_course_schedules"),

	createCourseSchedule: (params: {
		student_group: string;
		course: string;
		instructor: string;
		room: string;
		schedule_date: string;
		from_time: string;
		to_time: string;
		class_schedule_color?: string;
	}) => callMethod("zenvora_education.api.schedule.create_course_schedule", params, { method: "POST" }),

	createCourseSchedulesBulk: (params: {
		student_group: string;
		course: string;
		instructor: string;
		room: string;
		from_time: string;
		to_time: string;
		start_date: string;
		end_date: string;
		days: string[];
		class_schedule_color?: string;
	}) =>
		callMethod<{ created: number; skipped: { date: string; reason: string }[] }>(
			"zenvora_education.api.schedule.create_course_schedules_bulk",
			params,
			{ method: "POST" },
		),

	listCompanies: () => callMethod<CompanyRow[]>("zenvora_education.api.settings.list_companies"),

	listDesignations: () => callMethod<DesignationRow[]>("zenvora_education.api.staff.list_designations"),

	listDepartments: () => callMethod<DepartmentRow[]>("zenvora_education.api.settings.list_departments"),

	createDepartment: (params: { department_name: string; company?: string }) =>
		callMethod("zenvora_education.api.settings.create_department", params, { method: "POST" }),

	listStudentGroups: () => callMethod<StudentGroupRow[]>("zenvora_education.api.settings.list_student_groups"),

	createStudentGroup: (params: {
		student_group_name: string;
		program: string;
		academic_year: string;
		academic_term?: string;
		max_strength?: number;
	}) => callMethod("zenvora_education.api.settings.create_student_group", params, { method: "POST" }),

	listFeeCategories: () => callMethod<FeeCategoryRow[]>("zenvora_education.api.settings.list_fee_categories"),

	createFeeCategory: (params: { category_name: string }) =>
		callMethod("zenvora_education.api.settings.create_fee_category", params, { method: "POST" }),

	listFeeStructures: () => callMethod<FeeStructureRow[]>("zenvora_education.api.settings.list_fee_structures"),

	createFeeStructure: (params: {
		program: string;
		academic_year: string;
		academic_term?: string;
		components: { fees_category: string; amount: number }[];
	}) => callMethod("zenvora_education.api.settings.create_fee_structure", params, { method: "POST" }),
};
