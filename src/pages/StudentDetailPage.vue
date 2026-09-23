<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/lib/api";
import type { StudentDetail } from "@/lib/types";
import Card from "@/components/Card.vue";
import CardHead from "@/components/CardHead.vue";
import Chip from "@/components/Chip.vue";
import Bar from "@/components/Bar.vue";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import { btnGhost } from "@/lib/styles";

const route = useRoute();
const name = computed(() => String(route.params.name));

const detail = ref<StudentDetail | null>(null);
const error = ref<string | null>(null);

const load = () => {
	detail.value = null;
	error.value = null;
	api
		.getStudentDetail(name.value)
		.then((d) => (detail.value = d))
		.catch((err) => (error.value = err.message));
};
onMounted(load);

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const initials = (s: string) =>
	s
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0])
		.join("")
		.toUpperCase();

const profileRows = computed(() => {
	if (!detail.value) return [];
	const d = detail.value;
	return [
		{ label: "Email", value: d.student_email_id },
		{ label: "Mobile", value: d.student_mobile_number },
		{ label: "Gender", value: d.gender },
		{ label: "Date of Birth", value: d.date_of_birth },
		{ label: "Blood Group", value: d.blood_group },
		{ label: "Nationality", value: d.nationality },
		{ label: "Joined", value: d.joining_date },
		{ label: "Address", value: d.address },
	];
});
</script>

<template>
	<div>
		<RouterLink to="/students" class="mb-4 inline-block text-[12.5px] text-black/50 hover:text-black">← Students</RouterLink>

		<ErrorState v-if="error" :message="error" />
		<LoadingState v-else-if="!detail" label="Loading student…" />

		<template v-else>
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<img v-if="detail.image" :src="detail.image" alt="" class="h-16 w-16 rounded-full border border-line object-cover" />
					<div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mint text-lg font-semibold text-accent">
						{{ initials(detail.student_name) }}
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h1 class="text-[22px] font-semibold tracking-[-0.02em]">{{ detail.student_name }}</h1>
							<Chip :tone="detail.enabled ? 'ok' : 'bad'">{{ detail.enabled ? "Enabled" : "Disabled" }}</Chip>
						</div>
						<p class="mt-0.5 text-[13px] text-black/55">
							{{ detail.name }}
							<template v-if="detail.program"> · {{ detail.program }}</template>
							<template v-if="detail.student_group"> · {{ detail.student_group }}</template>
							<span v-if="!detail.student_group" class="text-black/35"> · No section</span>
						</p>
					</div>
				</div>
				<RouterLink to="/students" :class="btnGhost">Back to Students</RouterLink>
			</div>

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card class="lg:col-span-2">
					<CardHead title="Profile" />
					<dl class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
						<div v-for="r in profileRows" :key="r.label" class="flex justify-between gap-3 border-b border-line-soft py-1.5 sm:justify-start">
							<dt class="w-32 shrink-0 text-black/45">{{ r.label }}</dt>
							<dd class="min-w-0 truncate font-medium">{{ r.value || "—" }}</dd>
						</div>
					</dl>
				</Card>

				<Card>
					<CardHead title="Guardians" />
					<p v-if="detail.guardians.length === 0" class="mt-3 text-[13px] text-black/45">No guardian on record.</p>
					<ul v-else class="mt-3 flex flex-col gap-2">
						<li v-for="g in detail.guardians" :key="g.name" class="rounded-lg bg-black/[0.02] px-3 py-2 text-[13.5px]">
							<div><span class="font-medium">{{ g.guardian_name }}</span> <span class="text-black/45">({{ g.relation || "Guardian" }})</span></div>
							<div class="mt-0.5 text-black/55">{{ g.mobile_number || g.email_address || "No contact on record" }}</div>
						</li>
					</ul>
				</Card>

				<Card>
					<CardHead title="Attendance" />
					<div class="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]">
						{{ detail.attendance.percent === null ? "—" : `${detail.attendance.percent}%` }}
					</div>
					<Bar v-if="detail.attendance.percent !== null" :pct="detail.attendance.percent" class="mt-3" />
					<p class="mt-3 text-xs text-black/50">
						{{ detail.attendance.present }} present, {{ detail.attendance.absent }} absent, {{ detail.attendance.leave }} leave
					</p>
				</Card>

				<Card>
					<CardHead title="Fees" />
					<div class="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]" :class="detail.fees.outstanding_total > 0 ? 'text-danger' : ''">
						{{ money(detail.fees.outstanding_total) }}
					</div>
					<p class="mt-3 text-xs text-black/50">
						outstanding across {{ detail.fees.invoice_count }} invoice{{ detail.fees.invoice_count === 1 ? "" : "s" }}
					</p>
				</Card>

				<Card>
					<CardHead title="Recent results" />
					<p v-if="detail.recent_results.length === 0" class="mt-3 text-[13px] text-black/45">No results yet.</p>
					<ul v-else class="mt-3 flex flex-col gap-1.5 text-[13px]">
						<li v-for="r in detail.recent_results" :key="r.name" class="flex justify-between gap-2 border-b border-line-soft pb-1.5 last:border-b-0 last:pb-0">
							<span class="truncate text-black/70">{{ r.course }}</span>
							<span class="shrink-0 font-medium">{{ r.total_score }}/{{ r.maximum_score }} · {{ r.grade }}</span>
						</li>
					</ul>
				</Card>
			</div>
		</template>
	</div>
</template>
