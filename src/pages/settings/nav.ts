export interface SettingsItem {
	slug: string;
	label: string;
}

export interface SettingsGroup {
	label: string;
	items: SettingsItem[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
	{
		label: "Organization",
		items: [
			{ slug: "departments", label: "Departments" },
			{ slug: "academic-years", label: "Academic Years" },
			{ slug: "academic-terms", label: "Academic Terms" },
		],
	},
	{
		label: "Academics",
		items: [
			{ slug: "programs", label: "Classes" },
			{ slug: "student-groups", label: "Student Groups (Class/Section)" },
			{ slug: "course-schedules", label: "Course Schedule" },
		],
	},
	{
		label: "Fees",
		items: [
			{ slug: "fee-categories", label: "Fee Categories" },
			{ slug: "fee-structures", label: "Fee Structures" },
		],
	},
];
