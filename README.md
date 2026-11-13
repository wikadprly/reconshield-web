# ReconShield Web

Next.js 16 administration dashboard for the final-year project **“Penerapan Algoritme Random Forest dan Dynamic Tarpit dalam Mitigasi Serangan Reconnaissance.”**

## Architecture

The web repository is intentionally separate from model training and privileged network operations:

`MikroTik CHR → NetFlow/IPFIX → Python preprocessing → Random Forest API → mitigation decision → RouterOS REST API → database → ReconShield Web`

- **Browser:** renders dashboards and submits administrator intent.
- **Next.js:** App Router pages and server-side integration.
- **Python service:** owns preprocessing and Random Forest inference. Model training does not run in the browser.
- **Backend integration:** owns database access, RouterOS credentials, and privileged commands.
- **Mock data:** lives in `src/data/mock-security.ts` and is visibly labeled throughout the interface.
- **Service boundary:** server-only calls live in `src/services/security-service.ts`.

Data flow: `route/Server Component → src/services/security-service.ts → src/db/repositories/* and/or remote clients → ApiResult<T>`. Every result carries a `source` (`database` | `remote` | `mock`) so mock data stays clearly labeled.

## Stack

- Next.js 16 with App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Recharts
- Lucide React
- MySQL 8.4 (kompatibel MariaDB 10.11+) with Prisma 7 (`@prisma/adapter-mariadb` driver adapter)

## Prerequisites

- Node.js 22.
- pnpm **10.34.3** — pinned via the `packageManager` field in `package.json`. If `pnpm` is not on your `PATH`, run it through Corepack (`corepack pnpm ...`).

## Local development

1. Install dependencies:

   ```bash
   pnpm install
   # or, if pnpm is not installed globally:
   corepack pnpm install
   ```

2. Configure the environment: copy `.env.example` to `.env` and fill in the values. All variables are **server-only** — never prefix a secret with `NEXT_PUBLIC_`.

   ```bash
   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/reconshield"
   PYTHON_ML_API_URL=""
   MIKROTIK_API_URL=""
   MIKROTIK_USERNAME=""
   MIKROTIK_PASSWORD=""
   RECONSHIELD_USE_MOCK_DATA="true"
   RECONSHIELD_ENABLE_ROUTER_WRITES="false"
   RECONSHIELD_MAX_ROUTER_WRITES_PER_MINUTE="5"
   RECONSHIELD_ENABLE_WORKER="false"
   RECONSHIELD_WORKER_INTERVAL_MS="10000"
   ```

   Mock data is used unless `RECONSHIELD_USE_MOCK_DATA` is exactly `"false"`.

3. Generate the Prisma Client (required after install and after schema edits):

   ```bash
   pnpm db:generate
   ```

4. Start development:

   ```bash
   pnpm dev
   ```

5. Open `http://localhost:3000`.

The database is optional for local UI work: with no `DATABASE_URL` (or no reachable database) the app falls back to clearly-labeled mock data.

## Commands

```bash
pnpm dev          # Next.js development server
pnpm build        # Production build
pnpm start        # Run the production build
pnpm lint         # TypeScript validation (tsc --noEmit)
pnpm format       # Format source files with oxfmt

pnpm db:generate  # Generate the Prisma Client into src/generated/prisma
pnpm db:push      # Push the schema to the database (no migration file)
pnpm db:migrate   # Create and apply a migration
pnpm db:studio    # Open Prisma Studio
```

## Dynamic Tarpit write path (A4)

The Dynamic Tarpit write path is implemented (decision **A20**, **Design A** — tarpit executed by RouterOS `action=tarpit` via REST API, per proposal §6.2). `applyTarpitForDetection` runs the guardrails in `src/lib/tarpit-guard.ts`, writes the address-list entry through `src/services/mikrotik-service.ts`, and records the entry + audit entry in one transaction (`tarpit.repo.ts`); `releaseTarpitIp` removes the address-list entry and marks the entry Released. `requestMitigationMode` and `requestIpRelease` are now functional wrappers rather than throwing stubs.

Writes are gated by `RECONSHIELD_ENABLE_ROUTER_WRITES` and rate-limited by `RECONSHIELD_MAX_ROUTER_WRITES_PER_MINUTE` (`src/lib/rate-limit.ts`). When the router is absent or writes are disabled, the entry is stored as `Pending` with an honest detail — never claimed as applied.

Database state (verified 27 Okt 2026): the `init` migration (`20261016123221_init`) **has been applied** and `prisma/seed.mjs` **has been run** (9 detections, 5 tarpit entries, 2 model evaluations, 2 service statuses, 0 users).

## Realtime + background mitigation worker (B2/B3, 13 Nov 2026)

Views poll through `useApiResult(path, { refreshMs })` — Dashboard, Threat Logs,
Active Tarpit, Approvals and the topbar notifications refresh every 5–10 s without a
page reload. There is no SSE/WebSocket; polling is the agreed mechanism.

Set `RECONSHIELD_ENABLE_WORKER="true"` to start the background worker
(`src/services/tarpit-worker.ts`, launched from `src/instrumentation.ts`). Each tick
looks for `Reconnaissance` detections still `Pending`, at/above the policy threshold,
with no approval yet:

- **mode Automatic** → `applyTarpitForDetection` (guardrail + rate limit still apply);
- **mode Manual** → creates a pending approval, which the Approval Center picks up.

It is idempotent: a detection that already has an approval is never re-queued, and a
source IP already under tarpit has its detection marked `TARPIT` instead of being
written twice. The router gate (`RECONSHIELD_ENABLE_ROUTER_WRITES`) and the per-minute
write limit still apply, so a disabled router yields an honest `Pending` entry.
`RECONSHIELD_WORKER_INTERVAL_MS` (default 10000, clamped 2000–300000) sets the cadence.

## Security

Never add MikroTik credentials, API secrets, or privileged router commands to `NEXT_PUBLIC_*` variables or Client Components. All backend calls belong in `src/services/security-service.ts`, which is server-only.
