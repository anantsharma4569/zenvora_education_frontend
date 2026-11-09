<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useSession } from "@/stores/session";
import Sidebar from "@/components/Sidebar.vue";

const session = useSession();
const { me, impersonatedBy } = storeToRefs(session);
const router = useRouter();

const endsAt = computed(() =>
	impersonatedBy.value?.endsAt
		? new Date(impersonatedBy.value.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
		: null,
);

const endImpersonation = async () => {
	await session.logout();
	router.replace("/login");
};
</script>

<template>
	<div class="flex min-h-screen flex-col">
		<!-- A Zenvora admin signed in as this member from the admin panel: always say so. -->
		<div
			v-if="impersonatedBy"
			role="status"
			class="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-[13px] font-medium text-black"
		>
			<span>
				You are signed in as <strong>{{ me?.name }}</strong> ({{ me?.email }}) by {{ impersonatedBy.name }}.
				<template v-if="endsAt">Ends at {{ endsAt }}.</template>
			</span>
			<button class="rounded-full border border-black/40 px-3 py-0.5 text-xs font-semibold hover:bg-black/10" @click="endImpersonation">
				End session
			</button>
		</div>
		<div class="flex min-h-0 flex-1 flex-col md:flex-row">
			<Sidebar />
			<main class="min-w-0 flex-1 overflow-y-auto p-6">
				<RouterView :key="$route.path.split('/')[1]" />
			</main>
		</div>
	</div>
</template>
