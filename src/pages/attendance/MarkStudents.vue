<script setup lang="ts">
// Mark a section's attendance for one day. Saving again just updates the day (the API upserts),
// so a teacher can correct a mistake or a phone can retry after losing signal.
import { computed, ref, watch } from "vue";
import { api } from "@/lib/api";
import { btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import { formatDate, todayIso } from "@/lib/format";
import type { StudentAttendanceStatus, StudentSheet } from "@/lib/types";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import EmptyState from "@/components/EmptyState.vue";

const props = defineProps<{ sections: { id: string; name: string }[] }>();
const emit = defineEmits<{ saved: [] }>();

const STATUSES: { value: StudentAttendanceStatus; label: string; short: string; on: string }[] = [
	{ value: "PRESENT", label: "Present", short: "P", on: "border-accent bg-accent text-white" },
	{ value: "ABSENT", label: "Absent", short: "A", on: "border-danger bg-danger text-white" },
	{ value: "LEAVE", label: "Leave", short: "L", on: "border-amber-500 bg-amber-500 text-white" },
];

const sectionId = ref(props.sections.length === 1 ? props.sections[0]!.id : "");
const date = ref(todayIso());
const sheet = ref<StudentSheet | null>(null);
const marks = ref<Record<string, StudentAttendanceStatus | null>>({});
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

watch(
	() => props.sections,
	(list) => {
		if (!sectionId.value && list.length === 1) sectionId.value = list[0]!.id;
	},
);

let seq = 0;
watch(
	[sectionId, date],
	async () => {
		const mine = ++seq;
		sheet.value = null;
		notice.value = null;
		error.value = null;
		if (!sectionId.value || !date.value) return;
		loading.value = true;
		try {
			const s = await api.attendance.studentSheet(sectionId.value, date.value);
			if (mine !== seq) return;
			sheet.value = s;
			marks.value = Object.fromEntries(s.students.map((st) => [st.id, st.status]));
		} catch (e) {
			if (mine === seq) error.value = (e as Error).message;
		} finally {
			if (mine === seq) loading.value = false;
		}
	},
	{ immediate: true },
);

const unmarked = computed(() => Object.values(marks.value).filter((v) => !v).length);
const counts = computed(() => Object.fromEntries(STATUSES.map((s) => [s.value, Object.values(marks.value).filter((v) => v === s.value).length])));
const markAll = (status: StudentAttendanceStatus) => {
	marks.value = Object.fromEntries(Object.keys(marks.value).map((id) => [id, status]));
};
const markRest = (status: StudentAttendanceStatus) => {
	marks.value = Object.fromEntries(Object.entries(marks.value).map(([id, v]) => [id, v ?? status]));
};

const save = async () => {
	if (!sheet.value) return;
	if (unmarked.value) {
		error.value = `${unmarked.value} student${unmarked.value === 1 ? " has" : "s have"} no status yet.`;
		return;
	}
	saving.value = true;
	error.value = null;
	try {
		const entries = Object.entries(marks.value).map(([studentId, status]) => ({ studentId, status: status! }));
		const res = await api.attendance.markStudents(sheet.value.section.id, sheet.value.date, entries);
		notice.value = `Saved attendance for ${res.saved} students on ${formatDate(sheet.value.date)}.`;
		sheet.value = { ...sheet.value, marked: true };
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
				Section
				<select v-model="sectionId" :class="[inputClass, 'min-w-48']">
					<option value="">Select section...</option>
					<option v-for="s in sections" :key="s.id" :value="s.id">{{ s.name }}</option>
				</select>
			</label>
			<label class="flex flex-col gap-1 text-[13px] text-black/60">
				Date
				<input v-model="date" type="date" :max="todayIso()" :class="inputClass" />
			</label>
		</div>

		<EmptyState v-if="!sectionId" :label="sections.length ? 'Pick a section to take attendance.' : 'You have no sections to mark yet.'" />
		<LoadingState v-else-if="loading" />
		<ErrorState v-else-if="error && !sheet" :message="error" />
		<template v-else-if="sheet">
			<EmptyState v-if="!sheet.students.length" label="No students are enrolled in this section." />
			<template v-else>
				<div class="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
					<span v-if="sheet.marked" class="rounded-full bg-mint px-2.5 py-1 font-semibold text-accent">Already marked; saving updates it</span>
					<span v-for="s in STATUSES" :key="s.value" class="text-black/60">{{ s.label }} {{ counts[s.value] }}</span>
					<span v-if="unmarked" class="font-medium text-danger">Not marked {{ unmarked }}</span>
					<span class="flex-1" />
					<button :class="btnGhost" type="button" @click="markAll('PRESENT')">Mark all present</button>
					<button v-if="unmarked && unmarked < sheet.students.length" :class="btnGhost" type="button" @click="markRest('PRESENT')">
						Rest present
					</button>
				</div>

				<div class="overflow-hidden rounded-xl border border-line">
					<div
						v-for="(st, i) in sheet.students"
						:key="st.id"
						class="flex items-center justify-between gap-3 px-4 py-2"
						:class="i % 2 ? 'bg-black/[0.015]' : ''"
					>
						<span class="min-w-0 truncate text-sm"><span class="mr-2 text-black/35">{{ i + 1 }}</span>{{ st.name }}</span>
						<div class="flex shrink-0 gap-1" role="radiogroup" :aria-label="`Attendance for ${st.name}`">
							<button
								v-for="s in STATUSES"
								:key="s.value"
								type="button"
								role="radio"
								:aria-checked="marks[st.id] === s.value"
								:aria-label="s.label"
								:title="s.label"
								class="h-8 w-9 rounded-full border text-xs font-semibold transition-colors"
								:class="marks[st.id] === s.value ? s.on : 'border-black/15 text-black/50 hover:bg-black/5'"
								@click="marks[st.id] = s.value"
							>
								{{ s.short }}
							</button>
						</div>
					</div>
				</div>

				<div class="mt-4 flex flex-wrap items-center justify-end gap-3">
					<p v-if="error" role="alert" class="text-sm font-medium text-danger">{{ error }}</p>
					<p v-if="notice" role="status" class="text-sm font-medium text-accent">{{ notice }}</p>
					<button :class="btnPrimary" :disabled="saving" @click="save">{{ saving ? "Saving..." : "Save attendance" }}</button>
				</div>
			</template>
		</template>
	</div>
</template>
