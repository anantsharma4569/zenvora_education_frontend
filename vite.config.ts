import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// In dev the browser talks to Vite (same origin) and Vite forwards /api to the Zenvora API,
// so its sign-in cookies are plain same-site cookies and no CORS setup is needed.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const backend = env.API_PROXY_TARGET || "http://localhost:3000";
	return {
		plugins: [vue(), tailwindcss()],
		resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
		// FullCalendar ships several packages that must share one @fullcalendar/core; pre-bundle them together.
		optimizeDeps: {
			include: ["@fullcalendar/vue3", "@fullcalendar/core", "@fullcalendar/daygrid", "@fullcalendar/timegrid", "@fullcalendar/interaction"],
		},
		server: {
			// 3000 is the API; the Zenvora admin panel is on 3001.
			port: 3002,
			strictPort: true,
			// Keep the browser's Host so the API can tell which school's site this is; xfwd adds
			// X-Forwarded-* like the production edge proxy does.
			proxy: { "/api": { target: backend, changeOrigin: false, xfwd: true } },
		},
	};
});
