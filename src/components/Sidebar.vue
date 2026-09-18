<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import type { Role } from "@/lib/types";

interface NavItem {
	href: string;
	label: string;
	roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
	{ href: "/dashboard", label: "Dashboard", roles: ["admin", "teacher", "accounts", "student"] },
	{ href: "/students", label: "Students", roles: ["admin", "teacher", "accounts"] },
	{ href: "/staff", label: "Staff", roles: ["admin"] },
	{ href: "/courses", label: "Courses", roles: ["admin", "teacher", "student"] },
	{ href: "/attendance", label: "Attendance", roles: ["admin", "teacher", "student"] },
	{ href: "/exams", label: "Exams & Results", roles: ["admin", "teacher", "student"] },
	{ href: "/fees", label: "Fees / Billing", roles: ["admin", "accounts", "student"] },
	{ href: "/settings", label: "Settings", roles: ["admin"] },
];

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", teacher: "Teacher", accounts: "Accounts", student: "Student" };

const session = useSession();
const { role } = storeToRefs(session);
const route = useRoute();
const router = useRouter();

const items = computed(() => NAV_ITEMS.filter((item) => item.roles.includes(role.value)));
const isActive = (href: string) => route.path === href || route.path.startsWith(href + "/");

const logout = async () => {
	await api.logout().catch(() => undefined);
	session.reset();
	router.replace("/login");
};
</script>

<template>
	<!-- Narrow / mobile: sticky top bar with a horizontally scrolling nav. -->
	<aside class="sticky top-0 z-10 flex w-full min-w-0 flex-col gap-3 border-b border-line bg-surface px-4 py-3.5 md:hidden">
		<div class="flex items-center gap-2.5 px-2">
			<span class="h-[26px] w-[26px] shrink-0 rounded-full bg-accent" />
			<span>
				<span class="block whitespace-nowrap text-sm font-semibold tracking-[-0.01em]">Zenvora Education</span>
				<span class="block text-[11px] text-black/45">{{ ROLE_LABEL[role] }} view</span>
			</span>
		</div>
		<nav class="flex min-w-0 gap-1 overflow-x-auto pb-0.5">
			<RouterLink
				v-for="item in items"
				:key="item.href"
				:to="item.href"
				class="whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] transition-colors"
				:class="isActive(item.href) ? 'bg-accent font-semibold text-white' : 'text-black/70 hover:bg-mint hover:text-accent'"
			>
				{{ item.label }}
			</RouterLink>
		</nav>
	</aside>

	<!-- Wide / desktop: fixed-width left sidebar. -->
	<aside class="hidden h-full w-[236px] shrink-0 flex-col justify-between border-r border-line bg-surface p-[20px_14px] md:flex">
		<div>
			<div class="flex items-center gap-2.5 px-2">
				<span class="h-[26px] w-[26px] shrink-0 rounded-full bg-accent" />
				<span>
					<span class="block whitespace-nowrap text-sm font-semibold tracking-[-0.01em]">Zenvora Education</span>
					<span class="block text-[11px] text-black/45">{{ ROLE_LABEL[role] }} view</span>
				</span>
			</div>
			<nav class="mt-[22px] flex flex-col gap-0.5">
				<RouterLink
					v-for="item in items"
					:key="item.href"
					:to="item.href"
					class="whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] transition-colors"
					:class="isActive(item.href) ? 'bg-accent font-semibold text-white' : 'text-black/70 hover:bg-mint hover:text-accent'"
				>
					{{ item.label }}
				</RouterLink>
			</nav>
		</div>

		<!-- Demo-only role switcher: real role comes from the Frappe session server-side. -->
		<div class="border-t border-line pt-3.5">
			<label class="block px-2.5 pb-1.5 text-[10px] uppercase tracking-[0.08em] text-black/40">Preview as (demo)</label>
			<select
				class="mx-1 w-[calc(100%-8px)] rounded-[7px] border border-black/[0.12] bg-transparent px-2.5 py-1.5 text-[13px]"
				:value="role"
				@change="session.setRole(($event.target as HTMLSelectElement).value as Role)"
			>
				<option v-for="(label, value) in ROLE_LABEL" :key="value" :value="value">{{ label }}</option>
			</select>
			<button
				class="mx-1 mt-2.5 w-[calc(100%-8px)] rounded-full border border-black/[0.15] px-2.5 py-2 text-[13px] font-medium text-black/70 hover:bg-mint"
				@click="logout"
			>
				Log out
			</button>
		</div>
	</aside>
</template>
