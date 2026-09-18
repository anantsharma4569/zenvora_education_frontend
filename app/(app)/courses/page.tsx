"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/DataState";
import { DataTable } from "@/components/DataTable";
import { ResourcePage, type FieldDef, type Values } from "@/components/ResourcePage";
import type { CourseRow, DepartmentRow } from "@/lib/types";

const empty = (): Values => ({ course_name: "", department: "", description: "" });

export default function CoursesPage() {
	const { role } = useRole();
	const [courses, setCourses] = useState<CourseRow[]>([]);
	const [departments, setDepartments] = useState<DepartmentRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	const load = () => {
		setError(null);
		return api.listCourses().then(setCourses).catch((err) => setError(err.message));
	};

	useEffect(() => {
		load();
	}, []);

	useEffect(() => {
		if (role !== "admin") return;
		api.listDepartments().then(setDepartments).catch(() => undefined);
	}, [role]);

	const columns = [
		{ key: "course_name", label: "Course", sortable: true, value: (c: CourseRow) => c.course_name },
		{ key: "department", label: "Department", sortable: true, value: (c: CourseRow) => c.department || "-" },
		{ key: "description", label: "Description", value: (c: CourseRow) => c.description || "-" },
	];

	if (error) {
		return (
			<div>
				<PageHeader title="Courses" subtitle="Subjects offered across programs" />
				<ErrorState message={error} />
			</div>
		);
	}

	if (role !== "admin") {
		return (
			<div>
				<PageHeader title="Courses" subtitle="Subjects offered across programs" />
				<DataTable
					rows={courses}
					rowKey={(c) => c.name}
					searchPlaceholder="Search courses..."
					searchValue={(c) => c.course_name}
					emptyLabel="No courses yet."
					columns={columns}
				/>
			</div>
		);
	}

	const fields: FieldDef[] = [
		{ key: "course_name", label: "Course Name", type: "text", required: true, placeholder: "e.g. Mathematics", full: true },
		{
			key: "department",
			label: "Department",
			type: "select",
			options: departments.map((d) => ({ value: d.name, label: d.department_name })),
		},
		{ key: "description", label: "Description", type: "textarea", placeholder: "What this course covers" },
	];

	return (
		<ResourcePage<CourseRow>
			title="Courses"
			singular="Course"
			description="Subjects offered across programs"
			rows={courses}
			rowKey={(c) => c.name}
			rowLabel={(c) => c.course_name}
			searchPlaceholder="Search courses..."
			searchValue={(c) => c.course_name}
			emptyLabel="No courses yet."
			columns={columns}
			fields={fields}
			emptyValues={empty}
			reload={load}
			onCreate={(v) =>
				api.createCourse({
					course_name: v.course_name as string,
					department: (v.department as string) || undefined,
					description: (v.description as string) || undefined,
				})
			}
			loadForEdit={async (c) => {
				const rec = await api.getRecord("course", c.name);
				return {
					course_name: rec.course_name as string,
					department: rec.department as string,
					description: rec.description as string,
				};
			}}
			onUpdate={(c, v) => api.updateRecord("course", c.name, v)}
			onDelete={(list) => api.deleteRecords("course", list.map((c) => c.name))}
		/>
	);
}
