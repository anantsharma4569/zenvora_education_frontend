import { ref } from "vue";
import { defineStore } from "pinia";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

const STORAGE_KEY = "zenvora.role.override";

/**
 * The backend (get_dashboard) is the source of truth for role - it derives it from
 * frappe.session.user server-side. The local override is only a fallback for when
 * the backend can't be reached.
 */
export const useSession = defineStore("session", () => {
	const authenticated = ref<boolean | null>(null);
	const role = ref<Role>("admin");
	const roleLoading = ref(true);

	async function check(): Promise<boolean> {
		try {
			authenticated.value = (await api.getSession()).authenticated;
		} catch {
			authenticated.value = false;
		}
		return authenticated.value;
	}

	async function loadRole() {
		roleLoading.value = true;
		try {
			role.value = (await api.getDashboard()).role;
		} catch {
			try {
				const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
				if (stored) role.value = stored;
			} catch {
				// localStorage unavailable, keep default
			}
		} finally {
			roleLoading.value = false;
		}
	}

	function setRole(next: Role) {
		role.value = next;
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore
		}
	}

	function reset() {
		authenticated.value = null;
		role.value = "admin";
		roleLoading.value = true;
	}

	return { authenticated, role, roleLoading, check, loadRole, setRole, reset };
});
