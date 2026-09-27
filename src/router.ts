import { createRouter, createWebHistory } from "vue-router";
import { useSession } from "@/stores/session";

const settingsPage = (name: string) => () => import(`./pages/settings/${name}.vue`);

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: "/login", component: () => import("./pages/LoginPage.vue"), meta: { public: true } },
		{
			path: "/",
			component: () => import("./layouts/AppLayout.vue"),
			redirect: "/dashboard",
			children: [
				{ path: "dashboard", component: () => import("./pages/DashboardPage.vue") },
				{ path: "students", component: () => import("./pages/StudentsPage.vue") },
				{ path: "students/:name", component: () => import("./pages/StudentDetailPage.vue") },
				{ path: "staff", component: () => import("./pages/StaffPage.vue") },
				{ path: "staff/:employee", component: () => import("./pages/StaffDetailPage.vue") },
				{ path: "courses", component: () => import("./pages/CoursesPage.vue") },
				{ path: "attendance", component: () => import("./pages/AttendancePage.vue") },
				{ path: "timetable", component: () => import("./pages/TimeTablePage.vue") },
				// Old deep links from the first version of the dashboard cards.
				{ path: "attendance/present", redirect: { path: "/attendance", query: { status: "Present" } } },
				{ path: "attendance/absent", redirect: { path: "/attendance", query: { status: "Absent" } } },
				{ path: "exams", component: () => import("./pages/ExamsPage.vue") },
				{ path: "fees", component: () => import("./pages/FeesPage.vue") },
				{ path: "settings", component: settingsPage("SettingsIndex") },
				{
					path: "settings",
					component: settingsPage("SettingsLayout"),
					children: [
						{ path: "departments", component: settingsPage("DepartmentSection") },
						{ path: "academic-years", component: settingsPage("AcademicYearSection") },
						{ path: "academic-terms", component: settingsPage("AcademicTermSection") },
						{ path: "programs", component: settingsPage("ProgramSection") },
						{ path: "student-groups", component: settingsPage("StudentGroupSection") },
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

let roleLoaded = false;

router.beforeEach(async (to) => {
	if (to.meta.public) return true;
	const session = useSession();
	// Re-check on every navigation into the app until we know; afterwards trust it (api.ts
	// redirects to /login the moment the server says the session is gone).
	if (session.authenticated !== true) {
		roleLoaded = false;
		if (!(await session.check())) return "/login";
	}
	if (!roleLoaded) {
		roleLoaded = true;
		await session.loadRole();
	}
	return true;
});
