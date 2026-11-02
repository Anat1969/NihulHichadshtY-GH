# ניהול התחדשות עירונית – אשדוד

A Hebrew RTL web app for managing Ashdod's pinui-binui (urban renewal) projects, from feasibility to occupancy. Imported once from a Lovable prototype; **this repo is now the only source of truth: never sync or push back to Lovable.**

**Hosting:** Vercel (`vercel.json`: SPA rewrites, immutable asset caching, security headers). The build reads the Supabase publishable config from `.env`.

**Stack:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui · Supabase (Postgres + edge functions) · Recharts · Vitest.

## Commands
- `npm run dev` runs the dev server on :8080.
- `npm run verify` runs typecheck + unit tests + production build. Run it before every commit.
- `npm run screenshots` takes visual checks with mocked data (see `.claude/skills/verify-app`).

## Project skills (`.claude/skills/`)
- `urban-renewal-domain`: stages, forums, data model, Hebrew terms. Read it before changing business logic.
- `intelligence-engine`: health score, forecasts, alerts, Command Center.
- `rtl-design-system`: tokens, dark mode, RTL and mobile rules.
- `verify-app`: how to verify UI changes end to end.

## Map
- `src/pages/`: route screens. All routes except `/` are lazy-loaded in `src/App.tsx`.
- `src/pages/CommandCenterPage.tsx` is the smart command center (`/command-center`).
- `src/lib/intelligence/` holds the pure analytics engine, with unit tests.
- `src/hooks/use*.ts` hold the Supabase data hooks.
- `src/components/SmartAssistant.tsx` is the Yohan AI assistant UI. Its backend is `supabase/functions/assistant-chat`.
- `src/context/ProjectContext.tsx` is legacy localStorage state. Don't extend it.

## Rules
- UI copy is in Hebrew. Dates use `formatDate` (DD-MM-YYYY).
- Use design tokens only (no raw hex). Every screen must work in dark mode and at 390px width.
- Normalise free-text `risk_level` / `management_status` through the engine helpers.
- `.env` holds only the Supabase **publishable** key. Never commit service-role keys.
