# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

This is a **monorepo with two apps**:
- Repo root (`src/app`, `src/components`, `prisma/`): the Next.js 15 web app — public marketing site, rider/driver/merchant web dashboards, the `/intellects` admin panel, and the API backend under `src/app/api/`. This is the primary app for most work.
- `expo-app/`: a separate React Native (Expo) mobile app that talks to the same backend. It has its own `package.json` and is excluded from the Next.js build (`serverExternalPackages` / dev-directory exclusion in `next.config.ts`). Don't assume root-level commands apply there — `cd expo-app` first.

The root `README.md` describes the Expo mobile app, not the Next.js root — treat it as belonging to `expo-app/`, not as documentation for this app.

## Design guidance (auto-load)

**Before writing or redesigning any marketing/landing/portfolio/auth-screen UI**, read `skills/design-taste-frontend/SKILL.md` and follow it. It is an anti-slop frontend methodology: brief inference, a design-variance/motion/density dial system, banned AI-default patterns (gradient purple, beige+brass palettes, eyebrow overuse, em-dashes, centered-hero bias, fake screenshots), and a real design-system routing table. Section 13 of that skill explicitly excludes dense product UI (data tables, dashboards, admin panels) — for those, follow the existing shadcn/ui conventions already used under `src/components/ui/` and `src/components/dashboard/`, not the tasteskill's landing-page rules.

## Commands

```bash
npm run dev              # start dev server on :3000 (Turbopack)
npm run build             # production build
npm run lint               # eslint

npm run db:push            # push Prisma schema to the local/dev DB (bash script, no migrations dir — schema changes need this to take effect)
npm run db:push:prod       # push to prod DB
npm run db:generate        # regenerate Prisma client
npm run db:seed            # seed admin user (bun prisma/seed-admin.ts)

npm run verify              # bun scripts/verify-all.ts — runs every verification suite in sequence
npm run verify:intelligence # only suites matching "intelligence"
npm run verify:journeys     # only suites matching "journey"
```

There is no unit test runner (no jest/vitest config). Correctness is checked via:
- `npx tsc --noEmit` — the build has `typescript: { ignoreBuildErrors: true }` in `next.config.ts`, so a green `next build` does **not** mean the types are clean. Run `tsc --noEmit` directly and triage before trusting a build.
- `scripts/verify-*.ts` — end-to-end harnesses that hit a **live Supabase database** (rider journeys, dispatch/reputation, fraud, delivery flows, intelligence engines, admin APIs). Run individually with `bun scripts/verify-<name>.ts`, or via `npm run verify [filter]`. These suites run sequentially with a pause between them by design — they each open their own Prisma client against the Supabase pooler, and running them concurrently exhausts the pool and produces false failures.
- There is no local Prisma migrations directory. Schema edits in `prisma/schema.prisma` only take effect after `npm run db:push` (or `:prod`) against a reachable database.

## Architecture

### Auth & routing surfaces
Three distinct, independently-styled surfaces exist in `src/app`, and they intentionally do **not** share a design system:
- **Public marketing site** — `/`, `/about`, `/blog`, `/contact`, `/help`, `/privacy`, `/terms`, `/delete-account`. Uses the shared components in `src/components/marketing/` (`MarketingHeader`, `MarketingFooter`, `Section`, `SectionHeading`) and a light/dark toggle scoped to `[data-marketing]` CSS tokens defined in `src/app/globals.css`, independent of the app-wide dark theme.
- **Auth screens** — `/auth/login`, `/auth/signup`, `/forgot-password`, `/reset-password`, `/intellects/admin` (admin login), `/intellects/reset-password`. Share `src/components/auth/AuthShell.tsx` and `AuthField.tsx`, always dark, not theme-toggleable.
- **App/dashboard/admin** — rider, driver, merchant dashboards and the `/intellects` admin panel (`src/components/dashboard/`, `src/components/admin/`). Forced dark via `ThemeProvider` (`src/components/providers.tsx`, `defaultTheme="dark"`, `enableSystem={false}`) and `className="dark"` on `<html>` in `src/app/layout.tsx`. Do not extend the marketing site's light/dark tokens here — it's a distinct scope by design.

The admin login lives at `/intellects/admin` (moved from `/admin/*` for obscurity; stale `/admin/*` and `/intellects/login` URLs 308-redirect there — see `next.config.ts`). `ADMIN_DASHBOARD_CONFIG` (`src/lib/config/admin-access.ts`) and `MOBILE_APP_CONFIG` (`src/lib/config/mobile-access.ts`) hold cross-cutting config for those surfaces.

### Real-time layer
`SocketProvider` (`src/components/smart-ride/context/socket-context.tsx`) auto-connects to Supabase Realtime on mount using the auth token from `localStorage` (`accessToken`, falling back to legacy `smart_ride_auth_token`), giving one shared connection across tabs/components rather than each consumer connecting independently. It's wired in globally via `Providers` in `src/components/providers.tsx`.

### Data layer
Prisma (`prisma/schema.prisma`) against Supabase Postgres, accessed through the pooler. No local migrations — schema changes are applied with `db:push`, which means schema drift between environments is possible; check `prisma/schema.prisma` against the live DB state before assuming a field exists.

### Intelligence/scoring subsystems
Fraud, dispatch, reputation, and device-trust engines exist as verification-tested subsystems (see the `verify-*` suite names) surfaced through admin dashboard APIs — some of these engines are built but not wired to a live scheduler; check for an actual cron/trigger before assuming a "detected" state updates automatically.
