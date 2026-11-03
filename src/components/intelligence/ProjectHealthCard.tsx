import { useMemo } from 'react';
import { Activity, CalendarClock, Lightbulb, ShieldCheck } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useAllStageDates } from '@/hooks/useStageDates';
import { computeHealth, forecastPermit, CONFIDENCE_LABELS, type IntelProject } from '@/lib/intelligence/engine';
import { formatDate } from '@/lib/dateUtils';
import { HealthRing, SeverityChip, severityColor } from './primitives';

/** Per-project health score, risk factors and permit forecast. */
export default function ProjectHealthCard({ project }: { project: IntelProject }) {
  const { tasks } = useTasks(project.id);
  const { stageDates } = useAllStageDates(project.id);

  const { health, forecast } = useMemo(() => {
    const health = computeHealth(project, { tasks, stageDates });
    return { health, forecast: forecastPermit(project, health) };
  }, [project, tasks, stageDates]);

  return (
    <section className="premium-card p-5 md:p-6" aria-labelledby="health-card-title">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-primary" />
        <h2 id="health-card-title" className="text-[15px] font-bold">בריאות הפרויקט ותחזית</h2>
        <span className="chip chip-primary text-[10px] mr-auto">מנוע חכם</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] items-start">
        <HealthRing score={health.score} />

        <div className="space-y-2 min-w-0">
          {health.factors.length === 0 ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-6">
              <ShieldCheck className="h-5 w-5" style={{ color: 'hsl(var(--status-green))' }} />
              לא זוהו גורמי סיכון — הפרויקט מתקדם כמתוכנן.
            </div>
          ) : (
            health.factors.slice(0, 5).map(f => (
              <div key={f.key} className="rounded-xl border border-border/50 p-3 flex gap-3 items-start" style={{ borderInlineStartWidth: 3, borderInlineStartColor: severityColor(f.severity) }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold">{f.label}</span>
                    <SeverityChip severity={f.severity} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">−{f.impact}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate" title={f.detail}>{f.detail}</p>
                  <p className="text-[12px] mt-1 flex items-start gap-1.5"><Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />{f.recommendation}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl bg-muted/50 p-4 min-w-[190px] space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />צפי להיתר</div>
          {forecast.reached ? (
            <div className="text-[20px] font-black" style={{ color: 'hsl(var(--status-green))' }}>התקבל היתר</div>
          ) : (
            <>
              <div className="text-[22px] font-black">{formatDate(forecast.expectedDate)}</div>
              <div className="text-[12px] text-muted-foreground">{forecast.remainingStages} שלבים · ~{Math.round(forecast.expectedDays / 30)} חודשים</div>
              <div className="text-[11px] text-muted-foreground">{CONFIDENCE_LABELS[forecast.confidence]}{forecast.slowdown > 1 ? ` · מקדם עיכוב ×${forecast.slowdown}` : ''}</div>
            </>
          )}
          {health.daysInStage !== null && (
            <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50 mt-2">{health.daysInStage} ימים בשלב הנוכחי</div>
          )}
        </div>
      </div>
    </section>
  );
}
