<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import type { StaffMember } from "@/lib/types";
import ErrorState from "@/components/ErrorState.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const GENDERS = ["Male", "Female", "Other"].map((g) => ({ value: g, label: g }));

const teachingStaff = ref<StaffMember[]>([]);
const nonTeachingStaff = ref<StaffMember[]>([]);
const tab = ref<"teaching" | "non-teaching">("teaching");
const error = ref<string | null>(null);
const { rows: departments } = useList(api.listDepartments);
const { rows: companies } = useList(api.listCompanies);
const { rows: designations } = useList(api.listDesignations);

const load = () => {
	error.value = null;
	return api
		.getStaffDirectory()
		.then((res) => {
			teachingStaff.value = res.teachingStaff;
			nonTeachingStaff.value = res.nonTeachingStaff;
		})
		.catch((err) => (error.value = err.message));
};
onMounted(load);

const rows = computed(() => (tab.value === "teaching" ? teachingStaff.value : nonTeachingStaff.value));
const tabs = computed(
	() =>
		[
			["teaching", `Teaching Staff (${teachingStaff.value.length})`],
			["non-teaching", `Non-Teaching Staff (${nonTeachingStaff.value.length})`],
		] as const,
);

const fields = (): FieldDef[] => [
	{ key: "first_name", label: "First Name", type: "text", required: true },
	{ key: "last_name", label: "Last Name", type: "text" },
	{ key: "gender", label: "Gender", type: "select", required: true, options: GENDERS },
	{ key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
	{
		key: "department",
		label: "Department",
		type: "select",
		required: true,
		options: departments.value.map((d) => ({ value: d.name, label: d.department_name })),
	},
	{
		key: "designation",
		label: "Designation",
		type: "select",
		required: true,
		options: designations.value.map((d) => ({
			value: d.name,
			label: d.name,
			group: d.is_teaching_role ? "Teaching" : "Non-teaching",
		})),
	},
	{
		key: "company",
		label: "Company",
		type: "select",
		required: true,
		createOnly: true,
		options: companies.value.map((c) => ({ value: c.name, label: c.name })),
	},
	{ key: "date_of_joining", label: "Date of Joining", type: "date", required: true },
	{
		key: "personal_email",
		label: "Personal Email",
		type: "email",
		requiredWhen: (v) => !!v.password,
		help: "Used as the login name when a password is set.",
	},
	{
		key: "password",
		label: "Login Password",
		type: "password",
		createOnly: true,
		help: "Optional - creates a login so they can sign in.",
	},
	{
		key: "is_instructor",
		label: "Teacher",
		type: "checkbox",
		createOnly: true,
		placeholder: "This person is a teacher (also create an Instructor record)",
		full: true,
	},
];

const emptyValues = (): Values => ({
	first_name: "",
	last_name: "",
	gender: "",
	date_of_birth: "",
	department: "",
	designation: "",
	company: "",
	date_of_joining: "",
	personal_email: "",
	password: "",
	is_instructor: false,
});

const EDIT_KEYS = ["first_name", "last_name", "gender", "date_of_birth", "department", "designation", "date_of_joining", "personal_email"];
</script>

<template>
	<ErrorState v-if="error" :message="error" />
	<ResourcePage
		v-else
		title="Staff"
		singular="Staff Member"
		description="Teaching and non-teaching staff records"
		:rows="rows"
		:row-key="(s) => s.employee"
		:row-label="(s) => `${s.employee_name} (${s.designation})`"
		:search-placeholder="`Search ${tab === 'teaching' ? 'teaching' : 'non-teaching'} staff...`"
		:search-value="(s) => s.employee_name"
		:empty-label="tab === 'teaching' ? 'No teaching staff yet.' : 'No non-teaching staff yet.'"
		:columns="[
			{ key: 'employee_name', label: 'Name', sortable: true, value: (s) => s.employee_name },
			{ key: 'department', label: 'Department', sortable: true, value: (s) => s.department },
			{ key: 'designation', label: 'Designation', sortable: true, value: (s) => s.designation },
			{ key: 'personal_email', label: 'Email', value: (s) => s.personal_email || '-' },
			{ key: 'date_of_joining', label: 'Joined', sortable: true, value: (s) => s.date_of_joining || '-' },
			{ key: 'has_login', label: 'Login', value: (s) => (s.has_login ? 'Yes' : 'No') },
		]"
		:fields="fields()"
		:empty-values="emptyValues"
		:open-values="(): Values => (companies.length === 1 ? { company: companies[0].name } : {})"
		:on-change-field="
			(key, next) => {
				if (key !== 'designation') return next;
				const picked = designations.find((d) => d.name === next.designation);
				// A teaching designation implies a teacher - the checkbox stays editable.
				return picked ? { ...next, is_instructor: picked.is_teaching_role } : next;
			}
		"
		:reload="load"
		:on-create="
			(v) =>
				api.createEmployee({
					first_name: v.first_name as string,
					last_name: (v.last_name as string) || undefined,
					gender: v.gender as string,
					date_of_birth: v.date_of_birth as string,
					department: v.department as string,
					designation: v.designation as string,
					company: v.company as string,
					date_of_joining: v.date_of_joining as string,
					personal_email: (v.personal_email as string) || undefined,
					password: (v.password as string) || undefined,
					is_instructor: v.is_instructor === true,
				})
		"
		:load-for-edit="
			async (s) => {
				const rec = await api.getRecord('employee', s.employee);
				return Object.fromEntries(EDIT_KEYS.map((k) => [k, rec[k] as string]));
			}
		"
		:on-update="
			(s, v) =>
				api.updateRecord('employee', s.employee, {
					first_name: v.first_name,
					last_name: v.last_name,
					gender: v.gender,
					date_of_birth: v.date_of_birth,
					department: v.department,
					designation: v.designation,
					date_of_joining: v.date_of_joining,
					personal_email: v.personal_email,
				})
		"
		delete-verb="Disable"
		:on-delete="(list) => api.deleteRecords('employee', list.map((s) => s.employee))"
	>
		<template #before-table>
			<div class="mb-4 flex gap-2 border-b border-line">
				<button
					v-for="[key, label] in tabs"
					:key="key"
					class="-mb-px border-b-2 px-3 py-2 text-sm font-medium"
					:class="tab === key ? 'border-accent text-accent' : 'border-transparent text-black/50 hover:text-black'"
					@click="tab = key"
				>
					{{ label }}
				</button>
			</div>
		</template>
		<template #cell-has_login="{ row }">
			<span
				class="rounded-full px-2.5 py-0.5 text-xs font-medium"
				:class="row.has_login ? 'bg-mint text-accent' : 'bg-black/[0.06] text-black/50'"
			>
				{{ row.has_login ? "Yes" : "No" }}
			</span>
		</template>
	</ResourcePage>
</template>
