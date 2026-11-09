import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { api } from "@/lib/api";
import type { Me, Role, SchoolProfile, SchoolRole } from "@/lib/types";

/** The app's four views, from the member's role in this school. */
export const ROLE_VIEW: Record<SchoolRole, Role> = {
	SCHOOL_ADMIN: "admin",
	TEACHER: "teacher",
	ACCOUNTANT: "accounts",
	STUDENT: "student",
	PARENT: "student",
};

/**
 * Who is signed in, to which school, and in what role. The API is the source of truth: the
 * role comes from the member's record in this school, never from the browser.
 */
export const useSession = defineStore("session", () => {
	const me = ref<Me | null>(null);
	const school = ref<SchoolProfile | null>(null);
	/** null until the first check finishes. */
	const authenticated = ref<boolean | null>(null);

	const role = computed<Role>(() => (me.value?.currentRole ? ROLE_VIEW[me.value.currentRole] : "student"));
	const impersonatedBy = computed(() => me.value?.impersonatedBy ?? null);

	async function load(): Promise<boolean> {
		try {
			const user = await api.auth.me();
			if (!user.currentSchoolId) throw new Error("Not signed in to a school");
			me.value = user;
			school.value = await api.profile().catch(() => null);
			authenticated.value = true;
		} catch {
			me.value = null;
			school.value = null;
			authenticated.value = false;
		}
		return authenticated.value;
	}

	async function logout() {
		await api.auth.logout().catch(() => undefined);
		reset();
	}

	function reset() {
		me.value = null;
		school.value = null;
		authenticated.value = null;
	}

	return { me, school, authenticated, role, impersonatedBy, load, logout, reset };
});
