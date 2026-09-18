import { onMounted, shallowRef } from "vue";

/** Loads a list once on mount and exposes `load` to refresh it. Errors leave the list as-is. */
export function useList<T>(fetcher: () => Promise<T[]>, immediate = true) {
	const rows = shallowRef<T[]>([]);
	const load = () =>
		fetcher()
			.then((v) => {
				rows.value = v;
			})
			.catch(() => undefined);
	if (immediate) onMounted(load);
	return { rows, load };
}
