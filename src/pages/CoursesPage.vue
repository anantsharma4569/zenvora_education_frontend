<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import type { CourseRow } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import ErrorState from "@/components/ErrorState.vue";
import DataTable from "@/components/DataTable.vue";
import ResourcePage from "@/components/ResourcePage.vue";

const { role } = storeToRefs(useSession());
const courses = ref<CourseRow[]>([]);
const error = ref<string | null>(null);
const { rows: departments, load: loadDepartments } = useList(api.listDepartments, false);

const load = () => {
	error.value = null;
	return api
		.listCourses()
		.then((v) => (courses.value = v))
		.catch((err) => (error.value = err.message));
};

onMounted(load);
watch(role, (r) => r === "admin" && loadDepartments(), { immediate: true });

const columns = [
	{ key: "course_name", label: "Course", sortable: true, value: (c: CourseRow) => c.course_name },
	{ key: "department", label: "Department", sortable: true, value: (c: CourseRow) => c.department || "-" },
	{ key: "description", label: "Description", value: (c: CourseRow) => c.description || "-" },
];

const fields = (): FieldDef[] => [
	{ key: "course_name", label: "Course Name", type: "text", required: true, placeholder: "e.g. Mathematics", full: true },
	{
		key: "department",
		label: "Department",
		type: "select",
		options: departments.value.map((d) => ({ value: d.name, label: d.department_name })),
	},
	{ key: "description", label: "Description", type: "textarea", placeholder: "What this course covers" },
];
</script>

<template>
	<div>
		<template v-if="error">
			<PageHeader title="Courses" subtitle="Subjects offered across programs" />
			<ErrorState :message="error" />
		</template>
		<template v-else-if="role !== 'admin'">
			<PageHeader title="Courses" subtitle="Subjects offered across programs" />
			<DataTable
				:rows="courses"
				:row-key="(c) => c.name"
				search-placeholder="Search courses..."
				:search-value="(c) => c.course_name"
				empty-label="No courses yet."
				:columns="columns"
			/>
		</template>
		<ResourcePage
			v-else
			title="Courses"
			singular="Course"
			description="Subjects offered across programs"
			:rows="courses"
			:row-key="(c) => c.name"
			:row-label="(c) => c.course_name"
			search-placeholder="Search courses..."
			:search-value="(c) => c.course_name"
			empty-label="No courses yet."
			:columns="columns"
			:fields="fields()"
			:empty-values="(): Values => ({ course_name: '', department: '', description: '' })"
			:reload="load"
			:on-create="
				(v) =>
					api.createCourse({
						course_name: v.course_name as string,
						department: (v.department as string) || undefined,
						description: (v.description as string) || undefined,
					})
			"
			:load-for-edit="
				async (c) => {
					const rec = await api.getRecord('course', c.name);
					return {
						course_name: rec.course_name as string,
						department: rec.department as string,
						description: rec.description as string,
					};
				}
			"
			:on-update="(c, v) => api.updateRecord('course', c.name, v)"
			:on-delete="(list) => api.deleteRecords('course', list.map((c) => c.name))"
		/>
	</div>
</template>
