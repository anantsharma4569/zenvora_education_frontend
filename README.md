# Zenvora Education – Frontend

Vue 3 + Vite + TypeScript + Vue Router + Pinia + Tailwind CSS 4. Talks to the Frappe backend
(`zenvora_education` app) through its whitelisted `/api/method/...` endpoints only.

## Run

```bash
npm install
cp .env.example .env   # optional
npm run dev            # http://localhost:3000, proxies /api to Frappe (default http://localhost:8002)
```

Log in with a Frappe user. Sign-in sets a same-origin cookie because Vite proxies `/api`, so no CORS
configuration is needed in development.

## Build

```bash
npm run build          # type-checks, then writes dist/
```

Serve `dist/` from the same origin as Frappe (reverse proxy `/api` to Frappe and fall back to
`index.html` for other paths), or set `VITE_FRAPPE_URL` at build time if the backend is on another origin
(then Frappe's `allow_cors` must list the frontend origin).

## Layout

- `src/lib/api.ts` – typed client for every backend method; `src/lib/types.ts` – response types
- `src/stores/session.ts` – Pinia store: auth state and role
- `src/router.ts` – routes and the login guard
- `src/components/ResourcePage.vue` – config-driven list page (Add / Edit modal, checkboxes, bulk delete)
- `src/components/DataTable.vue` – search, sort, pagination, selection
- `src/pages/` – one file per screen; `src/pages/settings/` – the seven Settings sections

The previous Next.js/React version is preserved at the git tag `react-final`.
