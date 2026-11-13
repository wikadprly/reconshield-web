# reconshield-web

Standalone Next.js 16 (App Router) admin dashboard for the final-year project
**"Penerapan Algoritme Random Forest dan Dynamic Tarpit dalam Mitigasi
Serangan Reconnaissance."** Styling uses Tailwind CSS v4 with a project theme
defined in `src/app/globals.css`. Screens read MariaDB/MySQL when it is configured and fall back
to clearly-labeled mock data otherwise; every result carries a `source` badge in the UI.

## Development

There is no Figma tooling. This is a plain Next.js project.

- Install dependencies: `pnpm install` (pnpm version is pinned in `package.json`).
- Configure environment: copy `.env.example` to `.env` and fill in values.
- Generate the Prisma Client: `pnpm db:generate` (required after install and after schema edits).
- Dev server: `pnpm dev` → http://localhost:3000
- Production: `pnpm build` then `pnpm start`
- Type check: `pnpm lint` (runs `tsc --noEmit`)
- Format: `pnpm format` (oxfmt)
- Database (MySQL 8.4 (kompatibel MariaDB 10.11+)): `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio`.
  The `init` migration is applied and `prisma/seed.mjs` loads sample data
  (mirrors the mock dataset) so the database path can be exercised end to end.

## Project Structure

- `src/app/layout.tsx` - root layout, loads the DM Sans font and `globals.css`
- `src/instrumentation.ts` - Next.js startup hook; starts the tarpit worker when enabled
- `src/app/page.tsx` - redirects `/` to `/dashboard`
- `src/app/(console)/` - route group that wraps every console page in `AppShell`
  - `layout.tsx` - mounts `AppShell`
  - `dashboard/`, `threat-logs/`, `active-tarpit/`, `ml-performance/`, `settings/` - one `page.tsx` per route
- `src/app/globals.css` - Tailwind v4 import plus all global CSS, CSS variables, and the design system
- `src/components/` - UI building blocks and feature views
  - `app-shell.tsx` - sidebar, topbar, notifications, profile menu, footer
  - `ui.tsx` - `Card`, `CardHeader`, `Badge`, `Button`, `MetricCard`, `MockNotice`
  - `modal.tsx` - reusable dialog
  - `dashboard-view.tsx`, `threat-logs-view.tsx`, `active-tarpit-view.tsx`, `settings-view.tsx` - client feature views
  - `traffic-chart.tsx`, `feature-importance-chart.tsx` - Recharts charts
  - `detection-table.tsx` - shared incident table
- `src/data/mock-security.ts` - all mock data
- `src/types/security.ts` - shared domain types (`Detection`, `TarpitEntry`, `AuditEntry`, `ServiceStatus`, `ModelMetrics`, `ApiResult`, `DataSource`)
- `src/lib/` - environment access (`env.ts`), fetch helper (`http.ts`), validators (`validation.ts`), tarpit guardrails (`tarpit-guard.ts`), router-write limiter (`rate-limit.ts`), background-worker decision (`tarpit-worker-policy.ts`)
- `src/db/` - server-only data access
  - `prisma.ts` - lazy `PrismaClient` singleton using the `@prisma/adapter-mariadb` driver adapter
  - `repositories/` - per-domain queries (`detection`, `tarpit`, `service`, `audit`, `ml`), mapping Prisma `Date` → ISO strings; `tarpit.repo.ts` also owns the write transactions (`applyTarpit`, `markTarpitReleased`, `markTarpitVerified`)
- `src/services/` - server-only integration boundary
  - `security-service.ts` - orchestration; returns `ApiResult<T>` with an honest `source` (`database` | `remote` | `mock`) and falls back to labeled mock data; owns `applyTarpitForDetection` / `releaseTarpitIp`
  - `tarpit-worker.ts` - background mitigation worker (Automatic → apply, Manual → approval); started from `src/instrumentation.ts` only when `RECONSHIELD_ENABLE_WORKER="true"`
  - `ml-service.ts` - read-only client for the Python ML API
  - `mikrotik-service.ts` - MikroTik RouterOS REST client; reads plus the gated, rate-limited tarpit writes
- `src/app/api/` - route handlers (`tarpit` GET/POST, `tarpit/[ip]` DELETE/POST, `approvals/[id]` PATCH, `settings` GET/PUT, `health` readiness probe; reads only for the rest)
- `prisma/schema.prisma`, `prisma.config.ts` - MariaDB/MySQL schema and Prisma 7 config
- `src/generated/prisma/` - generated Prisma Client (gitignored; run `pnpm db:generate`)
- `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` - build config (the `@/*` alias maps to `src/*`)

## Conventions

- Next.js App Router with React Server Components by default. Add `"use client"`
  only for components that use state, effects, or browser APIs.
- Use the `@/` import alias for everything under `src`.
- Reuse the existing components from `src/components/ui.tsx` before creating new ones.
- Style with the utility classes and CSS variables already defined in
  `src/app/globals.css`. Keep new global CSS there; prefer existing class names.
- Export components as default exports.
- Never place MikroTik credentials, API secrets, or privileged router commands in
  `NEXT_PUBLIC_*` variables or Client Components. Backend calls belong in
  `src/services/security-service.ts`.

## Backend Integration

- Server-only env vars (never `NEXT_PUBLIC_*`): `DATABASE_URL`,
  `PYTHON_ML_API_URL`, `MIKROTIK_API_URL`, `MIKROTIK_USERNAME`, `MIKROTIK_PASSWORD`.
- `RECONSHIELD_USE_MOCK_DATA` — mock data is used unless this is exactly `"false"`.
- The database is MySQL 8.4 (kompatibel MariaDB 10.11+). Prisma 7 requires the
  `@prisma/adapter-mariadb` driver adapter and a generated client under
  `src/generated/prisma` (gitignored).
- Data flow: route/Server Component → `src/services/security-service.ts` →
  `src/db/repositories/*` and/or remote clients → `ApiResult<T>`. Every result
  carries a `source`; mock data must stay clearly labeled in the UI.
- The Dynamic Tarpit write path (A4) is implemented. `applyTarpitForDetection`
  checks guardrails (`src/lib/tarpit-guard.ts`), writes the RouterOS address-list
  entry via `src/services/mikrotik-service.ts`, then records the entry + audit
  entry in one transaction (`tarpit.repo.ts`). `releaseTarpitIp` removes the
  address-list entry and marks the entry Released. `requestMitigationMode` and
  `requestIpRelease` are now functional wrappers, not throwing stubs.
  Decision **A20** is final (**Design A** — RouterOS `action=tarpit` via REST API,
  per proposal §6.2); the `init` migration is applied and `prisma/seed.mjs` has been run.
- Router writes stay gated by `RECONSHIELD_ENABLE_ROUTER_WRITES` and are
  rate-limited by `RECONSHIELD_MAX_ROUTER_WRITES_PER_MINUTE`
  (`src/lib/rate-limit.ts`). When the router is absent or writes are disabled the
  entry is stored as `Pending` with an honest detail instead of claiming success.
- The background mitigation worker (B3) is opt-in: `RECONSHIELD_ENABLE_WORKER="true"`
  starts it from `src/instrumentation.ts`, polling every
  `RECONSHIELD_WORKER_INTERVAL_MS` (default 10000). In mode **Automatic** it calls
  `applyTarpitForDetection`; in mode **Manual** it files an approval. It stays
  idempotent (`findWorkerCandidates` excludes detections that already have an
  approval; an IP already mitigated is marked, not rewritten) and still obeys the
  router gate and rate limit above.
- The dashboard is not push-based; views poll via `useApiResult(path, { refreshMs })`
  (5–10 s). Keep that pattern for new live views rather than adding SSE.
- Validate all external input with `src/lib/validation.ts` and show backend
  mitigation status rather than assuming success on the frontend.

## Code Quality

- Ensure JSX tags are closed and braces are balanced.
- Use double quotes for strings containing apostrophes, or escape them in
  single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Run `pnpm lint` after changes.
