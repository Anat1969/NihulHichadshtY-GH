import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { STAGES, PHASE_LABELS, getStageOrder, StageId } from '@/types/project';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, AlertTriangle, ChevronLeft } from 'lucide-react';

const PHASE_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  A: { bg: '#f1f5f9', bar: '#94a3b8', text: '#64748b' },
  B: { bg: '#eff6ff', bar: '#3b82f6', text: '#2563eb' },
  C: { bg: '#f0fdf4', bar: '#22c55e', text: '#16a34a' },
  D: { bg: '#fff7ed', bar: '#f97316', text: '#ea580c' },
  E: { bg: '#faf5ff', bar: '#8b5cf6', text: '#7c3aed' },
};

const PHASES = ['A', 'B', 'C', 'D', 'E'];

// Map each stage to its phase
const STAGE_PHASE: Record<string, string> = {};
const PHASE_STAGE_COUNT: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
(STAGES as readonly any[]).forEach(s => {
  STAGE_PHASE[s.id] = s.phase || 'C';
  PHASE_STAGE_COUNT[s.phase || 'C'] = (PHASE_STAGE_COUNT[s.phase || 'C'] || 0) + 1;
});

type PhaseState = 'done' | 'current' | 'future';

function getPhaseState(projectStage: string, phase: string): { state: PhaseState; pct: number } {
  const currentOrder = getStageOrder(projectStage as StageId) || 1;
  const phaseStages = (STAGES as readonly any[]).filter(s => s.phase === phase).sort((a, b) => a.order - b.order);
  if (phaseStages.length === 0) return { state: 'future', pct: 0 };

  const minOrder = phaseStages[0].order;
  const maxOrder = phaseStages[phaseStages.length - 1].order;

  // All stages in this phase are before current → DONE
  if (currentOrder > maxOrder) return { state: 'done', pct: 100 };
  // Current stage is before this phase entirely → FUTURE
  if (currentOrder < minOrder) return { state: 'future', pct: 0 };

  // Current stage falls within this phase
  // Step within the phase (1-indexed): how many steps into the phase
  const stepIndex = phaseStages.findIndex(s => s.order === currentOrder);
  // Real % = position within phase / total steps in phase
  const pct = Math.round(((stepIndex + 1) / phaseStages.length) * 100);
  return { state: 'current', pct };
}

function getProjectPhase(stageId: string): string {
  return STAGE_PHASE[stageId] || 'C';
}

function getPermitScore(project: any): number {
  const order = getStageOrder(project.main_stage as StageId) || 1;
  const units = Math.log10(Math.max(project.units_out || 1, 1));
  return order * units;
}

export default function GanttAllProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'potential' | 'quarter'>('potential');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('projects')
      .select('id, project_name, main_stage, quarter, units_out, units_in, main_blocker, next_action_due_date, multiplier')
      .then(({ data }) => { setProjects(data || []); setLoading(false); });
  }, []);

  const sorted = useMemo(() => {
    let list = projects.filter(p => !search || p.project_name?.includes(search));
    if (sortBy === 'potential') list = [...list].sort((a, b) => getPermitScore(b) - getPermitScore(a));
    if (sortBy === 'name') list = [...list].sort((a, b) => (a.project_name || '').localeCompare(b.project_name || '', 'he'));
    if (sortBy === 'quarter') list = [...list].sort((a, b) => (a.quarter || 'z').localeCompare(b.quarter || 'z'));
    return list;
  }, [projects, search, sortBy]);

  return (
    <Layout>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש פרויקט..."
                className="h-9 w-full pr-9 text-right sm:w-52"
              />
            </div>

            <div className="flex rounded-lg bg-muted p-1">
              {[{ k: 'potential', l: 'פוטנציאל' }, { k: 'quarter', l: 'רובע' }, { k: 'name', l: 'שם' }].map(s => (
                <button
                  key={s.k}
                  type="button"
                  onClick={() => setSortBy(s.k as any)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${sortBy === s.k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>ציר זמן רוחבי</span>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">גאנט כולל — כל הפרויקטים</h1>
            <p className="text-sm text-muted-foreground">{sorted.length} פרויקטים</p>
          </div>
        </div>

        {/* Phase legend */}
        <div className="flex flex-wrap gap-2">
          {PHASES.map(phase => (
            <Badge key={phase} variant="outline" className="gap-2 rounded-full bg-card px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PHASE_COLORS[phase].bar }} />
              {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
              <span className="text-muted-foreground">({PHASE_STAGE_COUNT[phase]} שלבים)</span>
            </Badge>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <div className="min-w-[1180px]">
            {/* Phase headers */}
            <div className="grid border-b border-border bg-muted/70 backdrop-blur" style={{ gridTemplateColumns: '260px repeat(5, minmax(130px, 1fr)) 90px 120px' }}>
              <div className="border-l border-border p-3 text-xs font-bold text-muted-foreground">פרויקט</div>
              {PHASES.map(phase => (
                <div key={phase} className="border-l border-border/70 p-3 text-center">
                  <div className="text-sm font-bold" style={{ color: PHASE_COLORS[phase].text }}>
                    {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {PHASE_STAGE_COUNT[phase]} שלבים
                  </div>
                </div>
              ))}
              <div className="border-l border-border p-3 text-center text-xs font-bold text-muted-foreground">יח&quot;ד</div>
              <div className="p-3 text-center text-xs font-bold text-muted-foreground">התקדמות</div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">טוען...</div>
            ) : sorted.map((project, pi) => {
              const currentPhase = getProjectPhase(project.main_stage || 'taba_submission');
              const currentOrder = getStageOrder(project.main_stage as StageId) || 1;
              const totalPct = Math.round((currentOrder / (STAGES as readonly any[]).length) * 100);
              const hasBlocker = !!project.main_blocker;
              const isOverdue = project.next_action_due_date && project.next_action_due_date < new Date().toISOString().split('T')[0];

              return (
                <button
                  key={project.id}
                  type="button"
                  className={`grid w-full text-right transition-colors hover:bg-muted/50 ${pi !== sorted.length - 1 ? 'border-b border-border/70' : ''}`}
                  style={{ gridTemplateColumns: '260px repeat(5, minmax(130px, 1fr)) 90px 120px' }}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {/* Project name */}
                  <div className="border-l border-border p-3">
                    <div className="flex items-center gap-3">
                      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {hasBlocker && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                          {isOverdue && <span className="text-xs">⏰</span>}
                          <div className="truncate text-sm font-bold text-foreground">{project.project_name}</div>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {project.quarter ? `רובע ${project.quarter}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase cells — real progress per DB main_stage */}
                  {PHASES.map(phase => {
                    const { state, pct } = getPhaseState(project.main_stage || 'pre_feasibility', phase);
                    const color = PHASE_COLORS[phase];
                    const fillPct = state === 'done' ? 100 : state === 'current' ? pct : 0;
                    const isActive = state === 'done' || state === 'current';

                    return (
                      <div key={phase} className="border-l border-border/70 p-3">
                        <div className="flex h-full flex-col justify-center gap-2 rounded-lg px-2 py-2" style={{ backgroundColor: isActive ? color.bg : 'transparent' }}>
                          {/* Progress bar */}
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${fillPct}%`, backgroundColor: color.bar, opacity: isActive ? 1 : 0.25 }}
                            />
                          </div>
                          {/* Label */}
                          <div className="text-center text-xs font-bold" style={{ color: isActive ? color.text : undefined }}>
                            {state === 'done' ? '✓' : state === 'current' ? `${pct}%` : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Units */}
                  <div className="flex items-center justify-center border-l border-border p-3 text-sm font-semibold text-foreground">
                    {project.units_out ? project.units_out.toLocaleString() : '—'}
                  </div>

                  {/* Total progress */}
                  <div className="flex items-center justify-center p-3">
                    <div className="w-full space-y-1">
                      <div className="text-center text-xs font-bold text-foreground">
                        {totalPct}%
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${totalPct}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
