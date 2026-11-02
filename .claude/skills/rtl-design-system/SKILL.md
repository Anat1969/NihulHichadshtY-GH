---
name: rtl-design-system
description: Visual language for this Hebrew RTL app — HSL tokens on Ashdod colours, light/dark themes, the card/chip/KPI utility classes and the intelligence primitives. Use when creating or restyling any screen or component.
---

# RTL design system

## Tokens (`src/index.css`)
- HSL CSS variables, with a `.dark` override block. Primary `--primary` (Ashdod blue #2196D3), `--secondary` (green), `--accent` (orange), `--destructive` (red).
- Status scale: `--status-green | --status-blue | --status-yellow (orange) | --status-red`. Use as `hsl(var(--status-red) / .12)` for tinted backgrounds.
- **Never** use raw hex in components. Use Tailwind token classes (`bg-card`, `text-muted-foreground`) or `hsl(var(--token))`.

## Theme
- `next-themes` `ThemeProvider` (class strategy, storage key `nihul-theme`) wraps the app in `src/App.tsx`. The toggle is `src/components/ThemeToggle.tsx`, in the Layout header.
- Every new surface must read well in both themes. Check with `npm run screenshots` (see the verify-app skill).

## Layout and RTL
- `<html dir="rtl">`. Use logical properties (`ms-/me-`, `borderInlineStart`), not left/right, when the side matters.
- Recharts is LTR internally. Wrap charts in `dir="ltr"`, use `reversed` on the X axis and `orientation="right"` on the Y axis.
- Mobile first: 390px viewport, **no horizontal page scroll**. Toolbars must `flex-wrap`. Wide tables go in `overflow-x-auto`.

## Utility classes
`premium-card`, `kpi-card`, `chip chip-{primary|success|warning|destructive|muted|accent}`, `data-table`, `page-header`, `caption`, `press-scale`, `btn-glow`, `hover-lift`, `animate-enter`.

## Intelligence primitives (`src/components/intelligence/primitives.tsx`)
`HealthRing` (animated score gauge), `GradeBadge`, `SeverityChip`, `ScoreBar`, plus the colour helpers `gradeColor`, `scoreColor`, `severityColor`. Reuse them for anything score- or risk-related.

## Type scale
Body 13px, captions 11–12px, section titles 15px bold, KPI numbers `text-2xl font-black tabular-nums`.
