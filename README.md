# ReconShield Web

Next.js 16 administration dashboard for the final-year project **“Penerapan Algoritma Random Forest dan Dynamic Tarpit Firewall dalam Mitigasi Serangan Reconnaissance.”**

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
- PostgreSQL with Prisma 7 (`@prisma/adapter-pg` driver adapter)

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
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/reconshield?schema=public"
   PYTHON_ML_API_URL=""
   MIKROTIK_API_URL=""
   MIKROTIK_USERNAME=""
   MIKROTIK_PASSWORD=""
   RECONSHIELD_USE_MOCK_DATA="true"
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

## Read-only phase

This is currently a **read-only** phase. `requestMitigationMode` and `requestIpRelease` in `src/services/security-service.ts` intentionally throw. Do not wire them to the UI or claim a mitigation happened until writes are implemented and audited. No migration has been applied and no seed data exists yet.

## Security

Never add MikroTik credentials, API secrets, or privileged router commands to `NEXT_PUBLIC_*` variables or Client Components. All backend calls belong in `src/services/security-service.ts`, which is server-only.
