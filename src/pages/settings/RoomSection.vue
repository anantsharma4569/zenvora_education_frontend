<script setup lang="ts">
import { api, deleteEach } from "@/lib/api";
import { useList } from "@/lib/useList";
import type { FieldDef, Values } from "@/lib/resource";
import ResourcePage from "@/components/ResourcePage.vue";

const { rows, load } = useList(() => api.rooms.list());

const fields: FieldDef[] = [
	{ key: "name", label: "Room Name", type: "text", required: true, placeholder: "e.g. Science Lab", full: true },
	{ key: "number", label: "Room Number", type: "text", placeholder: "e.g. 204" },
	{ key: "capacity", label: "Seats", type: "number", placeholder: "e.g. 40" },
];

const values = (v: Values) => ({
	name: v.name as string,
	number: (v.number as string).trim() || null,
	capacity: v.capacity ? Number(v.capacity) : null,
});
</script>

<template>
	<ResourcePage
		title="Rooms"
		singular="Room"
		description="Classrooms, labs and halls that lessons are scheduled in"
		:rows="rows"
		:row-key="(r) => r.id"
		:row-label="(r) => r.name"
		search-placeholder="Search rooms..."
		:search-value="(r) => `${r.name} ${r.number ?? ''}`"
		empty-label="No rooms yet."
		:columns="[
			{ key: 'name', label: 'Room', sortable: true, value: (r) => r.name },
			{ key: 'number', label: 'Number', sortable: true, value: (r) => r.number ?? '-' },
			{ key: 'capacity', label: 'Seats', sortable: true, align: 'right', value: (r) => r.capacity ?? '-' },
		]"
		:fields="fields"
		:empty-values="(): Values => ({ name: '', number: '', capacity: '' })"
		:reload="load"
		:on-create="(v) => api.rooms.create(values(v))"
		:load-for-edit="async (r) => ({ name: r.name, number: r.number ?? '', capacity: r.capacity ? String(r.capacity) : '' })"
		:on-update="(r, v) => api.rooms.update(r.id, values(v))"
		:on-delete="(list) => deleteEach(list, (r) => r.name, (r) => api.rooms.remove(r.id))"
	/>
</template>
