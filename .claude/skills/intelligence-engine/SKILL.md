---
name: intelligence-engine
description: How the project health score, risk factors, permit forecast, portfolio alerts and daily brief are computed, and how to extend them safely. Use when touching src/lib/intelligence, the Command Center, ProjectHealthCard or IntelligenceStrip.
---

# Intelligence engine

`src/lib/intelligence/engine.ts` holds pure functions only: no React, no Supabase, and `today` is injectable. Tests live in `engine.test.ts`.

## Pipeline
1. `computeHealth(project, { tasks, stageDates, today })` → `score` 0–100. It starts at 100 and subtracts each `RiskFactor.impact`:
   - blocker −22 · stuck −20 / on_hold −12 · high risk −18 / medium −8
   - overdue next action −4…−16 (scales by weeks) · no next action −6
   - stale update −6 (>14d) / −12 (>30d) / −18 (>60d)
   - overdue tasks −3 each (max −12) · blocked tasks −4 each (max −12)
   - stage overrun vs `STAGE_BENCHMARK_DAYS`: −4 (>1.2×) / −10 (>1.5×) / −15 (>2×), else stage_late from planned_end
   Grades: A ≥85 מצוין · B ≥70 תקין · C ≥50 דורש תשומת לב · D <50 קריטי.
2. `forecastPermit(project, health, today)` sums the benchmark days of the stages left before `permit`, credits time already spent in the current stage, and multiplies by a slowdown factor (blocker +0.35, stuck +0.5, on_hold +0.25, high risk +0.25, overrun +0.15).
3. `analyzePortfolio(projects, opts)` → avg health, grade counts, permit pipeline buckets, phase funnel, quarter×phase heatmap, action queue (severity × impact × log units × sickness), alerts (systemic blocker shared by ≥2 projects, quarter avg <55, stale data, critical projects).
4. `buildDailyBrief(insights)` → plain-text Hebrew brief for copying, downloading or sending.

## Hooks and UI
- `usePortfolioIntelligence()` joins `useProjects` + `useTasks` + `useAllStageDates`. All three are React Query hooks with shared keys (`['projects']`, `['tasks', id|'all']`, `['stage-dates', id|'all']`), so every screen reuses one request per table. After a write, invalidate the key prefix (`PROJECTS_KEY` / `TASKS_KEY` / `STAGE_DATES_KEY`); don't add window events.
- `analyzePortfolio` indexes tasks and stage dates by project once and groups rows by quarter/phase in one pass. Keep it O(n): no `.find`/`.filter` over all rows inside per-project loops.
- Pipeline buckets have stable `key`s (`reached`, `within_1y`, …). Look them up by key, never by label or index.
- `/command-center` → `src/pages/CommandCenterPage.tsx`. Dashboard teaser → `IntelligenceStrip`. Project page → `ProjectHealthCard`.

## Extending
- Add the new factor in `computeHealth` with an `add(key, label, detail, impact, recommendation)` call. Keep the Hebrew copy short and the recommendation actionable.
- Add a unit test with a fixed `TODAY` for every new rule, then run `npm test`.
- Benchmarks are planning heuristics. Label forecasts as estimates in the UI.
