import { cn } from '@/lib/utils';
import { GRADE_META, SEVERITY_LABELS, gradeFor, type Grade, type Severity } from '@/lib/intelligence/engine';

const TONE_VAR: Record<string, string> = {
  green: '--status-green',
  blue: '--status-blue',
  orange: '--status-yellow',
  red: '--status-red',
};

export function gradeColor(grade: Grade, alpha = 1) {
  return `hsl(var(${TONE_VAR[GRADE_META[grade].tone]}) / ${alpha})`;
}

export function scoreColor(score: number, alpha = 1) {
  return gradeColor(gradeFor(score), alpha);
}

const SEVERITY_TONE: Record<Severity, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'green' };

export function severityColor(sev: Severity, alpha = 1) {
  return `hsl(var(${TONE_VAR[SEVERITY_TONE[sev]]}) / ${alpha})`;
}

/** Animated circular score gauge. */
export function HealthRing({
  score, size = 132, stroke = 12, label, className,
}: { score: number; size?: number; stroke?: number; label?: string; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const grade = gradeFor(score);
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={gradeColor(grade)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 6px ${gradeColor(grade, 0.45)})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`ציון בריאות ${score} מתוך 100`}>
        <span className="font-black leading-none text-foreground" style={{ fontSize: size * 0.28 }}>{score}</span>
        <span className="text-[11px] text-muted-foreground mt-1 font-medium">{label ?? GRADE_META[grade].label}</span>
      </div>
    </div>
  );
}

export function GradeBadge({ score, className }: { score: number; className?: string }) {
  const grade = gradeFor(score);
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap', className)}
      style={{ background: gradeColor(grade, 0.12), color: gradeColor(grade) }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: gradeColor(grade) }} />
      {score} · {GRADE_META[grade].label}
    </span>
  );
}

export function SeverityChip({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap', className)}
      style={{ background: severityColor(severity, 0.12), color: severityColor(severity) }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor(score), transition: 'width .8s ease-out' }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums w-7 text-left text-foreground">{score}</span>
    </div>
  );
}
