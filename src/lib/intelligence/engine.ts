/**
 * Urban-renewal intelligence engine.
 *
 * Pure, deterministic functions (no React, no Supabase) that turn raw project
 * rows into health scores, risk factors, permit forecasts, portfolio insights
 * and a prioritised action queue. Everything takes an injectable `today` so it
 * is fully unit-testable. See `engine.test.ts`.
 */
import { STAGES, PHASE_LABELS, type StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';

// ───────────────────────── Input shapes (decoupled from DB types) ─────────────────────────

export interface IntelProject {
  id: string;
  project_name: string;
  main_stage: string | null;
  main_blocker: string | null;
  risk_level: string | null;
  management_status: string | null;
  next_action: string | null;
  next_action_due_date: string | null;
  next_action_owner?: string | null;
  last_update: string | null;
  updated_at: string;
  quarter: string | null;
  units_in: number | null;
  units_out: number | null;
}

export interface IntelTask {
  project_id: string;
  status: string;
  deadline: string | null;
}

export interface IntelStageDate {
  project_id: string;
  stage_id: string;
  actual_start: string | null;
  actual_end: string | null;
  planned_end: string | null;
}

// ───────────────────────── Domain constants ─────────────────────────

/**
 * Typical duration (days) of each stage in an Israeli pinui-binui process.
 * These are planning heuristics used for forecasting, not statutory deadlines.
 */
export const STAGE_BENCHMARK_DAYS: Record<StageId, number> = {
  pre_feasibility: 90,
  resident_agreements: 240,
  resident_committee: 60,
  developer_selection: 150,
  architect_team: 60,
  taba_preparation: 270,
  taba_submission: 45,
  taba_validation: 60,
  taba_deposit: 120,
  taba_objections: 150,
  taba_approval: 120,
  taba_published: 45,
  forum1_harmonika: 45,
  binui_post_forum1: 45,
  forum2_consultants: 60,
  design_review_pre_forum3: 30,
  forum3_committee_prep: 30,
  committee_decision: 45,
  licensing_prep: 90,
  submission: 30,
  completion_rounds: 120,
  permit: 0,
  execution: 1095,
  occupancy: 0,
};

/** Approximate municipal value per planned unit used by the dashboard (₪). */
export const VALUE_PER_UNIT = 25_000;

const DAY = 86_400_000;

export type Grade = 'A' | 'B' | 'C' | 'D';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const GRADE_META: Record<Grade, { label: string; tone: 'green' | 'blue' | 'orange' | 'red' }> = {
  A: { label: 'מצוין', tone: 'green' },
  B: { label: 'תקין', tone: 'blue' },
  C: { label: 'דורש תשומת לב', tone: 'orange' },
  D: { label: 'קריטי', tone: 'red' },
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
};

// ───────────────────────── Normalisers ─────────────────────────

export type RiskLevel = 'high' | 'medium' | 'low' | 'none';
export type MgmtStatus = 'stuck' | 'on_hold' | 'active' | 'unknown';

export function normalizeRisk(raw: string | null | undefined): RiskLevel {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return 'none';
  if (['high', 'גבוה', 'גבוהה', 'critical', 'קריטי'].includes(v)) return 'high';
  if (['medium', 'בינוני', 'בינונית', 'mid'].includes(v)) return 'medium';
  if (['low', 'נמוך', 'נמוכה'].includes(v)) return 'low';
  return 'none';
}

export function normalizeStatus(raw: string | null | undefined): MgmtStatus {
  const v = (raw || '').trim().toLowerCase();
  if (['stuck', 'תקוע'].includes(v)) return 'stuck';
  if (['on_hold', 'מושהה', 'hold'].includes(v)) return 'on_hold';
  if (['active', 'פעיל'].includes(v)) return 'active';
  return 'unknown';
}

export function isStageId(v: string | null | undefined): v is StageId {
  return !!v && STAGES.some(s => s.id === v);
}

export function stageOf(p: Pick<IntelProject, 'main_stage'>): StageId {
  return isStageId(p.main_stage) ? p.main_stage : 'forum1_harmonika';
}

export function phaseOf(stage: StageId): string {
  return STAGES.find(s => s.id === stage)?.phase ?? 'C';
}

/** Local calendar day (midnight) — all comparisons are day-granular. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

/** Parses 'YYYY-MM-DD' as a local calendar day (not UTC); other ISO strings normally. */
function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// ───────────────────────── Health ─────────────────────────

export interface RiskFactor {
  key: string;
  label: string;
  detail: string;
  impact: number; // points deducted
  severity: Severity;
  recommendation: string;
}

export interface ProjectHealth {
  projectId: string;
  score: number; // 0-100
  grade: Grade;
  factors: RiskFactor[];
  daysInStage: number | null;
  stageOverrunRatio: number | null;
  daysSinceUpdate: number | null;
}

function severityFor(impact: number): Severity {
  if (impact >= 18) return 'critical';
  if (impact >= 10) return 'high';
  if (impact >= 5) return 'medium';
  return 'low';
}

export function gradeFor(score: number): Grade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export function computeHealth(
  p: IntelProject,
  opts: { today?: Date; tasks?: IntelTask[]; stageDates?: IntelStageDate[] } = {},
): ProjectHealth {
  const today = opts.today ?? new Date();
  const factors: RiskFactor[] = [];
  const add = (key: string, label: string, detail: string, impact: number, recommendation: string) => {
    if (impact <= 0) return;
    factors.push({ key, label, detail, impact, severity: severityFor(impact), recommendation });
  };

  // Blocker
  const blocker = (p.main_blocker || '').trim();
  if (blocker) {
    add('blocker', 'חסם פעיל', blocker, 22, 'לכנס ישיבת הסרת חסם עם הגורם האחראי ולקבוע בעלים ותאריך יעד');
  }

  // Risk level
  const risk = normalizeRisk(p.risk_level);
  if (risk === 'high') add('risk', 'סיכון גבוה', 'הפרויקט סומן ברמת סיכון גבוהה', 18, 'להכין תכנית מיתון סיכונים ולהציג בפורום הקרוב');
  else if (risk === 'medium') add('risk', 'סיכון בינוני', 'הפרויקט סומן ברמת סיכון בינונית', 8, 'לעקוב שבועית אחר גורמי הסיכון');

  // Management status
  const status = normalizeStatus(p.management_status);
  if (status === 'stuck') add('status', 'פרויקט תקוע', 'סטטוס ניהולי: תקוע', 20, 'להסלים לדרג מנהל אגף ולהגדיר מסלול חילוץ');
  else if (status === 'on_hold') add('status', 'פרויקט מושהה', 'סטטוס ניהולי: מושהה', 12, 'לבדוק את סיבת ההשהיה ולקבוע מועד חידוש');

  // Next action
  const due = parseDate(p.next_action_due_date);
  if (!(p.next_action || '').trim()) {
    add('no_next_action', 'אין פעולה הבאה', 'לא הוגדרה פעולה הבאה לפרויקט', 6, 'להגדיר פעולה הבאה, אחראי ותאריך יעד');
  } else if (due) {
    const overdue = daysBetween(due, today);
    if (overdue > 0) {
      const impact = clamp(4 + Math.floor(overdue / 7) * 3, 4, 16);
      add('overdue_action', 'פעולה באיחור', `"${p.next_action}" באיחור של ${overdue} ימים`, impact, `לברר מול ${p.next_action_owner || 'האחראי'} ולעדכן תאריך יעד ריאלי`);
    }
  }

  // Staleness
  const lu = parseDate(p.last_update) ?? parseDate(p.updated_at);
  const daysSinceUpdate = lu ? Math.max(0, daysBetween(lu, today)) : null;
  if (daysSinceUpdate !== null) {
    const impact = daysSinceUpdate > 60 ? 18 : daysSinceUpdate > 30 ? 12 : daysSinceUpdate > 14 ? 6 : 0;
    add('stale', 'מידע לא עדכני', `עודכן לאחרונה לפני ${daysSinceUpdate} ימים`, impact, 'לבקש עדכון סטטוס מהיזם / עורך התכנית');
  }

  // Tasks
  const tasks = (opts.tasks || []).filter(t => t.project_id === p.id);
  const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'done');
  // A task due today is not overdue yet.
  const overdueTasks = openTasks.filter(t => {
    const d = parseDate(t.deadline);
    return d && daysBetween(d, today) > 0;
  });
  const blockedTasks = openTasks.filter(t => t.status === 'blocked');
  if (overdueTasks.length) {
    add('overdue_tasks', 'משימות באיחור', `${overdueTasks.length} משימות פתוחות עברו את המועד`, clamp(overdueTasks.length * 3, 3, 12), 'לעבור על המשימות ולתעדף או לסגור');
  }
  if (blockedTasks.length) {
    add('blocked_tasks', 'משימות חסומות', `${blockedTasks.length} משימות במצב חסום`, clamp(blockedTasks.length * 4, 4, 12), 'לזהות את הגורם החוסם בכל משימה');
  }

  // Stage overrun
  const stage = stageOf(p);
  let daysInStage: number | null = null;
  let stageOverrunRatio: number | null = null;
  const sd = (opts.stageDates || []).find(d => d.project_id === p.id && d.stage_id === stage);
  const start = parseDate(sd?.actual_start);
  if (start && !sd?.actual_end) {
    daysInStage = Math.max(0, daysBetween(start, today));
    const bench = STAGE_BENCHMARK_DAYS[stage];
    if (bench > 0) {
      stageOverrunRatio = Math.round((daysInStage / bench) * 100) / 100;
      const impact = stageOverrunRatio > 2 ? 15 : stageOverrunRatio > 1.5 ? 10 : stageOverrunRatio > 1.2 ? 4 : 0;
      add('stage_overrun', 'חריגה משך שלב', `${daysInStage} ימים בשלב (נורמה ~${bench})`, impact, 'לבחון מה מעכב את סגירת השלב ולעדכן את תכנית הזמנים');
    }
  }
  const plannedEnd = parseDate(sd?.planned_end);
  if (plannedEnd && !sd?.actual_end && daysBetween(plannedEnd, today) > 0 && !factors.some(f => f.key === 'stage_overrun')) {
    const late = daysBetween(plannedEnd, today);
    add('stage_late', 'שלב באיחור לתכנון', `סיום מתוכנן עבר לפני ${late} ימים`, clamp(4 + Math.floor(late / 30) * 2, 4, 12), 'לעדכן תאריך סיום מתוכנן או להאיץ');
  }

  factors.sort((a, b) => b.impact - a.impact);
  const score = clamp(Math.round(100 - factors.reduce((s, f) => s + f.impact, 0)), 0, 100);
  return { projectId: p.id, score, grade: gradeFor(score), factors, daysInStage, stageOverrunRatio, daysSinceUpdate };
}

// ───────────────────────── Forecast ─────────────────────────

export interface PermitForecast {
  projectId: string;
  reached: boolean;
  remainingStages: number;
  expectedDays: number;
  expectedDate: Date;
  slowdown: number;
  confidence: 'high' | 'medium' | 'low';
}

const PERMIT_ORDER = STAGES.find(s => s.id === 'permit')!.order;

export function forecastPermit(p: IntelProject, health: ProjectHealth, today: Date = new Date()): PermitForecast {
  const stage = stageOf(p);
  const order = STAGES.find(s => s.id === stage)!.order;
  if (order >= PERMIT_ORDER) {
    return { projectId: p.id, reached: true, remainingStages: 0, expectedDays: 0, expectedDate: today, slowdown: 1, confidence: 'high' };
  }
  const remaining = STAGES.filter(s => s.order >= order && s.order < PERMIT_ORDER);
  let days = remaining.reduce((s, st) => s + STAGE_BENCHMARK_DAYS[st.id], 0);
  // Credit time already spent in the current stage.
  if (health.daysInStage) days -= Math.min(health.daysInStage, STAGE_BENCHMARK_DAYS[stage]);

  let slowdown = 1;
  for (const f of health.factors) {
    if (f.key === 'blocker') slowdown += 0.35;
    if (f.key === 'status') slowdown += f.impact >= 20 ? 0.5 : 0.25;
    if (f.key === 'risk') slowdown += f.impact >= 18 ? 0.25 : 0.1;
    if (f.key === 'stage_overrun') slowdown += 0.15;
  }
  const expectedDays = Math.round(Math.max(days, 0) * slowdown);
  const confidence: PermitForecast['confidence'] =
    remaining.length <= 4 && slowdown < 1.3 ? 'high' : remaining.length <= 10 && slowdown < 1.7 ? 'medium' : 'low';
  return {
    projectId: p.id,
    reached: false,
    remainingStages: remaining.length,
    expectedDays,
    expectedDate: new Date(today.getTime() + expectedDays * DAY),
    slowdown: Math.round(slowdown * 100) / 100,
    confidence,
  };
}

export const CONFIDENCE_LABELS: Record<PermitForecast['confidence'], string> = {
  high: 'ודאות גבוהה',
  medium: 'ודאות בינונית',
  low: 'ודאות נמוכה',
};

// ───────────────────────── Portfolio ─────────────────────────

export interface ActionItem {
  projectId: string;
  projectName: string;
  title: string;
  detail: string;
  severity: Severity;
  priority: number;
  owner?: string | null;
}

export interface Alert {
  key: string;
  title: string;
  detail: string;
  severity: Severity;
  projectIds: string[];
}

export interface HeatCell {
  quarter: string;
  phase: string;
  count: number;
  avgHealth: number;
  projectIds: string[];
}

export interface PortfolioInsights {
  generatedAt: Date;
  projects: Array<{ project: IntelProject; health: ProjectHealth; forecast: PermitForecast }>;
  avgHealth: number;
  gradeCounts: Record<Grade, number>;
  totals: { projects: number; unitsIn: number; unitsOut: number; value: number; unitsAtRisk: number };
  permitPipeline: Array<{ label: string; units: number; projects: number }>;
  phaseFunnel: Array<{ phase: string; label: string; projects: number; units: number }>;
  heatmap: { quarters: string[]; phases: string[]; cells: HeatCell[] };
  actions: ActionItem[];
  alerts: Alert[];
}

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function analyzePortfolio(
  projects: IntelProject[],
  opts: { today?: Date; tasks?: IntelTask[]; stageDates?: IntelStageDate[] } = {},
): PortfolioInsights {
  const today = opts.today ?? new Date();
  const rows = projects.map(project => {
    const health = computeHealth(project, { ...opts, today });
    return { project, health, forecast: forecastPermit(project, health, today) };
  });

  const n = rows.length || 1;
  const avgHealth = Math.round(rows.reduce((s, r) => s + r.health.score, 0) / n);
  const gradeCounts: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 };
  rows.forEach(r => gradeCounts[r.health.grade]++);

  const unitsIn = projects.reduce((s, p) => s + (p.units_in || 0), 0);
  const unitsOut = projects.reduce((s, p) => s + (p.units_out || 0), 0);
  const unitsAtRisk = rows.filter(r => r.health.grade === 'D').reduce((s, r) => s + (r.project.units_out || 0), 0);

  // Permit pipeline buckets
  const buckets = [
    { label: 'היתר ומעלה', test: (f: PermitForecast) => f.reached },
    { label: 'עד 12 חודשים', test: (f: PermitForecast) => !f.reached && f.expectedDays <= 365 },
    { label: '1–2 שנים', test: (f: PermitForecast) => !f.reached && f.expectedDays > 365 && f.expectedDays <= 730 },
    { label: '2–4 שנים', test: (f: PermitForecast) => !f.reached && f.expectedDays > 730 && f.expectedDays <= 1460 },
    { label: '4+ שנים', test: (f: PermitForecast) => !f.reached && f.expectedDays > 1460 },
  ];
  const permitPipeline = buckets.map(b => {
    const inB = rows.filter(r => b.test(r.forecast));
    return { label: b.label, projects: inB.length, units: inB.reduce((s, r) => s + (r.project.units_out || 0), 0) };
  });

  // Phase funnel
  const phases = Object.keys(PHASE_LABELS);
  const phaseFunnel = phases.map(ph => {
    const inPh = rows.filter(r => phaseOf(stageOf(r.project)) === ph);
    return { phase: ph, label: PHASE_LABELS[ph], projects: inPh.length, units: inPh.reduce((s, r) => s + (r.project.units_out || 0), 0) };
  });

  // Heatmap quarter × phase
  const quarters = Array.from(new Set(projects.map(p => (p.quarter || '').trim() || '—'))).sort((a, b) => a.localeCompare(b, 'he'));
  const cells: HeatCell[] = [];
  for (const q of quarters) {
    for (const ph of phases) {
      const inCell = rows.filter(r => ((r.project.quarter || '').trim() || '—') === q && phaseOf(stageOf(r.project)) === ph);
      cells.push({
        quarter: q,
        phase: ph,
        count: inCell.length,
        avgHealth: inCell.length ? Math.round(inCell.reduce((s, r) => s + r.health.score, 0) / inCell.length) : 0,
        projectIds: inCell.map(r => r.project.id),
      });
    }
  }

  // Action queue — the single most impactful factor per project, so one
  // project can't crowd out the list. Bigger and sicker projects float up.
  const actions: ActionItem[] = [];
  for (const r of rows) {
    const f = r.health.factors[0];
    if (f) {
      const unitsWeight = (1 + Math.log10(Math.max(r.project.units_out || 1, 1))) * (1 + (100 - r.health.score) / 100);
      actions.push({
        projectId: r.project.id,
        projectName: r.project.project_name,
        title: f.recommendation,
        detail: `${f.label}: ${f.detail}`,
        severity: f.severity,
        priority: Math.round(SEVERITY_WEIGHT[f.severity] * f.impact * unitsWeight),
        owner: r.project.next_action_owner,
      });
    }
  }
  actions.sort((a, b) => b.priority - a.priority);

  // Alerts / anomalies
  const alerts: Alert[] = [];
  const blockerGroups = new Map<string, string[]>();
  for (const p of projects) {
    const b = (p.main_blocker || '').trim();
    if (!b) continue;
    const key = b.replace(/\s+/g, ' ').slice(0, 40);
    blockerGroups.set(key, [...(blockerGroups.get(key) || []), p.id]);
  }
  for (const [b, ids] of blockerGroups) {
    if (ids.length >= 2) {
      alerts.push({ key: `systemic:${b}`, title: 'חסם מערכתי', detail: `"${b}" חוסם ${ids.length} פרויקטים במקביל — מומלץ טיפול רוחבי`, severity: ids.length >= 3 ? 'critical' : 'high', projectIds: ids });
    }
  }
  for (const q of quarters) {
    const inQ = rows.filter(r => ((r.project.quarter || '').trim() || '—') === q);
    if (inQ.length >= 2) {
      const avg = inQ.reduce((s, r) => s + r.health.score, 0) / inQ.length;
      if (avg < 55) {
        alerts.push({ key: `quarter:${q}`, title: `רובע ${q} בסיכון`, detail: `ציון בריאות ממוצע ${Math.round(avg)} ב-${inQ.length} פרויקטים`, severity: avg < 40 ? 'critical' : 'high', projectIds: inQ.map(r => r.project.id) });
      }
    }
  }
  const stale = rows.filter(r => (r.health.daysSinceUpdate ?? 0) > 30);
  if (stale.length >= Math.max(3, Math.ceil(rows.length * 0.25))) {
    alerts.push({ key: 'stale', title: 'נתונים מתיישנים', detail: `${stale.length} פרויקטים לא עודכנו יותר מ-30 יום`, severity: 'medium', projectIds: stale.map(r => r.project.id) });
  }
  const critical = rows.filter(r => r.health.grade === 'D');
  if (critical.length) {
    alerts.push({ key: 'critical', title: 'פרויקטים במצב קריטי', detail: `${critical.length} פרויקטים בציון מתחת ל-50 · ${unitsAtRisk.toLocaleString('he-IL')} יח"ד בסיכון`, severity: 'critical', projectIds: critical.map(r => r.project.id) });
  }
  alerts.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);

  return {
    generatedAt: today,
    projects: rows,
    avgHealth: rows.length ? avgHealth : 0,
    gradeCounts,
    totals: { projects: projects.length, unitsIn, unitsOut, value: unitsOut * VALUE_PER_UNIT, unitsAtRisk },
    permitPipeline,
    phaseFunnel,
    heatmap: { quarters, phases, cells },
    actions,
    alerts,
  };
}

// ───────────────────────── Daily brief ─────────────────────────

export function buildDailyBrief(ins: PortfolioInsights): string {
  const date = formatDate(ins.generatedAt);
  const lines: string[] = [];
  lines.push(`תדריך יומי – התחדשות עירונית אשדוד · ${date}`);
  lines.push('');
  lines.push(`• ציון בריאות תיק: ${ins.avgHealth}/100 (${GRADE_META[gradeFor(ins.avgHealth)].label})`);
  lines.push(`• ${ins.totals.projects} פרויקטים · ${ins.totals.unitsIn.toLocaleString('he-IL')} יח"ד קיימות → ${ins.totals.unitsOut.toLocaleString('he-IL')} מתוכננות`);
  lines.push(`• מצוין ${ins.gradeCounts.A} · תקין ${ins.gradeCounts.B} · דורש תשומת לב ${ins.gradeCounts.C} · קריטי ${ins.gradeCounts.D}`);
  const next12 = ins.permitPipeline.find(b => b.label === 'עד 12 חודשים');
  if (next12) lines.push(`• צפי היתרים ב-12 החודשים הקרובים: ${next12.projects} פרויקטים / ${next12.units.toLocaleString('he-IL')} יח"ד`);
  if (ins.alerts.length) {
    lines.push('');
    lines.push('התראות:');
    ins.alerts.slice(0, 5).forEach(a => lines.push(`  ⚠ ${a.title} — ${a.detail}`));
  }
  if (ins.actions.length) {
    lines.push('');
    lines.push('5 הפעולות החשובות היום:');
    ins.actions.slice(0, 5).forEach((a, i) => lines.push(`  ${i + 1}. ${a.projectName}: ${a.title}`));
  }
  return lines.join('\n');
}
