import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects, ProjectWithAddresses } from '@/hooks/useProjects';
import { getStageName, StageId, STAGES } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import {
  Building2, AlertTriangle, TrendingUp, Home, Loader2,
  Clock, Activity, ArrowRight, Shield, Target, Calendar,
  ExternalLink, User, Landmark, FileText, FileSpreadsheet, Download, Sparkles, BarChart3, MapPin,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import TamaDashboardCard from '@/components/TamaDashboardCard';
import IntelligenceStrip from '@/components/intelligence/IntelligenceStrip';
import type { MeetingDocumentDraft } from '@/lib/formalDocumentExport';
import { formatShekels } from '@/lib/formatUtils';
import { VALUE_PER_UNIT } from '@/lib/intelligence/engine';

// Heavy document/export code (docx, jspdf, xlsx) loads only when the user asks for it.
const SystemSummaryDialog = lazy(() => import('@/components/SystemSummaryDialog'));
const FormalDocumentEditor = lazy(() => import('@/components/FormalDocumentEditor'));
const ImportExcelDatesDialog = lazy(() => import('@/components/ImportExcelDatesDialog'));

export default function Dashboard() {
  const { projects, loading } = useProjects();
  const navigate = useNavigate();

  const [systemSummaryOpen, setSystemSummaryOpen] = useState(false);
  const [formalDocOpen, setFormalDocOpen] = useState(false);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [formalDocOverride, setFormalDocOverride] = useState<Partial<MeetingDocumentDraft> | null>(null);

  // Bridge: Yohan AI (dashboard) → open FormalDocumentEditor with management update draft
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.draft) {
        setFormalDocOverride(detail.draft);
        setFormalDocOpen(true);
      }
    };
    window.addEventListener('open-dashboard-formal-document', handler as EventListener);
    return () => window.removeEventListener('open-dashboard-formal-document', handler as EventListener);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // ═══ KPI Calculations (real DB only) ═══
  const kpis = useMemo(() => {
    const totalProjects = projects.length;
    const totalExisting = projects.reduce((s, p) => s + (p.units_in || 0), 0);
    const totalPlanned = projects.reduce((s, p) => s + (p.units_out || 0), 0);
    const avgMultiplier = totalExisting > 0 ? (totalPlanned / totalExisting).toFixed(1) : '—';

    const withBlockers = projects.filter(p => p.main_blocker && p.main_blocker.trim()).length;
    const highRisk = projects.filter(p => p.risk_level === 'high' || p.risk_level === 'medium').length;

    const overdueActions = projects.filter(p =>
      p.next_action_due_date && p.next_action_due_date < today
    ).length;

    const nearDueActions = projects.filter(p =>
      p.next_action_due_date && p.next_action_due_date >= today && p.next_action_due_date <= threeDaysFromNow
    ).length;

    const staleProjects = projects.filter(p => {
      const lu = p.last_update || p.updated_at;
      return lu < sevenDaysAgo;
    }).length;

    const stuckProjects = projects.filter(p =>
      p.management_status === 'stuck' || p.management_status === 'on_hold' || p.management_status === 'תקוע' || p.management_status === 'מושהה'
    ).length;

      const totalRevenue = totalPlanned * VALUE_PER_UNIT;

      return {
      totalProjects, totalExisting, totalPlanned, avgMultiplier, totalRevenue,
      withBlockers, highRisk, overdueActions, nearDueActions, staleProjects, stuckProjects,
    };
  }, [projects, today, threeDaysFromNow, sevenDaysAgo]);

  // ═══ "Needs Attention" list ═══
  const attentionProjects = useMemo(() => {
    const scored: { project: ProjectWithAddresses; score: number; reasons: string[] }[] = [];

    for (const p of projects) {
      let score = 0;
      const reasons: string[] = [];

      if (p.main_blocker && p.main_blocker.trim()) { score += 4; reasons.push('חסם פעיל'); }
      if (p.risk_level === 'high') { score += 3; reasons.push('סיכון גבוה'); }
      if (p.risk_level === 'medium') { score += 1; reasons.push('סיכון בינוני'); }
      if (p.next_action_due_date && p.next_action_due_date < today) { score += 3; reasons.push('תאריך יעד עבר'); }
      if (p.next_action_due_date && p.next_action_due_date >= today && p.next_action_due_date <= threeDaysFromNow) { score += 2; reasons.push('תאריך יעד קרוב'); }
      if (p.management_status === 'stuck' || p.management_status === 'תקוע') { score += 3; reasons.push('פרויקט תקוע'); }
      if (p.management_status === 'on_hold' || p.management_status === 'מושהה') { score += 2; reasons.push('מושהה'); }

      const lu = p.last_update || p.updated_at;
      if (lu < sevenDaysAgo) { score += 1; reasons.push('ללא עדכון שבוע+'); }

      if (score > 0) scored.push({ project: p, score, reasons });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [projects, today, threeDaysFromNow, sevenDaysAgo]);

  // ═══ Top 5 projects by permit potential ═══
  const STAGE_PERMIT_SCORE: Record<string, number> = {
    'pre_feasibility': 2,
    'resident_agreements': 4,
    'resident_committee': 6,
    'developer_selection': 8,
    'architect_team': 10,
    'taba_preparation': 15,
    'taba_submission': 20,
    'taba_validation': 22,
    'taba_deposit': 25,
    'taba_objections': 28,
    'taba_approval': 40,
    'taba_published': 45,
    'permit': 100,
    'completion_rounds': 90,
    'submission': 80,
    'licensing_prep': 70,
    'committee_decision': 60,
    'forum3_committee_prep': 45,
    'design_review_pre_forum3': 35,
    'forum2_consultants': 25,
    'binui_post_forum1': 15,
    'forum1_harmonika': 13,
    'execution': 95,
    'occupancy': 98,
  };

  const topByPotential = useMemo(() => {
    return [...projects]
      .filter(p => (p.units_out || 0) > 0)
      .map(p => {
        const stageScore = STAGE_PERMIT_SCORE[p.main_stage || 'forum1_harmonika'] ?? 5;
        const unitScore = Math.log10(Math.max(p.units_out || 1, 1));
        return { ...p, _score: stageScore * unitScore };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);
  }, [projects]);

  // ═══ Quarter distribution chart data ═══
  const quarterChartData = useMemo(() => {
    const map: Record<string, { total: number; withBlocker: number }> = {};
    for (const p of projects) {
      const q = p.quarter ? `רובע ${p.quarter}` : 'לא מוגדר';
      if (!map[q]) map[q] = { total: 0, withBlocker: 0 };
      map[q].total++;
      if (p.main_blocker && p.main_blocker.trim()) map[q].withBlocker++;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, total: v.total, withBlocker: v.withBlocker }))
      .sort((a, b) => b.total - a.total);
  }, [projects]);

  // ═══ Stage distribution chart data ═══
  const stageChartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of projects) {
      const label = getStageName((p.main_stage as StageId) || 'forum1_harmonika');
      map[label] = (map[label] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projects]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* ═══ Header ═══ */}
        <div className="page-header">
          <div>
            <h1 className="text-lg md:text-xl">ניהול ההתחדשות העירונית – אשדוד</h1>
            <p className="caption mt-1">מערכת חכמה לבקרה על פרויקטי פינוי־בינוי · {kpis.totalProjects} פרויקטים · {formatDate(new Date())}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportExcelOpen(true)} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              ייבוא תאריכים
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSystemSummaryOpen(true)} className="gap-2 h-9 text-[13px] rounded-xl press-scale">
              <Sparkles className="h-4 w-4" />סכם מצב מערכת
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9 text-[13px] rounded-xl press-scale">
                  <Download className="h-4 w-4" />ייצוא
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => import('@/lib/exportUtils').then(m => m.exportDashboardPdf(projects, kpis))} className="gap-2">
                  <FileText className="h-4 w-4" />ייצוא PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => import('@/lib/exportUtils').then(m => m.exportDashboardExcel(projects))} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />ייצוא Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => import('@/lib/officialExport').then(m => m.exportOfficialPinuiBinuiStatus(projects))} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />ייצוא אקסל רשמי – סטטוס פינוי בינוי
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="gap-2 h-9 text-[13px] rounded-xl shadow-sm press-scale" onClick={() => navigate('/projects')}>
              <Building2 className="h-4 w-4" />כל הפרויקטים
            </Button>
          </div>
        </div>

        {/* ═══ KPI Row 1 — Core Metrics ═══ */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard icon={Building2} label="פרויקטים" value={kpis.totalProjects} />
            <KpiCard icon={Home} label="דירות קיימות" value={kpis.totalExisting.toLocaleString()} />
            <KpiCard icon={Target} label="דירות מתוכננות" value={kpis.totalPlanned.toLocaleString()} />
            <KpiCard icon={TrendingUp} label="מכפיל ממוצע" value={`×${kpis.avgMultiplier}`} accent />
            <KpiCard icon={Landmark} label="פוטנציאל צפוי מהיתרים" value={formatShekels(kpis.totalRevenue)} accent subtitle="מחושב לפי 25,000 ₪ ליח״ד, בכפוף לאישור היתרים" />
          </div>
        </section>

        {/* ═══ Smart Command Center teaser ═══ */}
        <section>
          <IntelligenceStrip />
        </section>

        {/* ═══ Tama Sites Summary ═══ */}
        <section>
          <TamaDashboardCard />
        </section>

        {/* ═══ KPI Row 2 — Alerts (only if data exists) ═══ */}
        {(kpis.withBlockers > 0 || kpis.highRisk > 0 || kpis.overdueActions > 0 || kpis.nearDueActions > 0 || kpis.stuckProjects > 0) && (
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.withBlockers > 0 && (
                <KpiCard icon={AlertTriangle} label="עם חסמים" value={kpis.withBlockers} destructive />
              )}
              {kpis.highRisk > 0 && (
                <KpiCard icon={Shield} label="סיכון בינוני+" value={kpis.highRisk} destructive />
              )}
              {kpis.overdueActions > 0 && (
                <KpiCard icon={Clock} label="יעד עבר" value={kpis.overdueActions} destructive />
              )}
              {kpis.nearDueActions > 0 && (
                <KpiCard icon={Calendar} label="יעד קרוב" value={kpis.nearDueActions} accent />
              )}
              {kpis.stuckProjects > 0 && (
                <KpiCard icon={Activity} label="תקועים / מושהים" value={kpis.stuckProjects} destructive />
              )}
            </div>
          </section>
        )}

        {/* ═══ Charts: Quarter + Status distribution ═══ */}
        {projects.length > 0 && (
          <section>
            <style>{`
              @keyframes chartFadeIn {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Chart 1 — Projects by quarter */}
              <div style={{ animation: 'chartFadeIn 500ms ease-out 150ms both' }}>
                <div className="premium-card p-4 transition-shadow duration-300 hover:shadow-lg">
                  <div className="flex justify-between items-center mb-4" dir="rtl">
                    <h3 className="subtitle flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      פרויקטים לפי רובע
                    </h3>
                    <span className="text-[12px] text-muted-foreground">{quarterChartData.length} רבעים</span>
                  </div>
                  <div dir="rtl">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={quarterChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} width={24} orientation="right" />
                        <Tooltip
                          formatter={(v: number, name: string) => [v, name === 'total' ? 'סה"כ' : 'עם חסם']}
                          contentStyle={{ direction: 'rtl', fontFamily: 'inherit', fontSize: 12, borderRadius: 8 }}
                        />
                        <Bar dataKey="total" name="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} maxBarSize={36} />
                        <Bar dataKey="withBlocker" name="withBlocker" fill="hsl(var(--destructive))" radius={[4,4,0,0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 justify-center text-xs mt-1" dir="rtl">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground">סה"כ פרויקטים</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">עם חסם פעיל</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 2 — Projects by stage */}
              <div style={{ animation: 'chartFadeIn 500ms ease-out 300ms both' }}>
                <div className="premium-card p-4 transition-shadow duration-300 hover:shadow-lg">
                  <div className="flex justify-between items-center mb-4" dir="rtl">
                    <h3 className="subtitle flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      פרויקטים לפי שלב
                    </h3>
                    <span className="text-[12px] text-muted-foreground">{stageChartData.length} שלבים</span>
                  </div>
                  <div dir="rtl">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stageChartData} layout="vertical" margin={{ right: 12, left: 4, top: 4, bottom: 4 }}>
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={150}
                          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          orientation="right"
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v} פרויקטים`, '']}
                          contentStyle={{ direction: 'rtl', fontFamily: 'inherit', fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        />
                        <Bar dataKey="value" radius={[6, 0, 0, 6]} maxBarSize={20} fill="hsl(var(--primary))"
                          background={{ fill: 'hsl(var(--muted))', radius: 6, opacity: 0.3 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ Needs Attention Now ═══ */}
        {attentionProjects.length > 0 && (
          <section>
            <h2 className="subtitle mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              דורש טיפול עכשיו
              <span className="text-[12px] text-muted-foreground font-normal mr-2">({attentionProjects.length} פרויקטים)</span>
            </h2>
            <div className="space-y-2">
              {attentionProjects.map(({ project: p, reasons }) => (
                <Link key={p.id} to={`/project/${p.id}`} className="block">
                  <div className={`premium-card p-4 hover:shadow-md transition-shadow duration-200 ${
                    reasons.includes('חסם פעיל') ? 'border-r-4 border-r-destructive/50' :
                    reasons.includes('סיכון גבוה') ? 'border-r-4 border-r-orange-400/50' : ''
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name + tags */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[14px] font-bold">{p.project_name}</span>
                          {p.quarter && <span className="chip chip-muted text-[11px]">רובע {p.quarter}</span>}
                          <span className="chip chip-primary text-[11px]">{getStageName((p.main_stage as StageId) || 'forum1_harmonika')}</span>
                          {reasons.map(r => (
                            <span key={r} className={`chip text-[10px] ${
                              r.includes('חסם') || r.includes('תקוע') || r.includes('עבר') ? 'bg-destructive/10 text-destructive' :
                              r.includes('סיכון') ? 'bg-orange-50 text-orange-700' :
                              'bg-muted text-muted-foreground'
                            }`}>{r}</span>
                          ))}
                        </div>

                        {/* Row 2: Key info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                          {p.management_status && <span>סטטוס: <span className="font-semibold text-foreground">{p.management_status}</span></span>}
                          {p.main_blocker && p.main_blocker.trim() && (
                            <span className="text-destructive font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />חסם: {p.main_blocker}
                            </span>
                          )}
                          {p.next_action && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{p.next_action}
                              {p.next_action_owner && <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{p.next_action_owner}</span>}
                            </span>
                          )}
                          {p.next_action_due_date && (
                            <span className={`font-semibold ${p.next_action_due_date < today ? 'text-destructive' : ''}`}>
                              יעד: {formatDate(p.next_action_due_date)}
                            </span>
                          )}
                          {p.last_update && (
                            <span>עדכון: {formatDate(p.last_update)}</span>
                          )}
                        </div>
                      </div>

                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full text-[13px] h-9 text-primary rounded-xl mt-2" onClick={() => navigate('/projects')}>
              הצג את כל הפרויקטים <ArrowRight className="h-3 w-3 mr-1 rotate-180" />
            </Button>
          </section>
        )}

        {/* ═══ Top 5 by Permit Potential ═══ */}
        {topByPotential.length > 0 && (
          <section>
            <h2 className="subtitle mb-4 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              5 הפרויקטים עם הפוטנציאל הגבוה ביותר מהיתרים
            </h2>
            <div className="premium-card divide-y divide-border/40">
              {topByPotential.map((p, idx) => {
                const potential = (p.units_out || 0) * VALUE_PER_UNIT;
                return (
                  <Link key={p.id} to={`/project/${p.id}`} className="block hover:bg-muted/30 transition-colors">
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold truncate">{p.project_name}</span>
                          {p.quarter && <span className="chip chip-muted text-[11px]">רובע {p.quarter}</span>}
                          <span className="chip chip-primary text-[11px]">{getStageName((p.main_stage as StageId) || 'forum1_harmonika')}</span>
                          {p.management_status && <span className="chip chip-muted text-[10px]">{p.management_status}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[12px] text-muted-foreground">
                          <span>דירות מתוכננות: <span className="font-semibold text-foreground">{(p.units_out || 0).toLocaleString()}</span></span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-[18px] font-extrabold text-emerald-600 leading-none tracking-tight">{formatShekels(potential)}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">פוטנציאל מהיתרים</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ No attention needed ═══ */}
        {attentionProjects.length === 0 && (
          <div className="premium-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-foreground">ללא פרויקטים דורשי טיפול</p>
            <p className="text-sm text-muted-foreground mt-1">אין כרגע פרויקטים שעומדים בתנאי טיפול מיידי</p>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
      {systemSummaryOpen && <SystemSummaryDialog
        open={systemSummaryOpen}
        onOpenChange={setSystemSummaryOpen}
        projects={projects}
        onCreateFormalDoc={(draft) => {
          setFormalDocOverride(draft);
          setFormalDocOpen(true);
        }}
      />}

      {formalDocOpen && <FormalDocumentEditor
        open={formalDocOpen}
        onOpenChange={setFormalDocOpen}
        project={{ project_name: 'התחדשות עירונית – אשדוד' }}
        draftOverride={formalDocOverride}
      />}

      {importExcelOpen && <ImportExcelDatesDialog open={importExcelOpen} onOpenChange={setImportExcelOpen} />}
      </Suspense>
    </Layout>
  );
}

/* ═══ KPI Card Component ═══ */
function KpiCard({ icon: Icon, label, value, accent, destructive, subtitle }: {
  icon: any; label: string; value: string | number; accent?: boolean; destructive?: boolean; subtitle?: string;
}) {
  const colorClass = destructive ? 'text-destructive' : accent ? 'text-primary' : 'text-foreground';
  const iconBg = destructive
    ? 'from-destructive/15 to-destructive/5'
    : accent
      ? 'from-primary/15 to-secondary/10'
      : 'from-primary/8 to-primary/3';

  return (
    <div className="kpi-card cursor-default">
      <div className={`kpi-icon w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center bg-gradient-to-br ${iconBg}`}>
        <Icon className={`h-4.5 w-4.5 ${destructive ? 'text-destructive' : accent ? 'text-primary' : 'text-primary/70'}`} />
      </div>
      <p className={`text-[26px] font-extrabold tracking-tighter leading-none ${colorClass}`} style={{ letterSpacing: '-0.03em' }}>{value}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-1.5 font-semibold">{label}</p>
      {subtitle && <p className="text-[9px] text-muted-foreground/50 mt-1 leading-tight">{subtitle}</p>}
    </div>
  );
}
