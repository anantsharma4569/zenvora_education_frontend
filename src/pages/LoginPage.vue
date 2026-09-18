<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";

const router = useRouter();
const session = useSession();
const usr = ref("");
const pwd = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

onMounted(async () => {
	if (await session.check()) router.replace("/dashboard");
});

const submit = async () => {
	submitting.value = true;
	error.value = null;
	try {
		await api.login(usr.value, pwd.value);
		session.authenticated = true;
		await session.loadRole();
		router.replace("/dashboard");
	} catch (err) {
		error.value = (err as Error).message || "Invalid username or password";
	} finally {
		submitting.value = false;
	}
};
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-mint">
		<form class="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-7 shadow-sm" @submit.prevent="submit">
			<h1 class="mb-1 text-xl font-semibold"><span class="text-accent">Zenvora</span> Education</h1>
			<p class="mb-6 text-sm text-black/60">Sign in to continue</p>

			<div class="flex flex-col gap-3">
				<input
					v-model="usr"
					required
					autofocus
					placeholder="Email or username"
					class="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm"
				/>
				<input
					v-model="pwd"
					required
					type="password"
					placeholder="Password"
					class="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm"
				/>

				<div v-if="error" class="text-sm text-red-600">{{ error }}</div>

				<button
					type="submit"
					:disabled="submitting"
					class="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
				>
					{{ submitting ? "Signing in..." : "Sign in" }}
				</button>
			</div>
		</form>
	</div>
</template>
