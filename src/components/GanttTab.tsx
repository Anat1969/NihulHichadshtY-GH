import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STAGES, PHASE_LABELS, getStageOrder, StageId } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Clock, Circle, Calendar, Flag,
  ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import StageEditDialog from './StageEditDialog';

interface Meeting { id: string; forum_type: string; date: string | null; time: string | null; status: string; }
interface Task { id: string; title: string; deadline: string | null; status: string; }

const PHASE_COLORS: Record<string, string> = {
  A: 'bg-slate-100 text-slate-600 border-slate-200',
  B: 'bg-blue-50 text-blue-600 border-blue-200',
  C: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  D: 'bg-orange-50 text-orange-600 border-orange-200',
  E: 'bg-purple-50 text-purple-600 border-purple-200',
};

const PHASE_BAR: Record<string, string> = {
  A: 'bg-slate-400',
  B: 'bg-blue-500',
  C: 'bg-emerald-500',
  D: 'bg-orange-500',
  E: 'bg-purple-500',
};

export default function GanttTab({
  projectId,
  currentStage,
  lastUpdate,
  nextActionDue,
  nextAction,
}: {
  projectId: string;
  currentStage: string;
  lastUpdate?: string | null;
  nextActionDue?: string | null;
  nextAction?: string | null;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editStage, setEditStage] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [mr, tr] = await Promise.all([
        (supabase as any).from('meetings').select('id, forum_type, date, time, status').eq('project_id', projectId).order('date'),
        (supabase as any).from('tasks').select('id, title, deadline, status').eq('project_id', projectId).not('deadline', 'is', null).order('deadline'),
      ]);
      setMeetings(mr.data || []);
      setTasks(tr.data || []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const currentOrder = getStageOrder(currentStage as StageId) || 13;
  const today = new Date().toISOString().split('T')[0];

  const getStageStatus = (order: number): 'done' | 'current' | 'future' => {
    if (order < currentOrder) return 'done';
    if (order === currentOrder) return 'current';
    return 'future';
  };

  // Group stages by phase
  const phaseGroups = (STAGES as readonly any[]).reduce((acc: Record<string, any[]>, s: any) => {
    const phase = s.phase || 'C';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(s);
    return acc;
  }, {});

  const doneCount = (STAGES as readonly any[]).filter(s => getStageStatus(s.order) === 'done').length;
  const progressPct = Math.round((doneCount / STAGES.length) * 100);

  const FORUM_LABELS: Record<string, string> = {
    forum1: 'פורום 1 — הרמוניקה',
    forum2: 'פורום 2 — יועצים',
    forum3: 'פורום 3 — ועדה',
  };

  const togglePhase = (phase: string) => {
    setCollapsedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const formatHebrewDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('he-IL');

  return (
    <div className="space-y-6" dir="rtl">
      {/* Progress header */}
      <div className="premium-card p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Badge variant="outline" className="text-sm font-bold px-3 py-1">
            {progressPct}% הושלם
          </Badge>
          <div className="text-right">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 justify-end">
              <Flag className="h-5 w-5 text-primary" />
              מסלול התקדמות הפרויקט
            </h3>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Phase progress dots */}
        <div className="relative flex items-start justify-between gap-1 pt-2" dir="rtl">
          {(STAGES as readonly any[]).map((stage, i) => {
            const status = getStageStatus(stage.order);
            const phase = stage.phase || 'C';
            const barColor = PHASE_BAR[phase];
            return (
              <div key={stage.id} className="flex-1 min-w-0">
                <div className="flex items-center">
                  <div className="relative shrink-0">
                    <div className={`h-4 w-4 rounded-full border-2 ${status === 'done' ? barColor : status === 'current' ? 'bg-primary border-primary ring-4 ring-primary/15' : 'bg-background border-border'}`} />
                    {status === 'current' && (
                      <div className="absolute top-6 right-1/2 translate-x-1/2 w-28 text-center text-[10px] font-semibold text-primary leading-tight">
                        {stage.name}
                      </div>
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 ${status === 'done' ? barColor : 'bg-border'}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-synced events */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-5">
          <Badge variant="secondary">מסונכרן אוטומטית</Badge>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            אירועי ציר זמן
          </h3>
        </div>

        <div className="space-y-3">
          {/* Last update */}
          {lastUpdate && (
            <div className="flex gap-4 items-start p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="w-24 shrink-0 text-xs font-semibold text-muted-foreground text-left">
                {new Date(lastUpdate).toLocaleDateString('he-IL')}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-semibold">עדכון אחרון</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          )}

          {/* Meetings */}
          {meetings.map(m => (
            <div key={m.id} className="flex gap-4 items-start p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-24 shrink-0 text-xs font-semibold text-primary text-left">
                {m.date ? formatHebrewDate(m.date) : 'ללא תאריך'}
                {m.time ? ` · ${m.time.slice(0, 5)}` : ''}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-semibold">{FORUM_LABELS[m.forum_type] || m.forum_type}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {m.status === 'completed' ? '✓ בוצע' : m.status === 'planned' ? 'מתוכנן' : m.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}

          {/* Tasks with deadline */}
          {tasks.filter(t => t.status !== 'completed').map(t => (
            <div key={t.id} className="flex gap-4 items-start p-3 rounded-xl bg-orange-50/50 border border-orange-200/60">
              <div className="w-24 shrink-0 text-xs font-semibold text-orange-700 text-left">
                {t.deadline ? formatHebrewDate(t.deadline) : ''}
                {t.deadline && t.deadline < today ? ' ⚠️' : ''}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-semibold">{t.title}</span>
                  <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-700">משימה</Badge>
                </div>
              </div>
            </div>
          ))}

          {/* Next action */}
          {nextAction && nextActionDue && (
            <div className="flex gap-4 items-start p-3 rounded-xl bg-amber-50/70 border border-amber-200/60">
              <div className="w-24 shrink-0 text-xs font-semibold text-amber-700 text-left">
                {formatHebrewDate(nextActionDue)}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm font-semibold">{nextAction}</span>
                  <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700">פעולה הבאה</Badge>
                </div>
              </div>
            </div>
          )}

          {meetings.length === 0 && tasks.length === 0 && !nextAction && !loading && (
            <div className="text-center text-sm text-muted-foreground py-6">
              אין אירועים מסונכרנים עדיין — הוסף ישיבות ומשימות לפרויקט
            </div>
          )}
        </div>
      </div>

      {/* Stage list by phase */}
      <div className="space-y-3">
        {Object.entries(phaseGroups).map(([phase, stages]) => {
          const phaseStages = stages as any[];
          const doneInPhase = phaseStages.filter(s => getStageStatus(s.order) === 'done').length;
          const isCollapsed = collapsedPhases[phase];
          const hasCurrentInPhase = phaseStages.some(s => getStageStatus(s.order) === 'current');

          return (
            <div key={phase} className="premium-card overflow-hidden">
              {/* Phase header */}
              <Button
                variant="ghost"
                onClick={() => togglePhase(phase)}
                className="w-full h-auto flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-none"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  <span className="text-sm text-muted-foreground">{doneInPhase}/{phaseStages.length} שלבים</span>
                  {hasCurrentInPhase && (
                    <Badge className="bg-primary text-primary-foreground">פעיל</Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold">{PHASE_LABELS[phase] || phase}</span>
                  <Badge variant="outline" className={PHASE_COLORS[phase] || PHASE_COLORS.C}>{phase}</Badge>
                </div>
              </Button>

              {/* Stages */}
              {!isCollapsed && (
                <div className="divide-y divide-border/50">
                  {phaseStages.map(stage => {
                    const status = getStageStatus(stage.order);
                    const stageMeetings = meetings.filter(m => {
                      if (stage.id === 'forum1_harmonika') return m.forum_type === 'forum1';
                      if (stage.id === 'forum2_consultants') return m.forum_type === 'forum2';
                      if (stage.id === 'forum3_committee_prep') return m.forum_type === 'forum3';
                      return false;
                    });

                    return (
                      <div
                        key={stage.id}
                        onClick={() => setEditStage({ id: stage.id, name: stage.name })}
                        className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        {/* Status icon */}
                        <div className="pt-0.5 shrink-0">
                          {status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                          {status === 'current' && <Clock className="h-5 w-5 text-primary" />}
                          {status === 'future' && <Circle className="h-5 w-5 text-muted-foreground/40" />}
                        </div>

                        {/* Stage info */}
                        <div className="flex-1 text-right min-w-0">
                          <div className={`text-sm font-semibold ${status === 'current' ? 'text-primary' : status === 'done' ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {stage.name}
                          </div>
                          {/* Linked meetings */}
                          {stageMeetings.map(m => (
                            <div key={m.id} className="mt-1 text-xs text-muted-foreground">
                              📅 {m.date ? formatHebrewDate(m.date) : 'ללא תאריך'}
                              {m.time ? ` · ${m.time.slice(0, 5)}` : ''}
                              {m.status === 'completed' ? ' ✓' : ''}
                            </div>
                          ))}
                        </div>

                        {/* Order number */}
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {stage.order}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editStage && (
        <StageEditDialog
          open={!!editStage}
          onOpenChange={(v) => !v && setEditStage(null)}
          projectId={projectId}
          stageId={editStage.id}
          stageName={editStage.name}
        />
      )}
    </div>
  );
}
