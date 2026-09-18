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
				{ path: "staff", component: () => import("./pages/StaffPage.vue") },
				{ path: "courses", component: () => import("./pages/CoursesPage.vue") },
				{ path: "attendance", component: () => import("./pages/AttendancePage.vue") },
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
