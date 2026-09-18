<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import { inputClass } from "@/lib/styles";
import type { FieldDef, Values } from "@/lib/resource";
import type { StudentRow } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import ErrorState from "@/components/ErrorState.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const GENDERS = ["Male", "Female", "Other"].map((g) => ({ value: g, label: g }));

const { role } = storeToRefs(useSession());
const students = ref<StudentRow[]>([]);
const error = ref<string | null>(null);
const classFilter = ref("");
const sectionFilter = ref("");

const { rows: programs, load: loadPrograms } = useList(api.listPrograms, false);
const { rows: studentGroups, load: loadGroups } = useList(api.listStudentGroups, false);
const { rows: academicYears, load: loadYears } = useList(api.listAcademicYears, false);

const loadStudents = () => {
	error.value = null;
	return api
		.listStudents({ program: classFilter.value || undefined, student_group: sectionFilter.value || undefined })
		.then((v) => (students.value = v))
		.catch((err) => (error.value = err.message));
};

onMounted(loadStudents);
// Section only makes sense within a class - drop it whenever the class changes.
watch(classFilter, () => {
	sectionFilter.value = "";
	loadStudents();
});
watch(sectionFilter, loadStudents);

watch(
	role,
	(r) => {
		if (r === "admin" || r === "accounts") {
			loadPrograms();
			loadGroups();
		}
		if (r === "admin") loadYears();
	},
	{ immediate: true },
);

// "Grade 10" should sort after "Grade 9", not between "Grade 1" and "Grade 2".
const sortedPrograms = computed(() =>
	[...programs.value].sort((a, b) => {
		const na = parseInt(a.program_name.match(/\d+/)?.[0] ?? "0", 10);
		const nb = parseInt(b.program_name.match(/\d+/)?.[0] ?? "0", 10);
		return na - nb || a.program_name.localeCompare(b.program_name);
	}),
);

const sectionsFor = (program: string) =>
	studentGroups.value
		.filter((g) => g.program === program)
		.sort((a, b) => a.student_group_name.localeCompare(b.student_group_name));
const sectionsForClass = computed(() => sectionsFor(classFilter.value));

const sectionLabel = (name: string) =>
	name.startsWith(`${classFilter.value} - `) ? `Section ${name.slice(classFilter.value.length + 3)}` : name;

const subtitle = computed(() =>
	role.value === "teacher"
		? "Students in your assigned Student Groups"
		: role.value === "accounts"
			? "Search students to attach fee invoices/payments"
			: "All students",
);

const emptyLabel = computed(() =>
	sectionFilter.value
		? "No students found in this section."
		: classFilter.value
			? "No students found in this class."
			: "No students found.",
);

const showFilters = computed(() => (role.value === "admin" || role.value === "accounts") && sortedPrograms.value.length > 0);

const columns: DataTableColumn<StudentRow>[] = [
	{ key: "student_name", label: "Name", sortable: true, value: (s) => s.student_name },
	{ key: "program", label: "Class", sortable: true, value: (s) => s.program || "-" },
	{ key: "student_group", label: "Section", sortable: true, value: (s) => s.student_group || "-" },
	{ key: "student_email_id", label: "Email", value: (s) => s.student_email_id || "-" },
	{ key: "enabled", label: "Status", value: (s) => (s.enabled ? "Enabled" : "Disabled") },
];

const fields = (): FieldDef[] => [
	{ key: "first_name", label: "First Name", type: "text", required: true },
	{ key: "last_name", label: "Last Name", type: "text" },
	{
		key: "student_email_id",
		label: "Student Email",
		type: "email",
		required: true,
		lockedOnEdit: true,
		help: "Also the student's login name.",
	},
	{ key: "date_of_birth", label: "Date of Birth", type: "date" },
	{ key: "gender", label: "Gender", type: "select", options: GENDERS },
	{
		key: "program",
		label: "Class (Program)",
		type: "select",
		required: true,
		createOnly: true,
		options: programs.value.map((p) => ({ value: p.name, label: p.program_name })),
	},
	{
		key: "student_group",
		label: "Section",
		type: "select",
		createOnly: true,
		disabled: (v) => !v.program,
		// Mandatory whenever the chosen class has sections - otherwise a class with none could never be saved.
		requiredWhen: (v) => !!v.program && sectionsFor(v.program as string).length > 0,
		options: (v) => sectionsFor(v.program as string).map((g) => ({ value: g.name, label: g.student_group_name })),
	},
	{
		key: "academic_year",
		label: "Academic Year",
		type: "select",
		required: true,
		createOnly: true,
		options: academicYears.value.map((y) => ({ value: y.name, label: y.name })),
	},
];

const emptyValues = (): Values => ({
	first_name: "",
	last_name: "",
	student_email_id: "",
	date_of_birth: "",
	gender: "",
	program: "",
	student_group: "",
	academic_year: "",
});
</script>

<template>
	<div>
		<template v-if="error">
			<PageHeader title="Students" :subtitle="subtitle" />
			<ErrorState :message="error" />
		</template>

		<template v-else>
			<DataTable
				v-if="role !== 'admin'"
				:rows="students"
				:row-key="(s) => s.name"
				search-placeholder="Search by name..."
				:search-value="role === 'accounts' ? (s) => s.student_name : undefined"
				:empty-label="emptyLabel"
				:columns="columns"
			>
				<template #filters>
					<template v-if="showFilters">
						<select v-model="classFilter" aria-label="Filter by class" :class="inputClass">
							<option value="">All classes</option>
							<option v-for="p in sortedPrograms" :key="p.name" :value="p.name">{{ p.program_name }}</option>
						</select>
						<select
							v-if="classFilter && sectionsForClass.length > 0"
							v-model="sectionFilter"
							aria-label="Filter by section"
							:class="inputClass"
						>
							<option value="">All sections</option>
							<option v-for="g in sectionsForClass" :key="g.name" :value="g.name">{{ sectionLabel(g.student_group_name) }}</option>
						</select>
					</template>
				</template>
				<template #cell-student_group="{ row }">
					<template v-if="row.student_group">{{ row.student_group }}</template>
					<span v-else class="text-black/35">No section</span>
				</template>
			</DataTable>

			<ResourcePage
				v-else
				title="Students"
				singular="Student"
				:description="subtitle"
				:rows="students"
				:row-key="(s) => s.name"
				:row-label="(s) => s.student_name"
				search-placeholder="Search by name..."
				:search-value="(s) => s.student_name"
				:empty-label="emptyLabel"
				:columns="columns"
				:fields="fields()"
				:empty-values="emptyValues"
				:on-change-field="(key, next) => (key === 'program' ? { ...next, student_group: '' } : next)"
				:reload="loadStudents"
				:on-create="
					(v) =>
						api.createStudent({
							first_name: v.first_name as string,
							last_name: (v.last_name as string) || undefined,
							student_email_id: v.student_email_id as string,
							date_of_birth: (v.date_of_birth as string) || undefined,
							gender: (v.gender as string) || undefined,
							program: v.program as string,
							student_group: (v.student_group as string) || undefined,
							academic_year: v.academic_year as string,
						})
				"
				:load-for-edit="
					async (s) => {
						const rec = await api.getRecord('student', s.name);
						return {
							first_name: rec.first_name as string,
							last_name: rec.last_name as string,
							date_of_birth: rec.date_of_birth as string,
							gender: rec.gender as string,
							student_email_id: s.student_email_id ?? '',
						};
					}
				"
				:on-update="
					(s, v) =>
						api.updateRecord('student', s.name, {
							first_name: v.first_name,
							last_name: v.last_name,
							date_of_birth: v.date_of_birth,
							gender: v.gender,
						})
				"
				delete-verb="Disable"
				:on-delete="(list) => api.deleteRecords('student', list.map((s) => s.name))"
			>
				<template #filters>
					<template v-if="showFilters">
						<select v-model="classFilter" aria-label="Filter by class" :class="inputClass">
							<option value="">All classes</option>
							<option v-for="p in sortedPrograms" :key="p.name" :value="p.name">{{ p.program_name }}</option>
						</select>
						<select
							v-if="classFilter && sectionsForClass.length > 0"
							v-model="sectionFilter"
							aria-label="Filter by section"
							:class="inputClass"
						>
							<option value="">All sections</option>
							<option v-for="g in sectionsForClass" :key="g.name" :value="g.name">{{ sectionLabel(g.student_group_name) }}</option>
						</select>
					</template>
				</template>
				<template #cell-student_group="{ row }">
					<template v-if="row.student_group">{{ row.student_group }}</template>
					<span v-else class="text-black/35">No section</span>
				</template>
			</ResourcePage>
		</template>
	</div>
</template>
