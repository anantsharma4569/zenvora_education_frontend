"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/DataState";
import type { CourseRow } from "@/lib/types";

export default function CoursesPage() {
	const { role } = useRole();
	const [courses, setCourses] = useState<CourseRow[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [department, setDepartment] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const load = () => {
		setError(null);
		api
			.listCourses()
			.then(setCourses)
			.catch((err) => setError(err.message));
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
			load();
		} catch (err) {
			setFormError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div>
			<PageHeader title="Courses" subtitle="Subjects offered across programs" />

			{role === "admin" && (
				<div className="mb-8 rounded-lg border border-black/10 p-4 dark:border-white/10">
					<h2 className="mb-3 text-sm font-medium">Add Course</h2>
					<form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
						<input
							required
							placeholder="Course Name"
							className="flex-1 rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
						<input
							placeholder="Department"
							className="flex-1 rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
							value={department}
							onChange={(e) => setDepartment(e.target.value)}
						/>
						<button
							type="submit"
							disabled={submitting}
							className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
						>
							{submitting ? "Adding..." : "Add"}
						</button>
					</form>
					{formError && <div className="mt-3"><ErrorState message={formError} /></div>}
				</div>
			)}

			{error && <ErrorState message={error} />}
			{!error && !courses && <LoadingState />}
			{!error && courses && courses.length === 0 && <EmptyState label="No courses yet." />}
			{!error && courses && courses.length > 0 && (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{courses.map((course) => (
						<li key={course.name} className="rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
							<div className="font-medium">{course.course_name}</div>
							{course.department && (
								<div className="mt-1 text-black/50 dark:text-white/50">{course.department}</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
