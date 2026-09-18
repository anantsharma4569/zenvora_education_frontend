import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// In dev the browser talks to Vite (same origin) and Vite forwards /api to Frappe,
// so login cookies are plain same-site cookies and no CORS setup is needed.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const backend = env.FRAPPE_PROXY_TARGET || "http://localhost:8002";
	return {
		plugins: [vue(), tailwindcss()],
		resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
		server: {
			port: 3000,
			strictPort: true,
			proxy: { "/api": { target: backend, changeOrigin: true } },
		},
	};
});
