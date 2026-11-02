---
name: verify-app
description: Verify a change end to end — typecheck, unit tests, production build, then headless screenshots of key routes in light/dark and desktop/mobile with Supabase mocked by fictional fixtures. Use before every commit that touches UI or logic, and when asked to run or screenshot the app.
---

# Verify the app

```bash
npm install          # once
npm run verify       # tsc + vitest + vite build
npm run screenshots  # writes screenshots/*.png (git-ignored)
```

## How screenshots work (`scripts/screenshot.mjs`)
- Serves `dist/` with `vite preview` on 127.0.0.1:4179.
- Intercepts every `*.supabase.co/rest/v1/<table>` request and answers from `scripts/fixtures/mock-data.mjs` (fictional demo projects, tasks and stage dates). It supports `id=eq.` / `project_id=eq.` filters and single-object requests.
- Aborts all other third-party requests (fonts and so on), so it runs offline and in sandboxes.
- Routes: `/`, `/command-center`, `/project/demo-2`, each × light/dark × 1440px/390px.
- Exits non-zero on any uncaught page error.
- Playwright is resolved via `require('playwright')`. If it is installed globally, run with `NODE_PATH=$(npm root -g)`.

## Checklist after viewing the PNGs
- No horizontal scroll at 390px (`document.documentElement.scrollWidth === 390`).
- Dark mode: no white-on-white or black-on-black text, and cards are distinguishable.
- Hebrew reads right-to-left, numbers use `tabular-nums`, and dates are `DD-MM-YYYY`.
- To add a route, add it to `ROUTES` and add any tables it reads to the fixtures.
