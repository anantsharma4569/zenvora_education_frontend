<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { api, deleteEach } from "@/lib/api";
import { useSession } from "@/stores/session";
import { useList } from "@/lib/useList";
import { inputClass } from "@/lib/styles";
import { formatDate } from "@/lib/format";
import type { FieldDef, Values } from "@/lib/resource";
import type { Exam, Ref as NamedRef, Result } from "@/lib/types";
import PageHeader from "@/components/PageHeader.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorState from "@/components/ErrorState.vue";
import EmptyState from "@/components/EmptyState.vue";
import DataTable, { type DataTableColumn } from "@/components/DataTable.vue";
import ResourcePage from "@/components/ResourcePage.vue";
import MarksEntry from "./exams/MarksEntry.vue";

const { role } = storeToRefs(useSession());
const isAdmin = computed(() => role.value === "admin");
const isStaff = computed(() => role.value === "admin" || role.value === "teacher");

type Tab = "exams" | "marks" | "results";
const tab = ref<Tab>("results");

// ── Lookups (staff) ─────────────────────────────────────────────────────────
const exams = ref<Exam[]>([]);
const loadExams = () => api.exams.list().then((v) => (exams.value = v)).catch(() => undefined);
const classes = ref<NamedRef[]>([]);
const sections = ref<(NamedRef & { classId: string })[]>([]);
const { rows: subjects, load: loadSubjects } = useList(() => api.subjects.list(), false);
const { rows: years, load: loadYears } = useList(() => api.academicYears.list(), false);
const { rows: terms, load: loadTerms } = useList(() => api.academicTerms.list(), false);

watch(
	isStaff,
	(staff) => {
		if (!staff) return;
		loadExams();
		loadSubjects();
		api.timetable
			.options()
			.then((o) => {
				classes.value = o.classes;
				sections.value = o.sections;
			})
			.catch(() => undefined);
		if (isAdmin.value) {
			loadYears();
			loadTerms();
		}
	},
	{ immediate: true },
);

// ── Results ─────────────────────────────────────────────────────────────────
const examFilter = ref("");
const classFilter = ref("");
const sectionFilter = ref("");
const subjectFilter = ref("");
const results = ref<Result[] | null>(null);
const error = ref<string | null>(null);

watch(
	() => exams.value,
	(list) => {
		// Default to the most recent exam that has marks, so the first view isn't every result ever.
		if (examFilter.value) return;
		const withMarks = list.find((e) => e.resultCount > 0)?.id;
		if (withMarks) examFilter.value = withMarks;
		else loadResults();
	},
);

let seq = 0;
const loadResults = () => {
	const mine = ++seq;
	error.value = null;
	results.value = null;
	const req =
		role.value === "student"
			? api.results.mine()
			: api.results.list({
					examId: examFilter.value || undefined,
					classId: classFilter.value || undefined,
					sectionId: sectionFilter.value || undefined,
					subjectId: subjectFilter.value || undefined,
				});
	req.then((v) => mine === seq && (results.value = v)).catch((err) => mine === seq && (error.value = err.message));
};
watch(
	[role, examFilter, classFilter, sectionFilter, subjectFilter],
	() => {
		if (role.value === "accounts") return;
		if (isStaff.value && !examFilter.value && !exams.value.length) return; // wait for the exam list
		loadResults();
	},
	{ immediate: true },
);
watch(classFilter, () => (sectionFilter.value = ""));
const sectionOptions = computed(() => sections.value.filter((s) => !classFilter.value || s.classId === classFilter.value));

const pct = (r: Result) => Math.round((r.score / r.maxScore) * 1000) / 10;
const resultColumns: DataTableColumn<Result>[] = [
	{ key: "student", label: "Student", sortable: true, value: (r) => r.student.name },
	{ key: "section", label: "Section", sortable: true, value: (r) => r.section.name },
	{ key: "subject", label: "Subject", sortable: true, value: (r) => r.subject.name },
	{ key: "exam", label: "Exam", sortable: true, value: (r) => r.exam.name },
	{ key: "score", label: "Score", sortable: true, align: "right", value: (r) => pct(r) },
	{ key: "grade", label: "Grade", sortable: true, value: (r) => r.grade },
];

// A student's own results, one table per exam.
const myExams = computed(() => {
	const groups = new Map<string, { exam: string; rows: Result[] }>();
	for (const r of results.value ?? []) {
		const g = groups.get(r.exam.id) ?? { exam: `${r.exam.name} · ${r.academicYear.name}`, rows: [] };
		g.rows.push(r);
		groups.set(r.exam.id, g);
	}
	return [...groups.values()];
});

// ── Exams (admin) ───────────────────────────────────────────────────────────
const examFields = (): FieldDef[] => [
	{ key: "name", label: "Exam Name", type: "text", required: true, placeholder: "e.g. Half-Yearly", full: true },
	{
		key: "academicYearId",
		label: "Academic Year",
		type: "select",
		required: true,
		lockedOnEdit: true,
		options: years.value.map((y) => ({ value: y.id, label: y.name })),
	},
	{
		key: "academicTermId",
		label: "Academic Term",
		type: "select",
		placeholder: "Whole year",
		disabled: (v) => !v.academicYearId,
		options: (v) => terms.value.filter((t) => t.academicYearId === v.academicYearId).map((t) => ({ value: t.id, label: t.name })),
	},
	{ key: "startDate", label: "Starts", type: "date" },
	{
		key: "endDate",
		label: "Ends",
		type: "date",
		validate: (v) => (v.startDate && v.endDate && (v.endDate as string) < (v.startDate as string) ? "End date must be on or after the start date" : null),
	},
	{
		key: "isPublished",
		label: "Published",
		type: "checkbox",
		placeholder: "Students can see these results",
		hidden: (_v, editing) => !editing,
		full: true,
	},
];
const examBody = (v: Values) => ({
	name: v.name as string,
	academicTermId: (v.academicTermId as string) || null,
	startDate: (v.startDate as string) || null,
	endDate: (v.endDate as string) || null,
});
const togglePublish = async (e: Exam) => {
	await api.exams.update(e.id, { isPublished: !e.isPublished }).catch((err) => (error.value = err.message));
	loadExams();
};
const tabCls = (on: boolean) =>
	`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${on ? "border-accent text-accent" : "border-transparent text-black/50 hover:text-black"}`;
</script>

<template>
	<div>
		<template v-if="role === 'accounts'">
			<PageHeader title="Exams & Results" />
			<EmptyState label="Exams & Results is not part of the Accounts view." />
		</template>

		<!-- Student: their own published results -->
		<template v-else-if="role === 'student'">
			<PageHeader title="Exams & Results" subtitle="Your published results" />
			<ErrorState v-if="error" :message="error" />
			<LoadingState v-else-if="!results" />
			<EmptyState v-else-if="results.length === 0" label="No results published yet." />
			<div v-for="g in myExams" v-else :key="g.exam" class="mb-6">
				<h2 class="mb-2 text-sm font-semibold">{{ g.exam }}</h2>
				<table class="w-full text-left text-sm">
					<thead class="text-black/50">
						<tr>
							<th class="py-2">Subject</th>
							<th class="py-2 text-right">Score</th>
							<th class="py-2 text-right">%</th>
							<th class="py-2 pl-6">Grade</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="r in g.rows" :key="r.id" class="border-t border-black/10">
							<td class="py-2">{{ r.subject.name }}</td>
							<td class="py-2 text-right">{{ r.score }} / {{ r.maxScore }}</td>
							<td class="py-2 text-right">{{ pct(r) }}</td>
							<td class="py-2 pl-6 font-semibold">{{ r.grade }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>

		<!-- Staff -->
		<template v-else>
			<PageHeader v-if="tab !== 'exams' || !isAdmin" title="Exams & Results" :subtitle="isAdmin ? 'Exams, marks and results' : 'Marks and results for the sections you teach'" />
			<div class="mb-4 flex gap-2 overflow-x-auto border-b border-line">
				<button :class="tabCls(tab === 'results')" @click="tab = 'results'">Results</button>
				<button :class="tabCls(tab === 'marks')" @click="tab = 'marks'">Enter marks</button>
				<button :class="tabCls(tab === 'exams')" @click="tab = 'exams'">Exams</button>
			</div>

			<MarksEntry v-if="tab === 'marks'" :exams="exams" :sections="sections" :subjects="subjects" @saved="loadExams" />

			<template v-else-if="tab === 'exams'">
				<ResourcePage
					v-if="isAdmin"
					title="Exams"
					singular="Exam"
					description="Unit tests, half-yearly and annual exams. Students see results once an exam is published."
					:rows="exams"
					:row-key="(e) => e.id"
					:row-label="(e) => `${e.name} (${e.academicYear.name})`"
					search-placeholder="Search exams..."
					:search-value="(e) => e.name"
					empty-label="No exams yet."
					:columns="[
						{ key: 'name', label: 'Exam', sortable: true, value: (e) => e.name },
						{ key: 'academicYear', label: 'Year / Term', value: (e) => `${e.academicYear.name}${e.academicTerm ? ' · ' + e.academicTerm.name : ''}` },
						{ key: 'startDate', label: 'Dates', sortable: true, value: (e) => e.startDate ?? '' },
						{ key: 'resultCount', label: 'Marks entered', align: 'right', value: (e) => e.resultCount },
						{ key: 'isPublished', label: 'Results', value: (e) => (e.isPublished ? 'Published' : 'Draft') },
					]"
					:fields="examFields()"
					:empty-values="(): Values => ({ name: '', academicYearId: '', academicTermId: '', startDate: '', endDate: '', isPublished: false })"
					:on-change-field="(key, next) => (key === 'academicYearId' ? { ...next, academicTermId: '' } : next)"
					:reload="loadExams"
					:on-create="(v) => api.exams.create({ ...examBody(v), academicYearId: v.academicYearId as string })"
					:load-for-edit="
						async (e) => ({
							name: e.name,
							academicYearId: e.academicYearId,
							academicTermId: e.academicTermId ?? '',
							startDate: e.startDate ?? '',
							endDate: e.endDate ?? '',
							isPublished: e.isPublished,
						})
					"
					:on-update="(e, v) => api.exams.update(e.id, { ...examBody(v), isPublished: v.isPublished === true })"
					:on-delete="(list) => deleteEach(list, (e) => e.name, (e) => api.exams.remove(e.id))"
				>
					<template #cell-startDate="{ row }">
						{{ row.startDate ? `${formatDate(row.startDate)} – ${formatDate(row.endDate)}` : "-" }}
					</template>
					<template #cell-isPublished="{ row }">
						<button
							class="rounded-full px-2.5 py-0.5 text-xs font-medium"
							:class="row.isPublished ? 'bg-mint text-accent' : 'bg-black/[0.06] text-black/55'"
							:title="row.isPublished ? 'Click to hide results from students' : 'Click to publish results to students'"
							@click.stop="togglePublish(row)"
						>
							{{ row.isPublished ? "Published" : "Draft · publish" }}
						</button>
					</template>
				</ResourcePage>
				<DataTable
					v-else
					:rows="exams"
					:row-key="(e) => e.id"
					empty-label="No exams yet."
					:columns="[
						{ key: 'name', label: 'Exam', sortable: true, value: (e: Exam) => e.name },
						{ key: 'academicYear', label: 'Year', value: (e: Exam) => e.academicYear.name },
						{ key: 'startDate', label: 'Starts', value: (e: Exam) => formatDate(e.startDate) },
						{ key: 'isPublished', label: 'Results', value: (e: Exam) => (e.isPublished ? 'Published' : 'Draft') },
					]"
				/>
			</template>

			<template v-else>
				<ErrorState v-if="error" :message="error" />
				<LoadingState v-else-if="!results" />
				<DataTable
					v-else
					:rows="results"
					:row-key="(r) => r.id"
					:columns="resultColumns"
					search-placeholder="Search student..."
					:search-value="(r) => r.student.name"
					empty-label="No results match these filters."
				>
					<template #filters>
						<select v-model="examFilter" aria-label="Filter by exam" :class="inputClass">
							<option value="">All exams</option>
							<option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }} ({{ e.academicYear.name }})</option>
						</select>
						<select v-if="classes.length > 1" v-model="classFilter" aria-label="Filter by class" :class="inputClass">
							<option value="">All classes</option>
							<option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
						</select>
						<select v-model="sectionFilter" aria-label="Filter by section" :class="inputClass">
							<option value="">All sections</option>
							<option v-for="s in sectionOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
						</select>
						<select v-model="subjectFilter" aria-label="Filter by subject" :class="inputClass">
							<option value="">All subjects</option>
							<option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
						</select>
						<span class="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-accent">{{ results.length }} results</span>
					</template>
					<template #cell-score="{ row }">{{ row.score }} / {{ row.maxScore }} <span class="text-black/45">({{ pct(row) }}%)</span></template>
				</DataTable>
			</template>
		</template>
	</div>
</template>
