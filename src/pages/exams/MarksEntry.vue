<script setup lang="ts">
// Enter one subject's marks for one section in an exam. Grades are worked out by the API on
// save; the preview here uses the same scale. Clearing a box removes that mark.
import { computed, ref, watch } from "vue";
import { api } from "@/lib/api";
import { btnPrimary, inputClass } from "@/lib/styles";
import type { Exam, MarksSheet, Ref as NamedRef } from "@/lib/types";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import EmptyState from "@/components/EmptyState.vue";

const props = defineProps<{ exams: Exam[]; sections: NamedRef[]; subjects: NamedRef[] }>();
const emit = defineEmits<{ saved: [] }>();

const examId = ref("");
const sectionId = ref("");
const subjectId = ref("");
const maxScore = ref("");
const sheet = ref<MarksSheet | null>(null);
const scores = ref<Record<string, string>>({});
const scale = ref<{ min: number; grade: string }[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

api.exams
	.gradeScale()
	.then((s) => (scale.value = [...s].sort((a, b) => b.min - a.min)))
	.catch(() => undefined);

watch(
	() => props.exams,
	(list) => {
		if (!examId.value && list.length) examId.value = (list.find((e) => !e.isPublished) ?? list[0])!.id;
	},
	{ immediate: true },
);

let seq = 0;
watch([examId, sectionId, subjectId], async () => {
	const mine = ++seq;
	sheet.value = null;
	error.value = null;
	notice.value = null;
	if (!examId.value || !sectionId.value || !subjectId.value) return;
	loading.value = true;
	try {
		const s = await api.exams.marks(examId.value, sectionId.value, subjectId.value);
		if (mine !== seq) return;
		sheet.value = s;
		maxScore.value = s.maxScore ? String(s.maxScore) : maxScore.value || "100";
		scores.value = Object.fromEntries(s.students.map((st) => [st.id, st.score === null ? "" : String(st.score)]));
	} catch (e) {
		if (mine === seq) error.value = (e as Error).message;
	} finally {
		if (mine === seq) loading.value = false;
	}
});

const max = computed(() => Number(maxScore.value) || 0);
const problem = (v: string) => {
	if (v === "") return null;
	const n = Number(v);
	if (Number.isNaN(n) || n < 0) return "Not a valid mark";
	if (max.value && n > max.value) return `Above ${max.value}`;
	return null;
};
const gradeOf = (v: string) => {
	if (v === "" || problem(v) || !max.value) return "";
	const pct = (Number(v) / max.value) * 100;
	return scale.value.find((s) => pct >= s.min)?.grade ?? "";
};
const entered = computed(() => Object.values(scores.value).filter((v) => v !== "").length);
const invalid = computed(() => Object.values(scores.value).some((v) => problem(v)));

const save = async () => {
	if (!sheet.value) return;
	if (!(max.value >= 1)) {
		error.value = "Set the maximum marks first.";
		return;
	}
	if (invalid.value) {
		error.value = "Fix the highlighted marks first.";
		return;
	}
	saving.value = true;
	error.value = null;
	try {
		const res = await api.exams.saveMarks(examId.value, {
			sectionId: sheet.value.section.id,
			subjectId: sheet.value.subject.id,
			maxScore: max.value,
			entries: sheet.value.students.map((st) => ({ studentId: st.id, score: scores.value[st.id] === "" ? null : Number(scores.value[st.id]) })),
		});
		notice.value = `Saved ${res.saved} mark${res.saved === 1 ? "" : "s"}${res.cleared ? `, cleared ${res.cleared}` : ""}.`;
		emit("saved");
	} catch (e) {
		error.value = (e as Error).message;
	} finally {
		saving.value = false;
	}
};
</script>

<template>
	<div>
		<div class="mb-4 flex flex-wrap items-end gap-3">
			<label class="flex flex-col gap-1 text-[13px] text-black/60">
				Exam
				<select v-model="examId" :class="[inputClass, 'min-w-48']">
					<option value="">Select exam...</option>
					<option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }} ({{ e.academicYear.name }}){{ e.isPublished ? " · published" : "" }}</option>
				</select>
			</label>
			<label class="flex flex-col gap-1 text-[13px] text-black/60">
				Section
				<select v-model="sectionId" :class="[inputClass, 'min-w-40']">
					<option value="">Select section...</option>
					<option v-for="s in sections" :key="s.id" :value="s.id">{{ s.name }}</option>
				</select>
			</label>
			<label class="flex flex-col gap-1 text-[13px] text-black/60">
				Subject
				<select v-model="subjectId" :class="[inputClass, 'min-w-40']">
					<option value="">Select subject...</option>
					<option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
				</select>
			</label>
			<label v-if="sheet" class="flex flex-col gap-1 text-[13px] text-black/60">
				Out of
				<input v-model="maxScore" type="number" min="1" max="1000" :class="[inputClass, 'w-24']" />
			</label>
		</div>

		<EmptyState v-if="!examId || !sectionId || !subjectId" label="Pick an exam, a section and a subject to enter marks." />
		<LoadingState v-else-if="loading" />
		<ErrorState v-else-if="error && !sheet" :message="error" />
		<template v-else-if="sheet">
			<EmptyState v-if="!sheet.students.length" label="No students are enrolled in this section." />
			<template v-else>
				<p class="mb-3 text-[13px] text-black/60">
					{{ entered }} of {{ sheet.students.length }} entered.
					<span v-if="sheet.exam.isPublished" class="font-medium text-amber-700">This exam is published: students see changes straight away.</span>
				</p>
				<div class="overflow-hidden rounded-xl border border-line">
					<div v-for="(st, i) in sheet.students" :key="st.id" class="flex items-center justify-between gap-3 px-4 py-2" :class="i % 2 ? 'bg-black/[0.015]' : ''">
						<span class="min-w-0 truncate text-sm"><span class="mr-2 text-black/35">{{ i + 1 }}</span>{{ st.name }}</span>
						<span class="flex shrink-0 items-center gap-2">
							<span v-if="problem(scores[st.id] ?? '')" class="text-xs font-medium text-danger">{{ problem(scores[st.id] ?? "") }}</span>
							<input
								v-model="scores[st.id]"
								type="number"
								min="0"
								:max="max || undefined"
								step="0.5"
								inputmode="decimal"
								:aria-label="`Marks for ${st.name}`"
								:class="[inputClass, 'w-24 text-right', problem(scores[st.id] ?? '') ? 'border-danger!' : '']"
							/>
							<span class="w-8 text-center text-sm font-semibold" :aria-label="`Grade ${gradeOf(scores[st.id] ?? '')}`">{{ gradeOf(scores[st.id] ?? "") || "–" }}</span>
						</span>
					</div>
				</div>
				<div class="mt-4 flex flex-wrap items-center justify-end gap-3">
					<p v-if="error" role="alert" class="text-sm font-medium text-danger">{{ error }}</p>
					<p v-if="notice" role="status" class="text-sm font-medium text-accent">{{ notice }}</p>
					<button :class="btnPrimary" :disabled="saving" @click="save">{{ saving ? "Saving..." : "Save marks" }}</button>
				</div>
			</template>
		</template>
	</div>
</template>
