export type Role = "admin" | "teacher" | "accounts" | "student";

export interface Session {
	user: string;
	authenticated: boolean;
	csrf_token?: string | null;
}

export interface DashboardData {
	role: Role;
	student_count?: number;
	employee_count?: number;
	instructor_count?: number;
	today_present?: number;
	today_absent?: number;
	instructor?: string;
	student?: string;
	student_groups?: string[];
	attendance_summary?: { status: string; count: number }[];
	attendance_by_group?: { name: string; pct: number }[];
	attendance_trend?: { date: string; rate: number }[];
	grade_distribution?: { label: string; value: number }[];
	fees_summary?: {
		billed: number;
		collected: number;
		outstanding: number;
		overdue: number;
		unpaid_students: number;
	};
	staff_today?: {
		present: number;
		on_leave: number;
		absent_unapproved: number;
		unmarked: number;
	};
	exam_summary?: {
		pass_rate: number;
		median_score: number;
		below_40: number;
		total_results: number;
		published_groups: number;
		total_groups: number;
	};
	low_attendance_count?: number;
}

export interface StaffMember {
	employee: string;
	employee_name: string;
	designation: string;
	department: string;
	is_teaching_role: boolean;
	personal_email?: string | null;
	date_of_joining?: string | null;
	has_login?: boolean;
}

export interface EmployeeAttendanceRow {
	name: string;
	employee: string;
	employee_name: string;
	attendance_date: string;
	status: string;
	department: string;
}

export interface StudentAttendanceRow {
	name: string;
	student: string;
	student_name: string;
	student_group: string;
	date: string;
	status: string;
}

export interface CourseRow {
	name: string;
	course_name: string;
	department: string;
	description?: string | null;
}

export interface StudentGuardian {
	name: string;
	relation: string;
	guardian_name: string;
	email_address?: string | null;
	mobile_number?: string | null;
}

export interface StudentDetail {
	name: string;
	student_name: string;
	first_name: string;
	last_name: string;
	gender: string;
	date_of_birth: string;
	blood_group: string;
	nationality: string;
	student_email_id: string;
	student_mobile_number: string;
	joining_date: string;
	enabled: boolean;
	image: string | null;
	address: string;
	program: string | null;
	student_group: string | null;
	guardians: StudentGuardian[];
	attendance: { present: number; absent: number; leave: number; marked: number; percent: number | null };
	fees: { invoice_count: number; outstanding_total: number };
	recent_results: { name: string; course: string; total_score: number; maximum_score: number; grade: string }[];
}

export interface StudentRow {
	name: string;
	student_name: string;
	student_email_id?: string;
	enabled: number;
	/** Section (Student Group) and class (Program) the student sits in, when placed. */
	student_group?: string | null;
	program?: string | null;
}

export interface ResultRow {
	name: string;
	student: string;
	student_name: string;
	student_group: string;
	course: string;
	program: string;
	academic_year: string;
	total_score: number;
	maximum_score: number;
	grade: string;
}

export interface ProgramRow {
	name: string;
	program_name: string;
	department?: string;
}

export interface AcademicYearRow {
	name: string;
	year_start_date?: string;
	year_end_date?: string;
}

export interface InstructorRow {
	name: string;
	instructor_name: string;
}

export interface RoomRow {
	name: string;
	room_name: string;
	room_number: string | null;
	seating_capacity: number | null;
}

export interface CourseScheduleRow {
	name: string;
	student_group: string;
	program: string;
	course: string;
	instructor: string;
	instructor_name: string;
	room: string;
	schedule_date: string;
	from_time: string;
	to_time: string;
	class_schedule_color: string | null;
}

export interface DepartmentRow {
	name: string;
	department_name: string;
	company: string;
}

export interface AcademicTermRow {
	name: string;
	academic_year: string;
	term_name: string;
	term_start_date: string;
	term_end_date: string;
}

export interface StudentGroupRow {
	name: string;
	student_group_name: string;
	program: string;
	academic_year: string;
	academic_term?: string;
	max_strength: number;
	disabled: number;
	student_count?: number;
}

export interface FeeCategoryRow {
	name: string;
	category_name: string;
}

export interface FeeStructureRow {
	name: string;
	program: string;
	academic_year: string;
	academic_term?: string;
	total_amount: number;
}

export interface FeeRow {
	name: string;
	student: string;
	student_name: string;
	program: string;
	due_date: string;
	posting_date: string;
	grand_total: number;
	outstanding_amount: number;
}

export interface DesignationRow {
	name: string;
	is_teaching_role: boolean;
}

export interface CompanyRow {
	name: string;
	default_currency: string;
	country: string;
}

export interface TimetableRow {
	name: string;
	student_group: string;
	student_group_name: string;
	program: string;
	course: string;
	course_name: string;
	instructor: string;
	instructor_name: string;
	room: string;
	room_name: string;
	schedule_date: string;
	from_time: string;
	to_time: string;
	color: string;
}

export interface TimetableOptions {
	programs: { name: string; program_name: string }[];
	sections: { name: string; student_group_name: string; program: string }[];
}
