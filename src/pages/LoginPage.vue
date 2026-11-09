<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "@/lib/api";
import type { SchoolBranding } from "@/lib/types";
import { useSession } from "@/stores/session";

const router = useRouter();
const route = useRoute();
const session = useSession();

const CODE_KEY = "zenvora.schoolCode";
const readCode = () => {
	try {
		return localStorage.getItem(CODE_KEY) ?? "";
	} catch {
		return "";
	}
};

const email = ref("");
const password = ref("");
const schoolCode = ref(readCode());
/** Set when this web address belongs to a school; then no school code is needed. */
const site = ref<SchoolBranding | null>(null);
const siteChecked = ref(false);
const error = ref<string | null>(null);
const submitting = ref(false);

const next = () => {
	const n = route.query.next;
	return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
};

onMounted(async () => {
	if (await session.load()) return router.replace(next());
	site.value = await api
		.site()
		.then((r) => r.school)
		.catch(() => null);
	siteChecked.value = true;
});

const submit = async () => {
	submitting.value = true;
	error.value = null;
	try {
		const code = site.value ? undefined : schoolCode.value.trim().toUpperCase();
		await api.auth.login(email.value.trim(), password.value, code);
		if (code) {
			try {
				localStorage.setItem(CODE_KEY, code);
			} catch {
				// private mode: just ask again next time
			}
		}
		if (!(await session.load())) throw new Error("Signed in, but the school could not be loaded. Please try again.");
		router.replace(next());
	} catch (err) {
		error.value = (err as Error).message;
	} finally {
		submitting.value = false;
	}
};

const input = "w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm";
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-mint p-4">
		<form class="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-7 shadow-sm" @submit.prevent="submit">
			<h1 class="mb-1 text-xl font-semibold">
				<template v-if="site">{{ site.name }}</template>
				<template v-else><span class="text-accent">Zenvora</span> Education</template>
			</h1>
			<p class="mb-6 text-sm text-black/60">Sign in to continue</p>

			<div class="flex flex-col gap-3">
				<label v-if="siteChecked && !site" class="flex flex-col gap-1 text-sm">
					<span class="font-medium">School code</span>
					<input v-model="schoolCode" required autocapitalize="characters" placeholder="e.g. DPS" :class="[input, 'uppercase']" />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span class="font-medium">Email</span>
					<input v-model="email" required type="email" autocomplete="username" autofocus :class="input" />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span class="font-medium">Password</span>
					<input v-model="password" required type="password" autocomplete="current-password" :class="input" />
				</label>

				<div v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</div>

				<button
					type="submit"
					:disabled="submitting || !siteChecked"
					class="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
				>
					{{ submitting ? "Signing in..." : "Sign in" }}
				</button>
			</div>
		</form>
	</div>
</template>
