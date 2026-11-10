# Zenvora Education – School app

Vue 3 + Vite + TypeScript + Vue Router + Pinia + Tailwind CSS 4. The school-side web app (staff
portal and student portal) for the Zenvora API (`zenvora_education_backend`, NestJS).

> The `main` branch still talks to the old Frappe backend. This branch (`new-backend`) moves the
> app to the Zenvora API.

## Run

Start the API first (see the backend README: `npm run db:start`, then `npm run start:dev`), then:

```bash
npm install
npm run dev            # http://localhost:3002, proxies /api to the API (default http://localhost:3000)
```

Set `API_PROXY_TARGET` in `.env` if the API runs elsewhere.

Sign in with the school code and a member's email and password. The demo data from
`npm run db:seed` gives, for school code `DPS` (or `GVS`), password `School@12345`:

| Email                  | Sees                                  |
| ---------------------- | ------------------------------------- |
| `principal@dps.edu.in` | everything (school admin)             |
| `teacher@dps.edu.in`   | the 5 sections they teach             |
| `accounts@dps.edu.in`  | students and fees                     |
| `student@dps.edu.in`   | own timetable, attendance, results, fees |

On a school's own web address (e.g. `dps.zenvora.com`) the login page recognises the school and
doesn't ask for the code.

The Zenvora admin panel's **Log in as** opens `/impersonate` here; a yellow banner shows while a
platform admin is signed in as someone, with an **End session** button.

## Build

```bash
npm run typecheck      # vue-tsc against tsconfig.app.json
npm run build          # type-checks, then writes dist/
```

Serve `dist/` on the school's address with `/api` reverse-proxied to the API and other paths
falling back to `index.html`. Sign-in uses httpOnly cookies set by the API, so the app and `/api`
must share an origin.

## Layout

- `src/lib/api.ts` – typed client for the API (cookie auth, automatic token refresh);
  `src/lib/types.ts` – response types; `src/lib/format.ts` – money (API amounts are paise), dates
- `src/stores/session.ts` – who is signed in, the school, and the role (from the API)
- `src/router.ts` – routes, the sign-in guard and per-role access
- `src/components/ResourcePage.vue` – config-driven list page (Add / Edit modal, checkboxes, bulk delete)
- `src/components/DataTable.vue` – search, sort, pagination, selection
- `src/pages/` – one file per screen; `src/pages/settings/` – the Settings sections;
  `attendance/`, `exams/`, `fees/` – marking, marks entry and invoice screens

The previous Next.js/React version is preserved at the git tag `react-final`.
