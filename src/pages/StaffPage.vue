<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/lib/api";
import { useList } from "@/lib/useList";
import { periodRange } from "@/lib/period";
import { inputClass } from "@/lib/styles";
import type { FieldDef, Values } from "@/lib/resource";
import type { StaffMember } from "@/lib/types";
import ErrorState from "@/components/ErrorState.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const GENDERS = ["Male", "Female", "Other"].map((g) => ({ value: g, label: g }));

const teachingStaff = ref<StaffMember[]>([]);
const nonTeachingStaff = ref<StaffMember[]>([]);
const route = useRoute();
const tab = ref<"teaching" | "non-teaching">(route.query.tab === "non-teaching" ? "non-teaching" : "teaching");
const error = ref<string | null>(null);

// Filters. Status is asked from the server; the rest narrow the loaded tab client-side.
const statusFilter = ref<"Active" | "Inactive" | "all">("Active");
const designationFilter = ref("");
const departmentFilter = ref("");
const loginFilter = ref<"" | "yes" | "no">("");
const joinedFilter = ref<"" | "week" | "month" | "year" | "custom">("");
const joinedFrom = ref("");
const joinedTo = ref("");
const { rows: departments } = useList(api.listDepartments);
const { rows: companies } = useList(api.listCompanies);
const { rows: designations } = useList(api.listDesignations);

// The company isn't asked for: it is the one the chosen department belongs to (else the only/first company).
const companyFor = (department: string) =>
	departments.value.find((d) => d.name === department)?.company || companies.value[0]?.name || "";

const load = () => {
	error.value = null;
	return api
		.getStaffDirectory({ status: statusFilter.value })
		.then((res) => {
			teachingStaff.value = res.teachingStaff;
			nonTeachingStaff.value = res.nonTeachingStaff;
		})
		.catch((err) => (error.value = err.message));
};
onMounted(load);

const tabRows = computed(() => (tab.value === "teaching" ? teachingStaff.value : nonTeachingStaff.value));

const designationOptions = computed(() => [...new Set(tabRows.value.map((s) => s.designation))].sort());
const departmentOptions = computed(() => [...new Set(tabRows.value.map((s) => s.department))].sort());

const joinedRange = computed<{ from_date: string; to_date: string } | null>(() => {
	if (!joinedFilter.value) return null;
	if (joinedFilter.value === "custom") {
		return joinedFrom.value || joinedTo.value
			? { from_date: joinedFrom.value || "0000-01-01", to_date: joinedTo.value || "9999-12-31" }
			: null;
	}
	return periodRange(joinedFilter.value);
});
const joinedError = computed(() =>
	joinedFilter.value === "custom" && joinedFrom.value && joinedTo.value && joinedFrom.value > joinedTo.value
		? "The 'from' date must be on or before the 'to' date."
		: null,
);

const rows = computed(() =>
	tabRows.value.filter((s) => {
		if (designationFilter.value && s.designation !== designationFilter.value) return false;
		if (departmentFilter.value && s.department !== departmentFilter.value) return false;
		if (loginFilter.value && !!s.has_login !== (loginFilter.value === "yes")) return false;
		const r = joinedRange.value;
		if (r && !joinedError.value) {
			const d = s.date_of_joining;
			if (!d || d < r.from_date || d > r.to_date) return false;
		}
		return true;
	}),
);

const activeFilterCount = computed(
	() =>
		[designationFilter.value, departmentFilter.value, loginFilter.value, joinedFilter.value].filter(Boolean).length +
		(statusFilter.value !== "Active" ? 1 : 0),
);
const clearFilters = () => {
	designationFilter.value = departmentFilter.value = loginFilter.value = joinedFilter.value = "";
	joinedFrom.value = joinedTo.value = "";
	statusFilter.value = "Active";
};

// A designation exists on one tab only; the server owns status.
watch(tab, () => (designationFilter.value = ""));
watch(statusFilter, load);
const pillSelect = inputClass;
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
		:search-placeholder="`Search ${tab === 'teaching' ? 'teaching' : 'non-teaching'} staff by name or email...`"
		:search-value="(s) => `${s.employee_name} ${s.personal_email ?? ''}`"
		:empty-label="activeFilterCount ? 'No staff match these filters.' : tab === 'teaching' ? 'No teaching staff yet.' : 'No non-teaching staff yet.'"
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
					company: companyFor(v.department as string),
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
		<template #filters>
			<select v-model="statusFilter" aria-label="Filter by status" :class="pillSelect">
				<option value="Active">Active</option>
				<option value="Inactive">Inactive (disabled)</option>
				<option value="all">All staff</option>
			</select>
			<select v-model="departmentFilter" aria-label="Filter by department" :class="pillSelect">
				<option value="">All departments</option>
				<option v-for="d in departmentOptions" :key="d" :value="d">{{ d }}</option>
			</select>
			<select v-if="designationOptions.length > 1" v-model="designationFilter" aria-label="Filter by designation" :class="pillSelect">
				<option value="">All designations</option>
				<option v-for="d in designationOptions" :key="d" :value="d">{{ d }}</option>
			</select>
			<select v-model="loginFilter" aria-label="Filter by login" :class="pillSelect">
				<option value="">Login: any</option>
				<option value="yes">Has login</option>
				<option value="no">No login</option>
			</select>
			<select v-model="joinedFilter" aria-label="Filter by joining date" :class="pillSelect">
				<option value="">Joined: any time</option>
				<option value="week">Joined this week</option>
				<option value="month">Joined this month</option>
				<option value="year">Joined this year</option>
				<option value="custom">Joined: custom range</option>
			</select>
			<template v-if="joinedFilter === 'custom'">
				<input v-model="joinedFrom" type="date" aria-label="Joined from" :max="joinedTo || undefined" :class="pillSelect" />
				<input v-model="joinedTo" type="date" aria-label="Joined to" :min="joinedFrom || undefined" :class="pillSelect" />
			</template>
			<button
				v-if="activeFilterCount"
				class="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/60 hover:bg-mint"
				@click="clearFilters"
			>
				Clear filters ({{ activeFilterCount }})
			</button>
			<span v-if="joinedError" role="alert" class="w-full text-[12px] font-medium text-danger">{{ joinedError }}</span>
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
