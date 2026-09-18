<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSession } from "@/stores/session";
import Sidebar from "@/components/Sidebar.vue";

const { roleLoading } = storeToRefs(useSession());
</script>

<template>
	<div class="flex min-h-screen flex-col md:flex-row">
		<Sidebar />
		<main class="min-w-0 flex-1 overflow-y-auto p-6">
			<!-- Wait for the real role so role-gated pages don't fire admin-only requests first. -->
			<RouterView v-if="!roleLoading" :key="$route.path.split('/')[1]" />
		</main>
	</div>
</template>
