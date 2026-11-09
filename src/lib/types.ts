// Shapes returned by the Zenvora API (api.zenvora.com/api/v1). Ids are UUIDs, dates are
// "YYYY-MM-DD", times "HH:MM", and money is in paise (₹1 = 100).

export type Role = "admin" | "teacher" | "accounts" | "student";
export type SchoolRole = "SCHOOL_ADMIN" | "TEACHER" | "ACCOUNTANT" | "STUDENT" | "PARENT";

/** A reference to another record, as nested in most responses. */
export interface Ref {
	id: string;
	name: string;
}

export interface Me {
	id: string;
	email: string;
	name: string;
	phone: string | null;
	currentRole: SchoolRole | null;
	currentSchoolId: string | null;
	memberships: { role: SchoolRole; school: { id: string; code: string; name: string; logoUrl: string | null } }[];
	/** Set while a Zenvora platform admin is signed in as this user. */
	impersonatedBy: { id: string; name: string; email: string; endsAt: string | null } | null;
}

export interface SchoolBranding {
	id: string;
	code: string;
	name: string;
	logoUrl: string | null;
	primaryColor: string | null;
}

export interface SchoolProfile extends SchoolBranding {
	timezone: string;
	currency: string;
	plan: { name: string; features: string[] } | null;
}

// ── Academic setup ──────────────────────────────────────────────────────────

export interface Department extends Ref {
	staffCount: number;
	classCount: number;
}

export interface Designation extends Ref {
	isTeaching: boolean;
}

export interface AcademicYear extends Ref {
	startDate: string;
	endDate: string;
}

export interface AcademicTerm extends Ref {
	academicYearId: string;
	academicYear: Ref;
	startDate: string;
	endDate: string;
}

export interface SchoolClass extends Ref {
	departmentId: string | null;
	department: Ref | null;
	sectionCount: number;
}

export interface Section extends Ref {
	classId: string;
	academicYearId: string;
	academicTermId: string | null;
	class: Ref;
	academicYear: Ref;
	academicTerm: Ref | null;
	maxStrength: number | null;
	isActive: boolean;
	studentCount: number;
}

export interface Subject extends Ref {
	departmentId: string | null;
	department: Ref | null;
	description: string | null;
}

export interface Room extends Ref {
	number: string | null;
	capacity: number | null;
}

export type FeeCategory = Ref;

export interface FeeStructure {
	id: string;
	classId: string;
	academicYearId: string;
	academicTermId: string | null;
	class: Ref;
	academicYear: Ref;
	academicTerm: Ref | null;
	items: { id: string; feeCategoryId: string; feeCategory: Ref; amount: number }[];
	/** Paise. */
	total: number;
	invoiceCount: number;
}

// ── People ──────────────────────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type PersonStatus = "ACTIVE" | "INACTIVE";

export interface Staff {
	id: string;
	name: string;
	firstName: string;
	lastName: string | null;
	gender: Gender;
	dateOfBirth: string;
	email: string | null;
	phone: string | null;
	department: Ref;
	designation: Ref & { isTeaching: boolean };
	dateOfJoining: string;
	isTeacher: boolean;
	status: PersonStatus;
	hasLogin: boolean;
}

export interface Student {
	id: string;
	name: string;
	firstName: string;
	lastName: string | null;
	email: string | null;
	admissionNo: string | null;
	dateOfBirth: string | null;
	gender: Gender | null;
	status: PersonStatus;
	hasLogin: boolean;
	/** This year's placement, when enrolled. */
	class: Ref | null;
	section: Ref | null;
	academicYear: Ref | null;
}

// ── Timetable ───────────────────────────────────────────────────────────────

export interface Slot {
	id: string;
	date: string;
	startTime: string;
	endTime: string;
	color: string | null;
	section: Ref;
	class: Ref;
	subject: Ref;
	teacher: Ref;
	room: Ref;
}

export interface TimetableOptions {
	classes: Ref[];
	sections: (Ref & { classId: string })[];
}

// ── Attendance ──────────────────────────────────────────────────────────────

export type StudentAttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";
export type StaffAttendanceStatus = "PRESENT" | "ABSENT" | "ON_LEAVE" | "HALF_DAY" | "WORK_FROM_HOME";

export interface StudentAttendance {
	id: string;
	date: string;
	status: StudentAttendanceStatus;
	student?: Ref;
	section: Ref;
	class?: Ref;
}

export interface StaffAttendance {
	id: string;
	date: string;
	status: StaffAttendanceStatus;
	staff: Ref;
	department: Ref;
}

export interface StudentSheet {
	section: Ref;
	class: Ref;
	date: string;
	marked: boolean;
	students: (Ref & { status: StudentAttendanceStatus | null })[];
}

export interface StaffSheet {
	date: string;
	marked: boolean;
	staff: (Ref & { department: Ref; status: StaffAttendanceStatus | null })[];
}

// ── Exams ───────────────────────────────────────────────────────────────────

export interface Exam extends Ref {
	academicYearId: string;
	academicTermId: string | null;
	academicYear: Ref;
	academicTerm: Ref | null;
	startDate: string | null;
	endDate: string | null;
	isPublished: boolean;
	resultCount: number;
}

export interface Result {
	id: string;
	score: number;
	maxScore: number;
	grade: string;
	student: Ref;
	section: Ref;
	class: Ref;
	subject: Ref;
	exam: Ref & { isPublished: boolean };
	academicYear: Ref;
}

export interface MarksSheet {
	exam: Ref & { isPublished: boolean };
	section: Ref;
	subject: Ref;
	maxScore: number | null;
	students: (Ref & { score: number | null; grade: string | null })[];
}

// ── Fees ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE";

export interface Invoice {
	id: string;
	number: string;
	student: Ref & { admissionNo: string | null };
	class: Ref;
	academicYear: Ref;
	feeStructureId: string;
	issueDate: string;
	dueDate: string;
	/** Paise. */
	total: number;
	paid: number;
	outstanding: number;
	status: InvoiceStatus;
	overdue: boolean;
}

export interface InvoiceDetail extends Invoice {
	items: { id: string; feeCategory: Ref; amount: number }[];
	payments: { id: string; amount: number; method: PaymentMethod; reference: string | null; paidOn: string }[];
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardData {
	role: Role;
	studentCount?: number;
	employeeCount?: number;
	instructorCount?: number;
	todayPresent?: number;
	todayAbsent?: number;
	instructor?: string | null;
	student?: string | null;
	studentGroups?: string[];
	attendanceSummary?: { status: string; count: number }[];
	attendanceByGroup?: { name: string; pct: number }[];
	attendanceTrend?: { date: string; rate: number }[];
	gradeDistribution?: { label: string; value: number }[];
	/** Paise. */
	feesSummary?: { billed: number; collected: number; outstanding: number; overdue: number; unpaidStudents: number };
	staffToday?: { present: number; onLeave: number; absentUnapproved: number; unmarked: number };
	examSummary?: {
		passRate: number;
		medianScore: number;
		below40: number;
		totalResults: number;
		publishedGroups: number;
		totalGroups: number;
	};
	lowAttendanceCount?: number;
}
