---
name: urban-renewal-domain
description: Domain knowledge for the Ashdod pinui-binui (urban renewal) management system — the 24 project stages, phases A–E, the three forums, Supabase tables and Hebrew terminology. Use before changing any business logic, stage handling, project fields, forums, reports or Hebrew copy.
---

# Urban renewal (פינוי־בינוי) domain

## Process model — `src/types/project.ts`
`STAGES` is the single source of truth: 24 ordered stages grouped into phases.

| Phase | Label | Stages (order) |
|---|---|---|
| A | טרום תכנון | pre_feasibility(1) → resident_agreements 66%(2) → resident_committee(3) → developer_selection(4) → architect_team(5) |
| B | תב"ע / תמ"ל | taba_preparation(6) … taba_published(12) |
| C | בינוי ורישוי | forum1_harmonika(13) → binui_post_forum1 → forum2_consultants → design_review_pre_forum3 → forum3_committee_prep → committee_decision(18) |
| D | היתר | licensing_prep(19) → submission → completion_rounds → permit(22) |
| E | ביצוע | execution(23) → occupancy(24) |

Never hard-code stage names; use `getStageName`, `getStageOrder`, `PHASE_LABELS`.

## Forums
- **פורום 1 – הרמוניקה**: 10 urban-design checks (`FORUM1_CHECK_ITEMS`), red/yellow/green.
- **פורום 2 – יועצים**: 11 reviewers (`FORUM2_REVIEWERS`), statuses not_sent → approved.
- **פורום 3 – הכנה לוועדה**: social/environmental/operational summary + recommendation.

## Data (Supabase — `src/integrations/supabase/types.ts`)
Live data is in Supabase. `src/context/ProjectContext.tsx` is a legacy localStorage layer; don't build new features on it.
- `projects`: `project_name, main_stage, sub_stage, quarter (רובע), units_in, units_out, main_blocker, risk_level, management_status, next_action, next_action_owner, next_action_due_date, last_update, plan_number, iplan_object_id`.
- `project_stage_dates`: planned/actual start/end per stage (feeds the forecasts).
- `tasks`, `meetings`, `decisions`, `reminders`, `tama_sites`, `project_assets`, `audit_log`.
- Free-text enums: `risk_level` can be `high|medium|low` **or** Hebrew (`גבוה`, `גבוהה`, `בינוני`…); `management_status` can be `stuck|on_hold|active` **or** `תקוע|מושהה`. Always go through `normalizeRisk` / `normalizeStatus` in `src/lib/intelligence/engine.ts`.

## Edge functions (`supabase/functions/`)
`assistant-chat` (the Yohan AI agent), `generate-expert-opinion`, `analyze-document-import`, `import-actions-extract`, `import-excel-dates`, `iplan-fetch`, `iplan-documents`.

## Conventions
- UI language is Hebrew, RTL. Dates are shown as `DD-MM-YYYY` via `formatDate` (`src/lib/dateUtils.ts`).
- "יח"ד" = housing units. Multiplier = units_out / units_in. Levy potential = units_out × ₪25,000 (`VALUE_PER_UNIT`).
- Open the Yohan assistant from anywhere: `window.dispatchEvent(new CustomEvent('open-yohan-ai', { detail: { action: 'summary' } }))`.
