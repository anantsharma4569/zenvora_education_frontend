<script setup lang="ts">
// Landing page for the Zenvora admin panel's "Log in as". The single-use ticket arrives in the
// URL fragment (never sent to a server or written to logs); redeeming it sets this site's
// session cookies for the chosen member.
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";

const router = useRouter();
const session = useSession();
const error = ref<string | null>(null);

onMounted(async () => {
	const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
	// Drop the ticket from the address bar and history straight away.
	history.replaceState(null, "", window.location.pathname);
	if (!ticket) {
		error.value = "This sign-in link is incomplete. Start again from the admin panel.";
		return;
	}
	try {
		await session.logout(); // end whoever was signed in here before
		await api.auth.impersonate(ticket);
		if (!(await session.load())) throw new Error("Signed in, but the school could not be loaded.");
		router.replace("/dashboard");
	} catch (e) {
		error.value = (e as Error).message;
	}
});
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-mint p-4">
		<div class="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-7 text-center shadow-sm">
			<template v-if="error">
				<h1 class="mb-2 text-lg font-semibold">Couldn't sign you in</h1>
				<p class="mb-5 text-sm text-black/60">{{ error }}</p>
				<p class="text-xs text-black/45">Links from "Log in as" work once and expire after 2 minutes.</p>
			</template>
			<p v-else class="text-sm text-black/60">Signing in…</p>
		</div>
	</div>
</template>
