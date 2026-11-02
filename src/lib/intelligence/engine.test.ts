import { describe, it, expect } from 'vitest';
import {
  analyzePortfolio, buildDailyBrief, computeHealth, forecastPermit, gradeFor,
  normalizeRisk, normalizeStatus, type IntelProject,
} from './engine';

const TODAY = new Date('2026-11-01T10:00:00Z');

function proj(over: Partial<IntelProject> = {}): IntelProject {
  return {
    id: over.id ?? 'p1',
    project_name: 'פרויקט בדיקה',
    main_stage: 'forum2_consultants',
    main_blocker: null,
    risk_level: 'low',
    management_status: 'active',
    next_action: 'לשלוח חוות דעת',
    next_action_due_date: '2026-11-10',
    next_action_owner: 'דנה',
    last_update: '2026-10-28',
    updated_at: '2026-10-28T00:00:00Z',
    quarter: 'א',
    units_in: 40,
    units_out: 160,
    ...over,
  };
}

describe('normalisers', () => {
  it('maps Hebrew and English risk labels', () => {
    expect(normalizeRisk('גבוהה')).toBe('high');
    expect(normalizeRisk('HIGH')).toBe('high');
    expect(normalizeRisk('בינוני')).toBe('medium');
    expect(normalizeRisk('נמוך')).toBe('low');
    expect(normalizeRisk('')).toBe('none');
    expect(normalizeRisk(null)).toBe('none');
  });
  it('maps management statuses', () => {
    expect(normalizeStatus('תקוע')).toBe('stuck');
    expect(normalizeStatus('on_hold')).toBe('on_hold');
    expect(normalizeStatus('active')).toBe('active');
    expect(normalizeStatus('???')).toBe('unknown');
  });
});

describe('computeHealth', () => {
  it('gives a clean, fresh project a perfect score', () => {
    const h = computeHealth(proj(), { today: TODAY });
    expect(h.score).toBe(100);
    expect(h.grade).toBe('A');
    expect(h.factors).toHaveLength(0);
  });

  it('penalises blocker + stuck + high risk into critical', () => {
    const h = computeHealth(proj({ main_blocker: 'התנגדות דיירים', management_status: 'תקוע', risk_level: 'high' }), { today: TODAY });
    expect(h.score).toBe(40);
    expect(h.grade).toBe('D');
    expect(h.factors[0].key).toBe('blocker');
    expect(h.factors.map(f => f.key)).toEqual(expect.arrayContaining(['blocker', 'status', 'risk']));
  });

  it('scales overdue-action penalty with lateness and caps it', () => {
    const slight = computeHealth(proj({ next_action_due_date: '2026-10-30' }), { today: TODAY });
    const very = computeHealth(proj({ next_action_due_date: '2026-01-01' }), { today: TODAY });
    const s = slight.factors.find(f => f.key === 'overdue_action')!;
    const v = very.factors.find(f => f.key === 'overdue_action')!;
    expect(s.impact).toBe(4);
    expect(v.impact).toBe(16);
  });

  it('flags missing next action and stale data', () => {
    const h = computeHealth(proj({ next_action: '', last_update: '2026-08-01' }), { today: TODAY });
    expect(h.factors.map(f => f.key)).toEqual(expect.arrayContaining(['no_next_action', 'stale']));
    expect(h.daysSinceUpdate).toBe(92);
  });

  it('counts overdue and blocked tasks for the project only', () => {
    const h = computeHealth(proj(), {
      today: TODAY,
      tasks: [
        { project_id: 'p1', status: 'open', deadline: '2026-10-01' },
        { project_id: 'p1', status: 'blocked', deadline: null },
        { project_id: 'p1', status: 'completed', deadline: '2026-01-01' },
        { project_id: 'other', status: 'open', deadline: '2026-01-01' },
      ],
    });
    expect(h.factors.find(f => f.key === 'overdue_tasks')?.impact).toBe(3);
    expect(h.factors.find(f => f.key === 'blocked_tasks')?.impact).toBe(4);
  });

  it('does not treat a task due today as overdue', () => {
    const today = new Date(2026, 10, 2, 23, 30); // local late evening
    const h = computeHealth(proj({ next_action_due_date: '2026-11-02' }), {
      today, tasks: [{ project_id: 'p1', status: 'open', deadline: '2026-11-02' }],
    });
    expect(h.factors.find(f => f.key === 'overdue_tasks')).toBeUndefined();
    expect(h.factors.find(f => f.key === 'overdue_action')).toBeUndefined();
  });

  it('detects stage overrun from stage dates', () => {
    const h = computeHealth(proj(), {
      today: TODAY,
      stageDates: [{ project_id: 'p1', stage_id: 'forum2_consultants', actual_start: '2026-04-01', actual_end: null, planned_end: null }],
    });
    expect(h.daysInStage).toBe(214);
    expect(h.stageOverrunRatio).toBeGreaterThan(2);
    expect(h.factors.find(f => f.key === 'stage_overrun')?.impact).toBe(15);
  });

  it('never drops below zero', () => {
    const h = computeHealth(proj({
      main_blocker: 'x', management_status: 'stuck', risk_level: 'high', next_action_due_date: '2025-01-01', last_update: '2025-01-01',
    }), { today: TODAY, tasks: Array.from({ length: 10 }, () => ({ project_id: 'p1', status: 'blocked', deadline: '2025-01-01' })) });
    expect(h.score).toBe(0);
  });
});

describe('gradeFor', () => {
  it('uses fixed thresholds', () => {
    expect([100, 85, 84, 70, 69, 50, 49, 0].map(gradeFor)).toEqual(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D']);
  });
});

describe('forecastPermit', () => {
  it('marks projects at or past permit as reached', () => {
    const p = proj({ main_stage: 'execution' });
    const f = forecastPermit(p, computeHealth(p, { today: TODAY }), TODAY);
    expect(f.reached).toBe(true);
    expect(f.expectedDays).toBe(0);
  });

  it('is slower for blocked projects than healthy ones', () => {
    const ok = proj();
    const bad = proj({ main_blocker: 'חסם', management_status: 'stuck' });
    const fOk = forecastPermit(ok, computeHealth(ok, { today: TODAY }), TODAY);
    const fBad = forecastPermit(bad, computeHealth(bad, { today: TODAY }), TODAY);
    expect(fOk.reached).toBe(false);
    expect(fBad.expectedDays).toBeGreaterThan(fOk.expectedDays);
    expect(fBad.slowdown).toBeCloseTo(1.85);
  });

  it('earlier stages take longer', () => {
    const early = proj({ main_stage: 'pre_feasibility' });
    const late = proj({ main_stage: 'completion_rounds' });
    const a = forecastPermit(early, computeHealth(early, { today: TODAY }), TODAY);
    const b = forecastPermit(late, computeHealth(late, { today: TODAY }), TODAY);
    expect(a.expectedDays).toBeGreaterThan(b.expectedDays);
    expect(b.confidence).toBe('high');
  });
});

describe('analyzePortfolio', () => {
  const projects = [
    proj({ id: 'a', quarter: 'א', main_blocker: 'אישור רשות מקרקעין' }),
    proj({ id: 'b', quarter: 'א', main_blocker: 'אישור רשות מקרקעין', management_status: 'תקוע', risk_level: 'high' }),
    proj({ id: 'c', quarter: 'ב', main_stage: 'execution', units_out: 300 }),
    proj({ id: 'd', quarter: 'ב', main_stage: 'pre_feasibility' }),
  ];
  const ins = analyzePortfolio(projects, { today: TODAY });

  it('aggregates totals and grades', () => {
    expect(ins.totals.projects).toBe(4);
    expect(ins.totals.unitsOut).toBe(160 * 3 + 300);
    expect(Object.values(ins.gradeCounts).reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('detects a systemic blocker shared by multiple projects', () => {
    const sys = ins.alerts.find(a => a.title === 'חסם מערכתי');
    expect(sys?.projectIds.sort()).toEqual(['a', 'b']);
  });

  it('builds a full quarter × phase heatmap', () => {
    expect(ins.heatmap.quarters).toEqual(['א', 'ב']);
    expect(ins.heatmap.cells).toHaveLength(2 * 5);
    const total = ins.heatmap.cells.reduce((s, c) => s + c.count, 0);
    expect(total).toBe(4);
  });

  it('puts permitted projects in the first pipeline bucket', () => {
    expect(ins.permitPipeline[0].projects).toBe(1);
    expect(ins.permitPipeline[0].units).toBe(300);
  });

  it('ranks the worst project first in the action queue', () => {
    expect(ins.actions[0].projectId).toBe('b');
  });

  it('lists at most one action per project', () => {
    const ids = ins.actions.map(a => a.projectId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles an empty portfolio', () => {
    const empty = analyzePortfolio([], { today: TODAY });
    expect(empty.avgHealth).toBe(0);
    expect(empty.actions).toEqual([]);
  });

  it('renders a Hebrew daily brief', () => {
    const brief = buildDailyBrief(ins);
    expect(brief).toContain('תדריך יומי');
    expect(brief).toContain('01-11-2026');
    expect(brief).toContain('חסם מערכתי');
  });
});
