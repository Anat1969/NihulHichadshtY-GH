import { Building2, Home, TrendingUp, Activity, AlertTriangle, Shield, Calendar, Landmark } from 'lucide-react';
import { getStageName, StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';

interface ProjectKpiBarProps {
  project: {
    units_in?: number | null;
    units_out?: number | null;
    multiplier?: number | null;
    main_stage?: string | null;
    management_status?: string | null;
    risk_level?: string | null;
    main_blocker?: string | null;
    next_action_due_date?: string | null;
  };
}

function KpiCard({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: 'primary' | 'warning' | 'destructive' | 'success';
}) {
  const accentColors = {
    primary: 'text-primary',
    warning: 'text-amber-500',
    destructive: 'text-destructive',
    success: 'text-emerald-500',
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border/50 bg-card p-3.5 shadow-sm min-w-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-semibold tracking-wide">{label}</span>
      </div>
      <span className={`text-lg font-extrabold truncate ${accent ? accentColors[accent] : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function ProjectKpiBar({ project }: ProjectKpiBarProps) {
  const cards: React.ReactNode[] = [];

  const unitsIn = project.units_in || 0;
  const unitsOut = project.units_out || 0;
  const multiplier = project.multiplier || (unitsIn > 0 ? parseFloat((unitsOut / unitsIn).toFixed(1)) : 0);

  // Planning core data
  if (unitsIn > 0) {
    cards.push(
      <KpiCard key="units_in" icon={<Home className="h-3.5 w-3.5" />} label="דירות קיימות" value={unitsIn.toLocaleString()} />
    );
  }

  if (unitsOut > 0) {
    cards.push(
      <KpiCard key="units_out" icon={<Building2 className="h-3.5 w-3.5" />} label="דירות מתוכננות" value={unitsOut.toLocaleString()} accent="primary" />
    );
  }

  if (unitsIn > 0 && multiplier > 0) {
    cards.push(
      <KpiCard key="multiplier" icon={<TrendingUp className="h-3.5 w-3.5" />} label="מכפיל" value={`×${multiplier}`} accent="primary" />
    );
  }

  // Municipality revenue
  if (unitsOut > 0) {
    const revenue = unitsOut * 25000;
    const formatted = revenue >= 1_000_000 ? `₪ ${(revenue / 1_000_000).toFixed(1)}M` : `₪ ${(revenue / 1_000).toFixed(0)}K`;
    cards.push(
      <KpiCard key="revenue" icon={<Landmark className="h-3.5 w-3.5" />} label="פוטנציאל צפוי מהיתרים" value={formatted} accent="success" />
    );
  }

  // Management state
  if (project.main_stage) {
    cards.push(
      <KpiCard key="stage" icon={<Activity className="h-3.5 w-3.5" />} label="שלב נוכחי" value={getStageName(project.main_stage as StageId)} />
    );
  }

  if (project.management_status) {
    cards.push(
      <KpiCard key="status" icon={<Shield className="h-3.5 w-3.5" />} label="סטטוס ניהולי" value={project.management_status} />
    );
  }

  if (project.risk_level && project.risk_level !== 'low') {
    const riskAccent = project.risk_level === 'high' ? 'destructive' as const : 'warning' as const;
    const riskLabel = project.risk_level === 'high' ? 'גבוה' : project.risk_level === 'medium' ? 'בינוני' : project.risk_level;
    cards.push(
      <KpiCard key="risk" icon={<AlertTriangle className="h-3.5 w-3.5" />} label="רמת סיכון" value={riskLabel} accent={riskAccent} />
    );
  }

  // Blocker indicator
  if (project.main_blocker) {
    cards.push(
      <KpiCard key="blocker" icon={<AlertTriangle className="h-3.5 w-3.5" />} label="חסם פעיל" value={project.main_blocker} accent="destructive" />
    );
  }

  // Nearest due date
  if (project.next_action_due_date) {
    cards.push(
      <KpiCard key="due" icon={<Calendar className="h-3.5 w-3.5" />} label="תאריך יעד" value={formatDate(project.next_action_due_date)} accent="warning" />
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {cards}
    </div>
  );
}
