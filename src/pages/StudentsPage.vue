<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api, deleteEach } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import { inputClass } from "@/lib/styles";
import { GENDERS } from "@/lib/format";
import type { FieldDef, Values } from "@/lib/resource";
import type { PersonStatus, Student } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import ErrorState from "@/components/ErrorState.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const { role } = storeToRefs(useSession());
const students = ref<Student[]>([]);
const error = ref<string | null>(null);
const classFilter = ref("");
const sectionFilter = ref("");
const statusFilter = ref<PersonStatus | "all">("ACTIVE");

// Teachers see only the sections they teach (the API scopes the list); admins and accounts
// can filter by class and section.
const { rows: classes, load: loadClasses } = useList(() => api.classes.list(), false);
const { rows: sections, load: loadSections } = useList(() => api.sections.list(), false);
const { rows: academicYears, load: loadYears } = useList(() => api.academicYears.list(), false);

const loadStudents = () => {
	error.value = null;
	return api.students
		.list({ classId: classFilter.value || undefined, sectionId: sectionFilter.value || undefined, status: statusFilter.value })
		.then((v) => (students.value = v))
		.catch((err) => (error.value = err.message));
};

onMounted(loadStudents);
// A section only makes sense within its class: drop it whenever the class changes.
watch(classFilter, () => {
	sectionFilter.value = "";
	loadStudents();
});
watch([sectionFilter, statusFilter], loadStudents);

watch(
	role,
	(r) => {
		if (r === "admin" || r === "accounts") {
			loadClasses();
			loadSections();
		}
		if (r === "admin") loadYears();
	},
	{ immediate: true },
);

/** The year new students are enrolled in: the one running today, else the latest. */
const currentYearId = computed(() => {
	const today = new Date().toISOString().slice(0, 10);
	const list = academicYears.value;
	return (list.find((y) => y.startDate <= today && today <= y.endDate) ?? [...list].sort((a, b) => b.startDate.localeCompare(a.startDate))[0])?.id ?? "";
});

const sectionsFor = (classId: string, yearId?: string) =>
	sections.value.filter((s) => s.classId === classId && s.isActive && (!yearId || s.academicYearId === yearId));
const sectionsForClass = computed(() => sectionsFor(classFilter.value));
const sectionLabel = (s: { name: string }, className: string) =>
	s.name.startsWith(`${className} - `) ? `Section ${s.name.slice(className.length + 3)}` : s.name;
const classNameOf = (id: string) => classes.value.find((c) => c.id === id)?.name ?? "";

const subtitle = computed(() =>
	role.value === "teacher"
		? "Students in the sections you teach"
		: role.value === "accounts"
			? "Find a student to see their fees"
			: "Students enrolled this academic year",
);

const emptyLabel = computed(() =>
	sectionFilter.value ? "No students found in this section." : classFilter.value ? "No students found in this class." : "No students found.",
);

const showFilters = computed(() => (role.value === "admin" || role.value === "accounts") && classes.value.length > 0);

const columns: DataTableColumn<Student>[] = [
	{ key: "name", label: "Name", sortable: true, value: (s) => s.name },
	{ key: "admissionNo", label: "Admission No.", sortable: true, value: (s) => s.admissionNo ?? "-" },
	{ key: "class", label: "Class", sortable: true, value: (s) => s.class?.name ?? "-" },
	{ key: "section", label: "Section", sortable: true, value: (s) => s.section?.name ?? "" },
	{ key: "email", label: "Email", value: (s) => s.email ?? "-" },
	{ key: "status", label: "Status", value: (s) => (s.status === "ACTIVE" ? "Active" : "Inactive") },
];

const fields = (): FieldDef[] => [
	{ key: "firstName", label: "First Name", type: "text", required: true },
	{ key: "lastName", label: "Last Name", type: "text" },
	{ key: "admissionNo", label: "Admission No.", type: "text", placeholder: "e.g. DPS-2051" },
	{ key: "email", label: "Email", type: "email" },
	{ key: "dateOfBirth", label: "Date of Birth", type: "date" },
	{ key: "gender", label: "Gender", type: "select", options: GENDERS },
	{
		key: "academicYearId",
		label: "Academic Year",
		type: "select",
		required: true,
		createOnly: true,
		options: academicYears.value.map((y) => ({ value: y.id, label: y.name })),
	},
	{
		key: "classId",
		label: "Class",
		type: "select",
		required: true,
		options: classes.value.map((c) => ({ value: c.id, label: c.name })),
	},
	{
		key: "sectionId",
		label: "Section",
		type: "select",
		disabled: (v) => !v.classId,
		placeholder: "No section yet",
		options: (v) =>
			sectionsFor(v.classId as string, (v.academicYearId as string) || currentYearId.value).map((s) => ({
				value: s.id,
				label: `${s.name}${s.maxStrength ? ` (${s.studentCount}/${s.maxStrength})` : ""}`,
			})),
		help: (v) => (v.classId ? "Moving a student changes this year's placement; history is kept." : "Pick a class first."),
	},
	{ key: "active", label: "Status", type: "checkbox", placeholder: "Active", hidden: (_v, editing) => !editing },
];

const emptyValues = (): Values => ({
	firstName: "",
	lastName: "",
	admissionNo: "",
	email: "",
	dateOfBirth: "",
	gender: "",
	academicYearId: "",
	classId: "",
	sectionId: "",
	active: true,
});

const blank = (v: Values, k: string) => ((v[k] as string) ?? "").trim() || null;
const person = (v: Values) => ({
	firstName: (v.firstName as string).trim(),
	lastName: blank(v, "lastName"),
	admissionNo: blank(v, "admissionNo"),
	email: blank(v, "email"),
	dateOfBirth: blank(v, "dateOfBirth"),
	gender: blank(v, "gender"),
	classId: v.classId as string,
	sectionId: blank(v, "sectionId"),
});
</script>

<template>
	<div>
		<template v-if="error">
			<PageHeader title="Students" :subtitle="subtitle" />
			<ErrorState :message="error" />
		</template>

		<template v-else>
			<template v-if="role !== 'admin'">
				<PageHeader title="Students" :subtitle="subtitle" />
				<DataTable
					:rows="students"
					:row-key="(s) => s.id"
					search-placeholder="Search by name or admission no..."
					:search-value="(s) => `${s.name} ${s.admissionNo ?? ''}`"
					:empty-label="emptyLabel"
					:columns="columns"
				>
					<template #filters>
						<template v-if="showFilters">
							<select v-model="classFilter" aria-label="Filter by class" :class="inputClass">
								<option value="">All classes</option>
								<option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
							</select>
							<select v-if="classFilter && sectionsForClass.length > 0" v-model="sectionFilter" aria-label="Filter by section" :class="inputClass">
								<option value="">All sections</option>
								<option v-for="s in sectionsForClass" :key="s.id" :value="s.id">{{ sectionLabel(s, classNameOf(classFilter)) }}</option>
							</select>
						</template>
					</template>
					<template #cell-section="{ row }">
						<template v-if="row.section">{{ row.section.name }}</template>
						<span v-else class="text-black/35">No section</span>
					</template>
				</DataTable>
			</template>

			<ResourcePage
				v-else
				title="Students"
				singular="Student"
				:description="subtitle"
				:rows="students"
				:row-key="(s) => s.id"
				:row-label="(s) => s.name"
				search-placeholder="Search by name or admission no..."
				:search-value="(s) => `${s.name} ${s.admissionNo ?? ''}`"
				:empty-label="emptyLabel"
				:columns="columns"
				:fields="fields()"
				:empty-values="emptyValues"
				:open-values="(): Values => ({ academicYearId: currentYearId, classId: classFilter, sectionId: sectionFilter })"
				:on-change-field="(key, next) => (key === 'classId' || key === 'academicYearId' ? { ...next, sectionId: '' } : next)"
				:reload="loadStudents"
				:on-create="(v) => api.students.create({ ...person(v), academicYearId: v.academicYearId as string })"
				:load-for-edit="
					async (s) => ({
						firstName: s.firstName,
						lastName: s.lastName ?? '',
						admissionNo: s.admissionNo ?? '',
						email: s.email ?? '',
						dateOfBirth: s.dateOfBirth ?? '',
						gender: s.gender ?? '',
						classId: s.class?.id ?? '',
						sectionId: s.section?.id ?? '',
						academicYearId: s.academicYear?.id ?? '',
						active: s.status === 'ACTIVE',
					})
				"
				:on-update="(s, v) => api.students.update(s.id, { ...person(v), status: v.active ? 'ACTIVE' : 'INACTIVE' })"
				delete-verb="Disable"
				:on-delete="(list) => deleteEach(list, (s) => s.name, (s) => api.students.disable(s.id))"
			>
				<template #filters>
					<select v-model="statusFilter" aria-label="Filter by status" :class="inputClass">
						<option value="ACTIVE">Active</option>
						<option value="INACTIVE">Inactive (disabled)</option>
						<option value="all">All students</option>
					</select>
					<template v-if="showFilters">
						<select v-model="classFilter" aria-label="Filter by class" :class="inputClass">
							<option value="">All classes</option>
							<option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
						</select>
						<select v-if="classFilter && sectionsForClass.length > 0" v-model="sectionFilter" aria-label="Filter by section" :class="inputClass">
							<option value="">All sections</option>
							<option v-for="s in sectionsForClass" :key="s.id" :value="s.id">{{ sectionLabel(s, classNameOf(classFilter)) }}</option>
						</select>
					</template>
				</template>
				<template #cell-section="{ row }">
					<template v-if="row.section">{{ row.section.name }}</template>
					<span v-else class="text-black/35">No section</span>
				</template>
			</ResourcePage>
		</template>
	</div>
</template>
