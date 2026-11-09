<script setup lang="ts">
// Admins mark staff attendance for one day. Saving again updates the day.
import { computed, ref, watch } from "vue";
import { api } from "@/lib/api";
import { btnGhost, btnPrimary, inputClass } from "@/lib/styles";
import { formatDate, todayIso } from "@/lib/format";
import type { StaffAttendanceStatus, StaffSheet } from "@/lib/types";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import EmptyState from "@/components/EmptyState.vue";

const emit = defineEmits<{ saved: [] }>();

const STATUSES: { value: StaffAttendanceStatus; label: string }[] = [
	{ value: "PRESENT", label: "Present" },
	{ value: "ABSENT", label: "Absent" },
	{ value: "ON_LEAVE", label: "On leave" },
	{ value: "HALF_DAY", label: "Half day" },
	{ value: "WORK_FROM_HOME", label: "Work from home" },
];

const date = ref(todayIso());
const department = ref("");
const sheet = ref<StaffSheet | null>(null);
const marks = ref<Record<string, StaffAttendanceStatus | "">>({});
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

let seq = 0;
watch(
	date,
	async () => {
		const mine = ++seq;
		sheet.value = null;
		notice.value = null;
		error.value = null;
		if (!date.value) return;
		loading.value = true;
		try {
			const s = await api.attendance.staffSheet(date.value);
			if (mine !== seq) return;
			sheet.value = s;
			marks.value = Object.fromEntries(s.staff.map((p) => [p.id, p.status ?? ""]));
		} catch (e) {
			if (mine === seq) error.value = (e as Error).message;
		} finally {
			if (mine === seq) loading.value = false;
		}
	},
	{ immediate: true },
);

const departments = computed(() => [...new Set((sheet.value?.staff ?? []).map((p) => p.department.name))].sort());
const shown = computed(() => (sheet.value?.staff ?? []).filter((p) => !department.value || p.department.name === department.value));
const unmarked = computed(() => Object.values(marks.value).filter((v) => !v).length);
const markRestPresent = () => {
	marks.value = Object.fromEntries(Object.entries(marks.value).map(([id, v]) => [id, v || "PRESENT"]));
};

const save = async () => {
	if (!sheet.value) return;
	// Only send the people with a status; the rest stay unmarked.
	const entries = Object.entries(marks.value)
		.filter(([, s]) => s)
		.map(([staffId, status]) => ({ staffId, status: status as StaffAttendanceStatus }));
	if (!entries.length) {
		error.value = "Mark at least one person.";
		return;
	}
	saving.value = true;
	error.value = null;
	try {
		const res = await api.attendance.markStaff(sheet.value.date, entries);
		notice.value = `Saved attendance for ${res.saved} staff on ${formatDate(sheet.value.date)}.`;
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
				Date
				<input v-model="date" type="date" :max="todayIso()" :class="inputClass" />
			</label>
			<label v-if="departments.length > 1" class="flex flex-col gap-1 text-[13px] text-black/60">
				Department
				<select v-model="department" :class="inputClass">
					<option value="">All departments</option>
					<option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
				</select>
			</label>
		</div>

		<LoadingState v-if="loading" />
		<ErrorState v-else-if="error && !sheet" :message="error" />
		<template v-else-if="sheet">
			<EmptyState v-if="!sheet.staff.length" label="No active staff." />
			<template v-else>
				<div class="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
					<span v-if="sheet.marked" class="rounded-full bg-mint px-2.5 py-1 font-semibold text-accent">Already marked; saving updates it</span>
					<span v-if="unmarked" class="text-black/60">Not marked {{ unmarked }}</span>
					<span class="flex-1" />
					<button v-if="unmarked" :class="btnGhost" type="button" @click="markRestPresent">Mark the rest present</button>
				</div>
				<div class="overflow-hidden rounded-xl border border-line">
					<div v-for="(p, i) in shown" :key="p.id" class="flex items-center justify-between gap-3 px-4 py-2" :class="i % 2 ? 'bg-black/[0.015]' : ''">
						<span class="min-w-0 text-sm">
							<span class="block truncate">{{ p.name }}</span>
							<span class="block text-xs text-black/45">{{ p.department.name }}</span>
						</span>
						<select v-model="marks[p.id]" :aria-label="`Attendance for ${p.name}`" :class="[inputClass, 'w-44', marks[p.id] ? '' : 'text-black/40']">
							<option value="">Not marked</option>
							<option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
						</select>
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
