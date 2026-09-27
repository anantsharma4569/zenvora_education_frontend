<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/lib/api";
import type { EmployeeDetail } from "@/lib/types";
import Card from "@/components/Card.vue";
import CardHead from "@/components/CardHead.vue";
import Chip from "@/components/Chip.vue";
import Bar from "@/components/Bar.vue";
import ErrorState from "@/components/ErrorState.vue";
import LoadingState from "@/components/LoadingState.vue";
import { btnGhost } from "@/lib/styles";

const route = useRoute();
const employee = computed(() => String(route.params.employee));

const detail = ref<EmployeeDetail | null>(null);
const error = ref<string | null>(null);

const load = () => {
	detail.value = null;
	error.value = null;
	api
		.getEmployeeDetail(employee.value)
		.then((d) => (detail.value = d))
		.catch((err) => (error.value = err.message));
};
onMounted(load);

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
		{ label: "Email", value: d.personal_email },
		{ label: "Mobile", value: d.cell_number },
		{ label: "Gender", value: d.gender },
		{ label: "Date of Birth", value: d.date_of_birth },
		{ label: "Blood Group", value: d.blood_group },
		{ label: "Marital Status", value: d.marital_status },
		{ label: "Joined", value: d.date_of_joining },
		{ label: "Address", value: d.current_address },
	];
});
</script>

<template>
	<div>
		<RouterLink to="/staff" class="mb-4 inline-block text-[12.5px] text-black/50 hover:text-black">← Staff</RouterLink>

		<ErrorState v-if="error" :message="error" />
		<LoadingState v-else-if="!detail" label="Loading staff member…" />

		<template v-else>
			<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<img v-if="detail.image" :src="detail.image" alt="" class="h-16 w-16 rounded-full border border-line object-cover" />
					<div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mint text-lg font-semibold text-accent">
						{{ initials(detail.employee_name) }}
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h1 class="text-[22px] font-semibold tracking-[-0.02em]">{{ detail.employee_name }}</h1>
							<Chip :tone="detail.status === 'Active' ? 'ok' : 'bad'">{{ detail.status }}</Chip>
							<Chip v-if="detail.is_teaching_role" tone="neutral">Teaching</Chip>
						</div>
						<p class="mt-0.5 text-[13px] text-black/55">
							{{ detail.name }} · {{ detail.designation }}
							<template v-if="detail.department"> · {{ detail.department }}</template>
						</p>
					</div>
				</div>
				<RouterLink to="/staff" :class="btnGhost">Back to Staff</RouterLink>
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
					<CardHead title="Login" />
					<div class="mt-2 flex items-center gap-2">
						<Chip :tone="detail.has_login ? 'ok' : 'neutral'">{{ detail.has_login ? "Can sign in" : "No login" }}</Chip>
					</div>
					<p class="mt-3 text-xs text-black/50">
						{{ detail.has_login ? "Signs in with their personal email." : "This person has not been given a login yet." }}
					</p>
				</Card>

				<Card v-if="detail.is_teaching_role">
					<CardHead title="Classes taught" />
					<p v-if="detail.sections.length === 0" class="mt-3 text-[13px] text-black/45">Not assigned to a section yet.</p>
					<div v-else class="mt-3 flex flex-wrap gap-1.5">
						<Chip v-for="s in detail.sections" :key="s" tone="neutral">{{ s }}</Chip>
					</div>
				</Card>

				<Card>
					<CardHead title="Attendance" />
					<div class="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]">
						{{ detail.attendance.percent === null ? "—" : `${detail.attendance.percent}%` }}
					</div>
					<Bar v-if="detail.attendance.percent !== null" :pct="detail.attendance.percent" class="mt-3" />
					<p class="mt-3 text-xs text-black/50">
						{{ detail.attendance.present }} present, {{ detail.attendance.absent }} absent, {{ detail.attendance.on_leave }} on leave
					</p>
				</Card>
			</div>
		</template>
	</div>
</template>
