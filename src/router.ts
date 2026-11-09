import { createRouter, createWebHistory } from "vue-router";
import { useSession } from "@/stores/session";
import type { Role } from "@/lib/types";

const settingsPage = (name: string) => () => import(`./pages/settings/${name}.vue`);
const ALL: Role[] = ["admin", "teacher", "accounts", "student"];

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: "/login", component: () => import("./pages/LoginPage.vue"), meta: { public: true } },
		// Opened from the Zenvora admin panel's "Log in as" button.
		{ path: "/impersonate", component: () => import("./pages/ImpersonatePage.vue"), meta: { public: true } },
		{
			path: "/",
			component: () => import("./layouts/AppLayout.vue"),
			redirect: "/dashboard",
			children: [
				{ path: "dashboard", component: () => import("./pages/DashboardPage.vue"), meta: { roles: ALL } },
				{ path: "students", component: () => import("./pages/StudentsPage.vue"), meta: { roles: ["admin", "teacher", "accounts"] } },
				{ path: "staff", component: () => import("./pages/StaffPage.vue"), meta: { roles: ["admin"] } },
				{ path: "courses", component: () => import("./pages/CoursesPage.vue"), meta: { roles: ["admin", "teacher"] } },
				{ path: "attendance", component: () => import("./pages/AttendancePage.vue"), meta: { roles: ["admin", "teacher", "student"] } },
				{ path: "timetable", component: () => import("./pages/TimeTablePage.vue"), meta: { roles: ["admin", "teacher", "student"] } },
				{ path: "attendance/present", redirect: { path: "/attendance", query: { status: "PRESENT" } } },
				{ path: "attendance/absent", redirect: { path: "/attendance", query: { status: "ABSENT" } } },
				{ path: "exams", component: () => import("./pages/ExamsPage.vue"), meta: { roles: ["admin", "teacher", "student"] } },
				{ path: "fees", component: () => import("./pages/FeesPage.vue"), meta: { roles: ["admin", "accounts", "student"] } },
				{ path: "settings", component: settingsPage("SettingsIndex"), meta: { roles: ["admin"] } },
				{
					path: "settings",
					component: settingsPage("SettingsLayout"),
					meta: { roles: ["admin"] },
					children: [
						{ path: "departments", component: settingsPage("DepartmentSection") },
						{ path: "designations", component: settingsPage("DesignationSection") },
						{ path: "academic-years", component: settingsPage("AcademicYearSection") },
						{ path: "academic-terms", component: settingsPage("AcademicTermSection") },
						{ path: "programs", component: settingsPage("ProgramSection") },
						{ path: "student-groups", component: settingsPage("StudentGroupSection") },
						{ path: "rooms", component: settingsPage("RoomSection") },
						{ path: "course-schedules", component: settingsPage("CourseScheduleSection") },
						{ path: "fee-categories", component: settingsPage("FeeCategorySection") },
						{ path: "fee-structures", component: settingsPage("FeeStructureSection") },
					],
				},
			],
		},
		{ path: "/:pathMatch(.*)*", redirect: "/dashboard" },
	],
});

router.beforeEach(async (to) => {
	if (to.meta.public) return true;
	const session = useSession();
	// Check once; afterwards api.ts sends the user to /login the moment the API says the
	// session is gone.
	if (session.authenticated !== true && !(await session.load())) {
		return { path: "/login", query: to.fullPath !== "/dashboard" && to.fullPath !== "/" ? { next: to.fullPath } : {} };
	}
	const roles = to.matched.map((r) => r.meta.roles as Role[] | undefined).find(Boolean);
	if (roles && !roles.includes(session.role)) return "/dashboard";
	return true;
});
