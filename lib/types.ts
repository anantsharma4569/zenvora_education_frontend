export type Role = "admin" | "teacher" | "accounts" | "student";

export interface Session {
	user: string;
	authenticated: boolean;
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

export interface EmployeeRow {
	name: string;
	employee_name: string;
	department: string;
	designation: string;
	status: string;
}

export interface CourseRow {
	name: string;
	course_name: string;
	department: string;
}

export interface StudentRow {
	name: string;
	student_name: string;
	student_email_id?: string;
	enabled: number;
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
