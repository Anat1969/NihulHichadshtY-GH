import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Radar, Copy, Download, Sparkles, AlertTriangle, Zap, Building2, TrendingUp,
  Landmark, ShieldAlert, Search, ArrowUpDown, Loader2, Grid3x3, CalendarClock, X,
} from 'lucide-react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePortfolioIntelligence } from '@/hooks/usePortfolioIntelligence';
import { GRADE_META, PermitForecast, stageOf, type Grade } from '@/lib/intelligence/engine';
import { getStageName, PHASE_LABELS } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { GradeBadge, HealthRing, ScoreBar, SeverityChip, gradeColor, scoreColor, severityColor } from '@/components/intelligence/primitives';

function formatMoney(n: number) {
  if (n >= 1e9) return `₪${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `₪${(n / 1e6).toFixed(1)}M`;
  return `₪${n.toLocaleString('he-IL')}`;
}

type SortKey = 'score' | 'name' | 'forecast' | 'units';

function forecastSortValue(f: PermitForecast) {
  return f.reached ? -1 : f.expectedDays;
}

export default function CommandCenterPage() {
  const { insights, brief, loading } = usePortfolioIntelligence();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | null>(null);
  const [cellFilter, setCellFilter] = useState<{ quarter: string; phase: string; ids: string[] } | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'score', dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim();
    let list = insights.projects;
    if (q) list = list.filter(r => r.project.project_name.includes(q) || (r.project.quarter || '').includes(q));
    if (gradeFilter) list = list.filter(r => r.health.grade === gradeFilter);
    if (cellFilter) list = list.filter(r => cellFilter.ids.includes(r.project.id));
    const val = (r: typeof list[number]) => {
      switch (sort.key) {
        case 'name': return r.project.project_name;
        case 'forecast': return forecastSortValue(r.forecast);
        case 'units': return r.project.units_out || 0;
        default: return r.health.score;
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      return (typeof va === 'string' ? va.localeCompare(vb as string, 'he') : (va as number) - (vb as number)) * sort.dir;
    });
  }, [insights.projects, query, gradeFilter, cellFilter, sort]);

  const toggleSort = (key: SortKey) => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(brief);
      toast({ title: 'התדריך הועתק', description: 'אפשר להדביק במייל או בוואטסאפ' });
    } catch {
      toast({ title: 'ההעתקה נכשלה', variant: 'destructive' });
    }
  };
  const downloadBrief = () => {
    const blob = new Blob([brief], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `תדריך-יומי-${formatDate(new Date())}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-72 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-[13px]">מנתח את תיק הפרויקטים…</span>
        </div>
      </Layout>
    );
  }

  const { totals, gradeCounts, heatmap } = insights;
  const next12 = insights.permitPipeline[1];

  return (
    <Layout>
      <div className="space-y-6">
        {/* ═══ Hero ═══ */}
        <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white" style={{ background: 'linear-gradient(135deg, hsl(202 72% 22%) 0%, hsl(202 72% 34%) 55%, hsl(190 70% 38%) 100%)' }}>
          <div aria-hidden className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, hsl(30 93% 60%), transparent 70%)' }} />
          <div aria-hidden className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(100 65% 55%), transparent 70%)' }} />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] items-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold backdrop-blur">
                <Radar className="h-3.5 w-3.5" /> מרכז פיקוד חכם · עודכן {formatDate(insights.generatedAt)}
              </div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight">מרכז הפיקוד – התחדשות עירונית אשדוד</h1>
              <p className="text-white/80 text-[14px] max-w-2xl">
                ניתוח בזמן אמת של {totals.projects} פרויקטים: ציון בריאות לכל פרויקט, חיזוי מועד היתר, זיהוי חסמים מערכתיים ותור פעולות מתועדף לפי השפעה.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={copyBrief} className="bg-white text-[hsl(202_72%_25%)] hover:bg-white/90 rounded-xl gap-1.5 font-bold"><Copy className="h-4 w-4" />העתק תדריך יומי</Button>
                <Button size="sm" variant="ghost" onClick={downloadBrief} className="text-white hover:bg-white/10 rounded-xl gap-1.5 border border-white/25"><Download className="h-4 w-4" />הורד</Button>
                <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('open-yohan-ai', { detail: { action: 'summary' } }))} className="text-white hover:bg-white/10 rounded-xl gap-1.5 border border-white/25"><Sparkles className="h-4 w-4" />שאל את יוחאן</Button>
              </div>
            </div>
            <div className="flex items-center gap-5 justify-center rounded-2xl bg-white/95 dark:bg-card p-4 text-foreground shadow-xl">
              <HealthRing score={insights.avgHealth} size={148} label="בריאות התיק" />
              <div className="space-y-1.5">
                {(['A', 'B', 'C', 'D'] as Grade[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(f => (f === g ? null : g))}
                    className="flex items-center gap-2 text-[12px] w-full rounded-lg px-2 py-1 hover:bg-muted transition-colors"
                    style={gradeFilter === g ? { background: gradeColor(g, 0.12) } : undefined}
                    aria-pressed={gradeFilter === g}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: gradeColor(g) }} />
                    <span className="flex-1 text-right">{GRADE_META[g].label}</span>
                    <span className="font-bold tabular-nums">{gradeCounts[g]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ KPI strip ═══ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Building2, label: 'יח"ד מתוכננות', value: totals.unitsOut.toLocaleString('he-IL'), sub: `מתוך ${totals.unitsIn.toLocaleString('he-IL')} קיימות` },
            { icon: CalendarClock, label: 'צפי היתרים – 12 חודשים', value: next12.units.toLocaleString('he-IL'), sub: `${next12.projects} פרויקטים` },
            { icon: ShieldAlert, label: 'יח"ד בסיכון קריטי', value: totals.unitsAtRisk.toLocaleString('he-IL'), sub: `${gradeCounts.D} פרויקטים`, danger: totals.unitsAtRisk > 0 },
            { icon: Landmark, label: 'פוטנציאל היטלים', value: formatMoney(totals.value), sub: 'הערכה לפי יח"ד מתוכננות' },
          ].map(k => (
            <div key={k.label} className="kpi-card premium-card p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <k.icon className="h-4 w-4" style={k.danger ? { color: 'hsl(var(--status-red))' } : undefined} />{k.label}
              </div>
              <div className="text-2xl font-black mt-1">{k.value}</div>
              <div className="text-[11px] text-muted-foreground">{k.sub}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          {/* ═══ Action queue ═══ */}
          <section className="premium-card p-5">
            <header className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="text-[15px] font-bold">תור פעולות מתועדף</h2>
              <span className="text-[11px] text-muted-foreground mr-auto">מדורג לפי חומרה × היקף יח"ד</span>
            </header>
            {insights.actions.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-8 text-center">אין פעולות דחופות 🎉</p>
            ) : (
              <ol className="space-y-2">
                {insights.actions.slice(0, 8).map((a, i) => (
                  <li key={`${a.projectId}-${i}`}>
                    <Link to={`/project/${a.projectId}`} className="flex gap-3 items-start rounded-xl p-3 border border-border/40 hover:border-primary/30 hover:bg-muted/40 transition-all group">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: severityColor(a.severity, 0.12), color: severityColor(a.severity) }}>{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold group-hover:text-primary transition-colors">{a.projectName}</span>
                          <SeverityChip severity={a.severity} />
                          {a.owner && <span className="text-[11px] text-muted-foreground">· {a.owner}</span>}
                        </div>
                        <p className="text-[13px] mt-0.5">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate" title={a.detail}>{a.detail}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ═══ Alerts ═══ */}
          <section className="premium-card p-5">
            <header className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-[15px] font-bold">התראות וזיהוי חריגות</h2>
            </header>
            {insights.alerts.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-8 text-center">לא זוהו חריגות בתיק</p>
            ) : (
              <ul className="space-y-2">
                {insights.alerts.map(al => (
                  <li key={al.key} className="rounded-xl p-3" style={{ background: severityColor(al.severity, 0.07), borderInlineStart: `3px solid ${severityColor(al.severity)}` }}>
                    <div className="flex items-center gap-2"><span className="text-[13px] font-bold">{al.title}</span><SeverityChip severity={al.severity} /></div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{al.detail}</p>
                    <button
                      className="text-[11px] text-primary font-semibold mt-1 hover:underline"
                      onClick={() => { setCellFilter({ quarter: al.title, phase: '', ids: al.projectIds }); document.getElementById('cc-table')?.scrollIntoView({ behavior: 'smooth' }); }}
                    >
                      הצג {al.projectIds.length} פרויקטים ←
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* ═══ Heatmap ═══ */}
          <section className="premium-card p-5">
            <header className="flex items-center gap-2 mb-4">
              <Grid3x3 className="h-4 w-4 text-primary" />
              <h2 className="text-[15px] font-bold">מפת חום – רובע × שלב</h2>
              <span className="text-[11px] text-muted-foreground mr-auto">צבע = בריאות ממוצעת · לחיצה מסננת</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th className="text-[11px] text-muted-foreground font-medium text-right">רובע</th>
                    {heatmap.phases.map(ph => <th key={ph} className="text-[11px] text-muted-foreground font-medium">{PHASE_LABELS[ph]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.quarters.map(q => (
                    <tr key={q}>
                      <td className="text-[12px] font-bold whitespace-nowrap pl-2">{q === '—' ? 'לא מוגדר' : `רובע ${q}`}</td>
                      {heatmap.phases.map(ph => {
                        const cell = heatmap.cells.find(c => c.quarter === q && c.phase === ph)!;
                        const active = cellFilter?.quarter === q && cellFilter?.phase === ph;
                        return (
                          <td key={ph} className="p-0">
                            <button
                              disabled={!cell.count}
                              onClick={() => setCellFilter(active ? null : { quarter: q, phase: ph, ids: cell.projectIds })}
                              className="w-full h-11 rounded-lg text-[13px] font-black tabular-nums transition-transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-default"
                              style={{
                                background: cell.count ? scoreColor(cell.avgHealth, 0.15 + Math.min(cell.count, 6) * 0.1) : 'hsl(var(--muted) / .5)',
                                color: cell.count ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground) / .4)',
                                outline: active ? '2px solid hsl(var(--primary))' : undefined,
                              }}
                              title={cell.count ? `${cell.count} פרויקטים · בריאות ממוצעת ${cell.avgHealth}` : 'אין פרויקטים'}
                            >
                              {cell.count || '·'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Legend: colour = average health grade; the number = project count. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-muted-foreground" aria-label="מקרא מפת החום">
              <span>המספר = כמות פרויקטים · הצבע = בריאות ממוצעת:</span>
              {(['A', 'B', 'C', 'D'] as Grade[]).map(g => (
                <span key={g} className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-[4px]" style={{ background: gradeColor(g, 0.55) }} />
                  {GRADE_META[g].label}
                </span>
              ))}
            </div>
          </section>

          {/* ═══ Permit pipeline ═══ */}
          <section className="premium-card p-5">
            <header className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <h2 className="text-[15px] font-bold">צנרת היתרים צפויה (יח"ד)</h2>
            </header>
            <div className="h-[220px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.permitPipeline} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" reversed tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / .5)' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', direction: 'rtl', fontSize: 12 }}
                    formatter={(v: number, _n, item) => [`${v.toLocaleString('he-IL')} יח"ד · ${item.payload.projects} פרויקטים`, '']}
                  />
                  {/* Ordered buckets → one-hue ordinal ramp (not status colours). */}
                  <Bar dataKey="units" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {insights.permitPipeline.map((_, i) => (
                      <Cell key={i} fill={`hsl(var(--pipe-${i + 1}))`} />
                    ))}
                    <LabelList
                      dataKey="units"
                      position="top"
                      formatter={(v: number) => (v ? v.toLocaleString('he-IL') : '')}
                      style={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--foreground))' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-3">
              {insights.phaseFunnel.map(f => (
                <div key={f.phase} className="text-center rounded-lg bg-muted/50 py-2">
                  <div className="text-[16px] font-black">{f.projects}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{f.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ Project health table ═══ */}
        <section id="cc-table" className="premium-card p-5 scroll-mt-24">
          <header className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-[15px] font-bold">דירוג בריאות פרויקטים</h2>
            <span className="text-[12px] text-muted-foreground">{rows.length} מתוך {insights.projects.length}</span>
            {(gradeFilter || cellFilter) && (
              <button onClick={() => { setGradeFilter(null); setCellFilter(null); }} className="chip chip-primary gap-1 text-[11px]">
                <X className="h-3 w-3" />נקה סינון
              </button>
            )}
            <div className="relative mr-auto w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש פרויקט או רובע…" className="pr-9 h-9 rounded-xl text-[13px]" />
            </div>
          </header>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="data-table w-full text-[13px]">
              <thead>
                <tr>
                  {([
                    ['name', 'פרויקט'], [null, 'שלב'], ['score', 'בריאות'], [null, 'גורם מוביל'], ['forecast', 'צפי היתר'], ['units', 'יח"ד'],
                  ] as [SortKey | null, string][]).map(([key, label]) => (
                    <th key={label} className="text-right whitespace-nowrap">
                      {key ? (
                        <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-primary">
                          {label}<ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ project: p, health: h, forecast: f }) => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                    <td className="font-bold whitespace-nowrap">
                      {p.project_name}
                      {p.quarter && <span className="text-[11px] text-muted-foreground font-normal mr-1.5">רובע {p.quarter}</span>}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap">{getStageName(stageOf(p))}</td>
                    <td><ScoreBar score={h.score} /></td>
                    <td className="max-w-[260px]">
                      {h.factors[0] ? (
                        <span className="flex items-center gap-1.5 min-w-0"><SeverityChip severity={h.factors[0].severity} /><span className="truncate text-muted-foreground" title={h.factors[0].detail}>{h.factors[0].label}</span></span>
                      ) : <GradeBadge score={h.score} />}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{f.reached ? <span style={{ color: 'hsl(var(--status-green))' }} className="font-semibold">✓ היתר</span> : formatDate(f.expectedDate)}</td>
                    <td className="tabular-nums">{(p.units_out || 0).toLocaleString('he-IL')}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted-foreground py-10">אין פרויקטים תואמים</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4">
            * הציון והתחזית מחושבים אוטומטית מחסמים, רמת סיכון, סטטוס ניהולי, איחורים, טריות נתונים, משימות ומשכי שלבים מול נורמות. התחזית היא הערכה תכנונית ולא התחייבות.
          </p>
        </section>
      </div>
    </Layout>
  );
}
