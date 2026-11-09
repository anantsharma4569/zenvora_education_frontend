<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import { periodRange } from "@/lib/period";
import { inputClass } from "@/lib/styles";
import type { FieldDef, Values } from "@/lib/resource";
import type { PersonStatus, Staff } from "@/lib/types";
import { formatDate, GENDERS } from "@/lib/format";
import ErrorState from "@/components/ErrorState.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const staff = ref<Staff[]>([]);
// Split by the designation's type, as set in Settings → Designations.
const teachingStaff = computed(() => staff.value.filter((s) => s.designation.isTeaching));
const nonTeachingStaff = computed(() => staff.value.filter((s) => !s.designation.isTeaching));
const route = useRoute();
const tab = ref<"teaching" | "non-teaching">(route.query.tab === "non-teaching" ? "non-teaching" : "teaching");
const error = ref<string | null>(null);

// Filters. Status is asked from the server; the rest narrow the loaded tab client-side.
const statusFilter = ref<PersonStatus | "all">("ACTIVE");
const designationFilter = ref("");
const departmentFilter = ref("");
const loginFilter = ref<"" | "yes" | "no">("");
const joinedFilter = ref<"" | "week" | "month" | "year" | "custom">("");
const joinedFrom = ref("");
const joinedTo = ref("");
const { rows: departments } = useList(() => api.departments.list());
const { rows: designations } = useList(() => api.designations.list());

const load = () => {
	error.value = null;
	return api.staff
		.list({ status: statusFilter.value })
		.then((res) => (staff.value = res))
		.catch((err) => (error.value = err.message));
};
onMounted(load);

const tabRows = computed(() => (tab.value === "teaching" ? teachingStaff.value : nonTeachingStaff.value));

const designationOptions = computed(() => [...new Set(tabRows.value.map((s) => s.designation.name))].sort());
const departmentOptions = computed(() => [...new Set(tabRows.value.map((s) => s.department.name))].sort());

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
		if (designationFilter.value && s.designation.name !== designationFilter.value) return false;
		if (departmentFilter.value && s.department.name !== departmentFilter.value) return false;
		if (loginFilter.value && s.hasLogin !== (loginFilter.value === "yes")) return false;
		const r = joinedRange.value;
		if (r && !joinedError.value) {
			const d = s.dateOfJoining;
			if (!d || d < r.from_date || d > r.to_date) return false;
		}
		return true;
	}),
);

const activeFilterCount = computed(
	() =>
		[designationFilter.value, departmentFilter.value, loginFilter.value, joinedFilter.value].filter(Boolean).length +
		(statusFilter.value !== "ACTIVE" ? 1 : 0),
);
const clearFilters = () => {
	designationFilter.value = departmentFilter.value = loginFilter.value = joinedFilter.value = "";
	joinedFrom.value = joinedTo.value = "";
	statusFilter.value = "ACTIVE";
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

const LOGIN_ROLES = [
	{ value: "TEACHER", label: "Teacher" },
	{ value: "ACCOUNTANT", label: "Accounts" },
	{ value: "SCHOOL_ADMIN", label: "School admin" },
];

const fields = (): FieldDef[] => [
	{ key: "firstName", label: "First Name", type: "text", required: true },
	{ key: "lastName", label: "Last Name", type: "text" },
	{ key: "gender", label: "Gender", type: "select", required: true, options: GENDERS },
	{ key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
	{
		key: "departmentId",
		label: "Department",
		type: "select",
		required: true,
		options: departments.value.map((d) => ({ value: d.id, label: d.name })),
	},
	{
		key: "designationId",
		label: "Designation",
		type: "select",
		required: true,
		options: designations.value.map((d) => ({ value: d.id, label: d.name, group: d.isTeaching ? "Teaching" : "Non-teaching" })),
	},
	{ key: "dateOfJoining", label: "Date of Joining", type: "date", required: true },
	{ key: "phone", label: "Phone", type: "text", placeholder: "+91 98xxxxxxxx" },
	{
		key: "email",
		label: "Email",
		type: "email",
		requiredWhen: (v) => !!v.password,
		help: (v) => (v.password ? "They sign in with this email." : undefined),
	},
	{
		key: "password",
		label: "Login Password",
		type: "password",
		createOnly: true,
		help: "Optional. Creates a sign-in for the school app (at least 8 characters, with a number).",
	},
	{
		key: "loginRole",
		label: "Can sign in as",
		type: "select",
		createOnly: true,
		hidden: (v) => !v.password,
		options: LOGIN_ROLES,
		placeholder: "Teacher if they teach, else Accounts",
	},
	{
		key: "isTeacher",
		label: "Teacher",
		type: "checkbox",
		placeholder: "Teaches classes (can be put on the timetable)",
		full: true,
	},
	{ key: "active", label: "Status", type: "checkbox", placeholder: "Active", hidden: (_v, editing) => !editing },
];

const emptyValues = (): Values => ({
	firstName: "",
	lastName: "",
	gender: "",
	dateOfBirth: "",
	departmentId: "",
	designationId: "",
	dateOfJoining: "",
	phone: "",
	email: "",
	password: "",
	loginRole: "",
	isTeacher: false,
	active: true,
});

const blank = (v: Values, k: string) => ((v[k] as string) ?? "").trim() || null;
const person = (v: Values) => ({
	firstName: (v.firstName as string).trim(),
	lastName: blank(v, "lastName"),
	gender: v.gender as string,
	dateOfBirth: v.dateOfBirth as string,
	departmentId: v.departmentId as string,
	designationId: v.designationId as string,
	dateOfJoining: v.dateOfJoining as string,
	phone: blank(v, "phone"),
	email: blank(v, "email"),
	isTeacher: v.isTeacher === true,
});
const toForm = (s: Staff): Values => ({
	firstName: s.firstName,
	lastName: s.lastName ?? "",
	gender: s.gender,
	dateOfBirth: s.dateOfBirth,
	departmentId: s.department.id,
	designationId: s.designation.id,
	dateOfJoining: s.dateOfJoining,
	phone: s.phone ?? "",
	email: s.email ?? "",
	isTeacher: s.isTeacher,
	active: s.status === "ACTIVE",
});
</script>

<template>
	<ErrorState v-if="error" :message="error" />
	<ResourcePage
		v-else
		title="Staff"
		singular="Staff Member"
		description="Teaching and non-teaching staff records"
		:rows="rows"
		:row-key="(s) => s.id"
		:row-label="(s) => `${s.name} (${s.designation.name})`"
		:search-placeholder="`Search ${tab === 'teaching' ? 'teaching' : 'non-teaching'} staff by name or email...`"
		:search-value="(s) => `${s.name} ${s.email ?? ''}`"
		:empty-label="activeFilterCount ? 'No staff match these filters.' : tab === 'teaching' ? 'No teaching staff yet.' : 'No non-teaching staff yet.'"
		:columns="[
			{ key: 'name', label: 'Name', sortable: true, value: (s) => s.name },
			{ key: 'department', label: 'Department', sortable: true, value: (s) => s.department.name },
			{ key: 'designation', label: 'Designation', sortable: true, value: (s) => s.designation.name },
			{ key: 'email', label: 'Email', value: (s) => s.email || '-' },
			{ key: 'dateOfJoining', label: 'Joined', sortable: true, value: (s) => s.dateOfJoining },
			{ key: 'hasLogin', label: 'Login', value: (s) => (s.hasLogin ? 'Yes' : 'No') },
		]"
		:fields="fields()"
		:empty-values="emptyValues"
		:on-change-field="
			(key, next) => {
				if (key !== 'designationId') return next;
				const picked = designations.find((d) => d.id === next.designationId);
				// A teaching designation implies a teacher; the checkbox stays editable.
				return picked ? { ...next, isTeacher: picked.isTeaching } : next;
			}
		"
		:reload="load"
		:on-create="
			(v) =>
				api.staff.create({
					...person(v),
					login: v.password
						? { password: v.password as string, role: ((v.loginRole as string) || undefined) as 'TEACHER' | 'ACCOUNTANT' | 'SCHOOL_ADMIN' | undefined }
						: undefined,
				})
		"
		:load-for-edit="async (s) => toForm(s)"
		:on-update="(s, v) => api.staff.update(s.id, { ...person(v), status: v.active ? 'ACTIVE' : 'INACTIVE' })"
		delete-verb="Disable"
		:on-delete="(list) => deleteEach(list, (s) => s.name, (s) => api.staff.disable(s.id))"
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
				<option value="ACTIVE">Active</option>
				<option value="INACTIVE">Inactive (disabled)</option>
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
		<template #cell-hasLogin="{ row }">
			<span
				class="rounded-full px-2.5 py-0.5 text-xs font-medium"
				:class="row.hasLogin ? 'bg-mint text-accent' : 'bg-black/[0.06] text-black/50'"
			>
				{{ row.hasLogin ? "Yes" : "No" }}
			</span>
		</template>
		<template #cell-dateOfJoining="{ row }">{{ formatDate(row.dateOfJoining) }}</template>
	</ResourcePage>
</template>
