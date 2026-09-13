import { PageHeader } from "@/components/PageHeader";

const SETTINGS_GROUPS = [
	{
		title: "School / Company",
		items: ["School / Company Info", "Academic Year", "Academic Term"],
	},
	{
		title: "Academics",
		items: ["Program", "Course / Subject", "Student Group (Class/Section)", "Assessment Criteria / Grades"],
	},
	{
		title: "Fees",
		items: ["Fee Category", "Fee Structure"],
	},
	{
		title: "Access",
		items: ["Roles & User Access", "Rooms / Departments"],
	},
];

export default function SettingsPage() {
	return (
		<div>
			<PageHeader title="Settings" subtitle="One-time setup that everything else in the app depends on" />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{SETTINGS_GROUPS.map((group) => (
					<div key={group.title} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
						<div className="mb-2 text-sm font-medium">{group.title}</div>
						<ul className="flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
							{group.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
