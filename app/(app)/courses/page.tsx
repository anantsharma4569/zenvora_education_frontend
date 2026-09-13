"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/DataState";
import { DataTable } from "@/components/DataTable";
import { SectionPage } from "@/components/SectionPage";
import { SubmitButton, inputClass } from "@/components/FormControls";
import type { CourseRow } from "@/lib/types";

export default function CoursesPage() {
	const { role } = useRole();
	const [courses, setCourses] = useState<CourseRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [name, setName] = useState("");
	const [department, setDepartment] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const load = () => {
		setError(null);
		api.listCourses().then(setCourses).catch((err) => setError(err.message));
	};

	useEffect(load, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setFormError(null);
		try {
			await api.createCourse({ course_name: name, department });
			setName("");
			setDepartment("");
			setFormOpen(false);
			load();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	if (error) return <ErrorState message={error} />;

	const table = (
		<DataTable
			rows={courses}
			rowKey={(c) => c.name}
			searchPlaceholder="Search courses..."
			searchValue={(c) => c.course_name}
			emptyLabel="No courses yet."
			columns={[
				{ key: "course_name", label: "Course", sortable: true, value: (c) => c.course_name },
				{ key: "department", label: "Department", sortable: true, value: (c) => c.department || "-" },
			]}
		/>
	);

	if (role !== "admin") {
		return (
			<div>
				<PageHeader title="Courses" subtitle="Subjects offered across programs" />
				{table}
			</div>
		);
	}

	return (
		<SectionPage
			title="Courses"
			count={courses.length}
			description="Subjects offered across programs"
			addLabel="+ Add Course"
			formOpen={formOpen}
			onToggleForm={() => setFormOpen((v) => !v)}
			formError={formError}
			form={
				<form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
					<input
						required
						autoFocus
						placeholder="Course Name"
						className={`flex-1 ${inputClass}`}
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<input
						placeholder="Department"
						className={`flex-1 ${inputClass}`}
						value={department}
						onChange={(e) => setDepartment(e.target.value)}
					/>
					<SubmitButton submitting={submitting} label="Add" />
				</form>
			}
			table={table}
		/>
	);
}
