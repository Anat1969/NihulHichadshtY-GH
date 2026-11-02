import { Link } from 'react-router-dom';
import { ArrowLeft, Radar, Zap, AlertTriangle } from 'lucide-react';
import { usePortfolioIntelligence } from '@/hooks/usePortfolioIntelligence';
import { HealthRing, SeverityChip } from './primitives';

/** Compact dashboard teaser for the Command Center (same data & scores). */
export default function IntelligenceStrip() {
  const { insights: ins, loading } = usePortfolioIntelligence();
  if (loading || !ins.totals.projects) return null;
  const topAlert = ins.alerts[0];
  const topAction = ins.actions[0];

  return (
    <Link
      to="/command-center"
      className="premium-card p-4 md:p-5 grid gap-4 md:grid-cols-[auto_1fr_1fr_auto] items-center group hover:border-primary/30"
      aria-label="מעבר למרכז הפיקוד החכם"
    >
      <div className="flex items-center gap-3">
        <HealthRing score={ins.avgHealth} size={84} stroke={8} label="בריאות" />
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-bold"><Radar className="h-4 w-4 text-primary" />מרכז פיקוד חכם</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {ins.gradeCounts.D} קריטיים · {ins.gradeCounts.C} לתשומת לב · {ins.gradeCounts.A + ins.gradeCounts.B} תקינים
          </div>
        </div>
      </div>
      <div className="min-w-0 rounded-xl bg-muted/40 p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />התראה מובילה</div>
        {topAlert ? (
          <div className="flex items-center gap-2 mt-1 min-w-0"><SeverityChip severity={topAlert.severity} /><span className="text-[13px] font-semibold truncate">{topAlert.title}: {topAlert.detail}</span></div>
        ) : <div className="text-[13px] mt-1">אין התראות פעילות</div>}
      </div>
      <div className="min-w-0 rounded-xl bg-muted/40 p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Zap className="h-3.5 w-3.5" />הפעולה הבאה החשובה ביותר</div>
        {topAction ? (
          <div className="text-[13px] font-semibold mt-1 truncate">{topAction.projectName}: {topAction.title}</div>
        ) : <div className="text-[13px] mt-1">הכל מטופל</div>}
      </div>
      <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all hidden md:block" />
    </Link>
  );
}
