// Client for the Zenvora API. In development Vite proxies /api to the API (vite.config.ts); in
// production the school's site serves /api from the same origin. Sign-in uses httpOnly cookies
// set by the API, so this file never sees a token.
import type {
	AcademicTerm,
	AcademicYear,
	DashboardData,
	Department,
	Designation,
	Exam,
	FeeCategory,
	FeeStructure,
	Invoice,
	InvoiceDetail,
	InvoiceStatus,
	MarksSheet,
	Me,
	PaymentMethod,
	PersonStatus,
	Result,
	Room,
	SchoolBranding,
	SchoolClass,
	SchoolProfile,
	Section,
	Slot,
	Staff,
	StaffAttendance,
	StaffAttendanceStatus,
	StaffSheet,
	Student,
	StudentAttendance,
	StudentAttendanceStatus,
	StudentSheet,
	Subject,
	TimetableOptions,
} from "./types";
import type { DeleteResult } from "./resource";

const BASE = "/api/v1";

/** An error from the API. `fields` maps form fields to messages for validation errors. */
export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string,
		readonly fields: Record<string, string> = {},
	) {
		super(message);
	}
}

type Query = Record<string, string | number | boolean | null | undefined>;

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, however many requests found the access token expired. */
function refreshSession(): Promise<boolean> {
	refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
		.then((r) => r.ok)
		.catch(() => false)
		.finally(() => setTimeout(() => (refreshing = null), 0));
	return refreshing;
}

const AUTH_PAGES = ["/login", "/impersonate"];

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown } = {}, retried = false): Promise<T> {
	const url = new URL(BASE + path, window.location.origin);
	for (const [k, v] of Object.entries(opts.query ?? {})) {
		if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
	}
	let res: Response;
	try {
		res = await fetch(url, {
			method,
			credentials: "include",
			headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		});
	} catch {
		throw new ApiError("Cannot reach the server. Check your connection and try again.", 0, "NETWORK");
	}
	if (res.status === 204) return undefined as T;

	const data = await res.json().catch(() => ({}));
	if (res.ok) return data as T;

	const code: string = data.code ?? "ERROR";
	// An expired access token is refreshed once; any other 401 means signed out.
	if (res.status === 401 && (code === "TOKEN_EXPIRED" || code === "UNAUTHENTICATED") && !retried && !path.startsWith("/auth/")) {
		if (await refreshSession()) return request<T>(method, path, opts, true);
		if (!AUTH_PAGES.includes(window.location.pathname)) {
			window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
		}
	}
	const fields: Record<string, string> = data.fields ?? {};
	// Forms show one message, so a validation error carries its field messages.
	const detail = Object.values(fields).join(". ");
	throw new ApiError(detail && code === "VALIDATION_FAILED" ? detail : (data.message ?? `Request failed (${res.status})`), res.status, code, fields);
}

const get = <T>(path: string, query?: Query) => request<T>("GET", path, { query });
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, { body: body ?? {} });
const put = <T>(path: string, body: unknown) => request<T>("PUT", path, { body });
const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, { body });
const del = (path: string) => request<void>("DELETE", path);

/**
 * Deletes records one by one and reports each outcome, so a record still in use (409) is
 * listed with its reason while the rest go through.
 */
export async function deleteEach<R>(rows: R[], label: (r: R) => string, remove: (r: R) => Promise<unknown>): Promise<DeleteResult[]> {
	const out: DeleteResult[] = [];
	for (const r of rows) {
		try {
			await remove(r);
			out.push({ name: label(r), ok: true, message: "" });
		} catch (e) {
			out.push({ name: label(r), ok: false, message: (e as Error).message });
		}
	}
	return out;
}

/** CRUD for the simple settings resources. */
function resource<Row, Create, Update = Partial<Create>>(path: string) {
	return {
		list: (query?: Query) => get<Row[]>(path, query),
		create: (body: Create) => post<Row>(path, body),
		update: (id: string, body: Update) => patch<Row>(`${path}/${id}`, body),
		remove: (id: string) => del(`${path}/${id}`),
	};
}

export type Nullable<T> = { [K in keyof T]: T[K] | null };

export const api = {
	// ── Auth ──────────────────────────────────────────────────────────────────
	auth: {
		me: () => get<Me>("/auth/me"),
		login: (email: string, password: string, schoolCode?: string) =>
			post<{ scope: string }>("/auth/login", { email, password, schoolCode: schoolCode || undefined }),
		logout: () => post<void>("/auth/logout"),
		impersonate: (ticket: string) => post<{ scope: string }>("/auth/impersonate", { ticket }),
	},

	// ── Public (before sign-in) ───────────────────────────────────────────────
	site: () => get<{ portal: "STAFF" | "STUDENT"; school: SchoolBranding }>("/public/site-config"),
	schoolByCode: (code: string) => get<SchoolBranding>(`/public/schools/${encodeURIComponent(code)}`),

	// ── School ────────────────────────────────────────────────────────────────
	profile: () => get<SchoolProfile>("/school/profile"),
	dashboard: () => get<DashboardData>("/school/dashboard"),

	departments: resource<Department, { name: string }>("/school/departments"),
	designations: resource<Designation, { name: string; isTeaching?: boolean }>("/school/designations"),
	academicYears: resource<AcademicYear, { name: string; startDate: string; endDate: string }>("/school/academic-years"),
	academicTerms: resource<
		AcademicTerm,
		{ academicYearId: string; name: string; startDate: string; endDate: string },
		{ name?: string; startDate?: string; endDate?: string }
	>("/school/academic-terms"),
	classes: resource<SchoolClass, { name: string; departmentId?: string | null }>("/school/classes"),
	sections: resource<
		Section,
		{ name: string; classId: string; academicYearId: string; academicTermId?: string | null; maxStrength?: number | null },
		{ name?: string; academicTermId?: string | null; maxStrength?: number | null; isActive?: boolean }
	>("/school/sections"),
	subjects: resource<Subject, { name: string; departmentId?: string | null; description?: string | null }>("/school/subjects"),
	rooms: resource<Room, { name: string; number?: string | null; capacity?: number | null }>("/school/rooms"),
	feeCategories: resource<FeeCategory, { name: string }>("/school/fee-categories"),
	feeStructures: {
		...resource<
			FeeStructure,
			{ classId: string; academicYearId: string; academicTermId?: string | null; items: { feeCategoryId: string; amount: number }[] },
			{ academicTermId?: string | null; items?: { feeCategoryId: string; amount: number }[] }
		>("/school/fee-structures"),
		get: (id: string) => get<FeeStructure>(`/school/fee-structures/${id}`),
	},

	staff: {
		list: (q?: { status?: PersonStatus | "all" }) => get<Staff[]>("/school/staff", q),
		get: (id: string) => get<Staff>(`/school/staff/${id}`),
		create: (body: StaffInput & { login?: { password: string; role?: "SCHOOL_ADMIN" | "TEACHER" | "ACCOUNTANT" } }) =>
			post<Staff>("/school/staff", body),
		update: (id: string, body: Partial<StaffInput> & { status?: PersonStatus }) => patch<Staff>(`/school/staff/${id}`, body),
		disable: (id: string) => del(`/school/staff/${id}`),
	},
	students: {
		list: (q?: { classId?: string; sectionId?: string; academicYearId?: string; status?: PersonStatus | "all"; search?: string }) =>
			get<Student[]>("/school/students", q),
		get: (id: string) => get<Student>(`/school/students/${id}`),
		create: (body: StudentInput & { academicYearId: string }) => post<Student>("/school/students", body),
		update: (id: string, body: Partial<StudentInput> & { status?: PersonStatus }) => patch<Student>(`/school/students/${id}`, body),
		disable: (id: string) => del(`/school/students/${id}`),
	},

	schedule: {
		list: (q?: { sectionId?: string; classId?: string; teacherId?: string; from?: string; to?: string }) => get<Slot[]>("/school/schedule", q),
		window: (sectionId: string) => get<{ from: string; to: string; label: string }>(`/school/schedule/window/${sectionId}`),
		create: (body: SlotInput) => post<Slot>("/school/schedule", body),
		bulk: (body: Omit<SlotInput, "date"> & { startDate: string; endDate: string; days: string[] }) =>
			post<{ created: number; skipped: { date: string; reason: string }[] }>("/school/schedule/bulk", body),
		update: (id: string, body: Partial<SlotInput>) => patch<Slot>(`/school/schedule/${id}`, body),
		remove: (id: string) => del(`/school/schedule/${id}`),
	},
	timetable: {
		options: () => get<TimetableOptions>("/school/timetable/options"),
		section: (sectionId: string, from: string, to: string) => get<Slot[]>("/school/timetable", { sectionId, from, to }),
		mine: (from: string, to: string) => get<Slot[]>("/school/timetable/mine", { from, to }),
	},

	attendance: {
		students: (q?: {
			from?: string;
			to?: string;
			status?: StudentAttendanceStatus;
			classId?: string;
			sectionId?: string;
			studentId?: string;
		}) => get<StudentAttendance[]>("/school/attendance/students", q),
		studentSheet: (sectionId: string, date: string) => get<StudentSheet>("/school/attendance/students/sheet", { sectionId, date }),
		markStudents: (sectionId: string, date: string, entries: { studentId: string; status: StudentAttendanceStatus }[]) =>
			put<{ saved: number }>("/school/attendance/students", { sectionId, date, entries }),
		staff: (q?: { from?: string; to?: string; status?: StaffAttendanceStatus; staffId?: string }) =>
			get<StaffAttendance[]>("/school/attendance/staff", q),
		staffSheet: (date: string) => get<StaffSheet>("/school/attendance/staff/sheet", { date }),
		markStaff: (date: string, entries: { staffId: string; status: StaffAttendanceStatus }[]) =>
			put<{ saved: number }>("/school/attendance/staff", { date, entries }),
		mine: (q?: { from?: string; to?: string }) => get<StudentAttendance[]>("/school/attendance/mine", q),
	},

	exams: {
		list: () => get<Exam[]>("/school/exams"),
		gradeScale: () => get<{ min: number; grade: string }[]>("/school/exams/grade-scale"),
		create: (body: ExamInput) => post<Exam>("/school/exams", body),
		update: (id: string, body: Partial<ExamInput> & { isPublished?: boolean }) => patch<Exam>(`/school/exams/${id}`, body),
		remove: (id: string) => del(`/school/exams/${id}`),
		marks: (examId: string, sectionId: string, subjectId: string) => get<MarksSheet>(`/school/exams/${examId}/marks`, { sectionId, subjectId }),
		saveMarks: (examId: string, body: { sectionId: string; subjectId: string; maxScore: number; entries: { studentId: string; score: number | null }[] }) =>
			put<{ saved: number; cleared: number }>(`/school/exams/${examId}/marks`, body),
	},
	results: {
		list: (q?: { examId?: string; classId?: string; sectionId?: string; subjectId?: string }) => get<Result[]>("/school/results", q),
		mine: () => get<Result[]>("/school/results/mine"),
	},

	fees: {
		invoices: (q?: { status?: InvoiceStatus; classId?: string; studentId?: string; feeStructureId?: string; overdue?: boolean; search?: string }) =>
			get<Invoice[]>("/school/fees/invoices", q),
		invoice: (id: string) => get<InvoiceDetail>(`/school/fees/invoices/${id}`),
		generate: (body: { feeStructureId: string; dueDate: string; issueDate?: string }) =>
			post<{ created: number; alreadyBilled: number; totalPerStudent: number }>("/school/fees/invoices/generate", body),
		pay: (id: string, body: { amount: number; method: PaymentMethod; reference?: string | null; paidOn: string }) =>
			post<{ paid: number; outstanding: number; status: InvoiceStatus }>(`/school/fees/invoices/${id}/payments`, body),
		cancel: (id: string) => post<void>(`/school/fees/invoices/${id}/cancel`),
		mine: () => get<Invoice[]>("/school/fees/mine"),
	},
};

export interface StaffInput {
	firstName: string;
	lastName?: string | null;
	gender: string;
	dateOfBirth: string;
	departmentId: string;
	designationId: string;
	dateOfJoining: string;
	email?: string | null;
	phone?: string | null;
	isTeacher?: boolean;
}

export interface StudentInput {
	firstName: string;
	lastName?: string | null;
	email?: string | null;
	admissionNo?: string | null;
	dateOfBirth?: string | null;
	gender?: string | null;
	classId: string;
	sectionId?: string | null;
}

export interface SlotInput {
	sectionId: string;
	subjectId: string;
	teacherId: string;
	roomId: string;
	date: string;
	startTime: string;
	endTime: string;
	color?: string | null;
}

export interface ExamInput {
	name: string;
	academicYearId: string;
	academicTermId?: string | null;
	startDate?: string | null;
	endDate?: string | null;
}
