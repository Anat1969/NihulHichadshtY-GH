import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useTamaSites, TamaSite, TAMA_REVIEW_STATUSES, permitValidityCategory } from '@/hooks/useTamaSites';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Building2, Search, Activity, Clock, CheckCircle2, AlertTriangle,
  Construction, MapPin, Phone, User, FileText, Loader2, Wrench,
  XCircle, Eye, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'אתר פעיל': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'אתר פעיל' },
  'טרם החלו בבניה': { bg: 'bg-slate-100', text: 'text-slate-600', label: 'טרם החלו בבניה' },
  'טרם הסתיימו עבודות בניה -אתר אינו פעיל': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'אתר לא פעיל' },
  'עבודות גמר': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'עבודות גמר' },
  'הבניה הסתיימה ממתין לתעודת גמר': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ממתין תעודת גמר' },
  'החלו עבודות': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'החלו עבודות' },
};

const PERMIT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  expired: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'פג תוקף' },
  soon: { bg: 'bg-amber-100', text: 'text-amber-700', label: '90 יום' },
  valid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'תקף' },
  missing: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'חסר' },
};

function statusChip(status: string | null) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = STATUS_COLORS[status] || { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

export default function TamaPage() {
  const navigate = useNavigate();
  const { sites, loading, updateReview } = useTamaSites();
  const [search, setSearch] = useState('');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCrane, setFilterCrane] = useState<string>('all');
  const [filterPermit, setFilterPermit] = useState<string>('all');
  const [filterReview, setFilterReview] = useState<string>('all');
  const [detail, setDetail] = useState<TamaSite | null>(null);

  const enriched = useMemo(() => sites.map(s => ({
    ...s,
    _permit: permitValidityCategory(s.permit_validity),
    _hasCrane: !!(s.cranes_count && /^[1-9]/.test(s.cranes_count)),
  })), [sites]);

  const quarters = useMemo(() => {
    const set = new Set<string>();
    sites.forEach(s => { if (s.quarter) set.add(s.quarter); });
    return Array.from(set).sort();
  }, [sites]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    sites.forEach(s => { if (s.construction_status) set.add(s.construction_status); });
    return Array.from(set);
  }, [sites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(s => {
      if (q) {
        const hay = [s.site_address, s.building_number, s.request_number, s.contact_person, s.phone]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterQuarter !== 'all' && s.quarter !== filterQuarter) return false;
      if (filterStatus !== 'all' && s.construction_status !== filterStatus) return false;
      if (filterCrane === 'yes' && !s._hasCrane) return false;
      if (filterCrane === 'no' && s._hasCrane) return false;
      if (filterPermit !== 'all' && s._permit !== filterPermit) return false;
      if (filterReview !== 'all' && s.review_status !== filterReview) return false;
      return true;
    });
  }, [enriched, search, filterQuarter, filterStatus, filterCrane, filterPermit, filterReview]);

  const kpis = useMemo(() => {
    const total = sites.length;
    const active = sites.filter(s => s.construction_status === 'אתר פעיל').length;
    const notStarted = sites.filter(s => s.construction_status === 'טרם החלו בבניה').length;
    const inactive = sites.filter(s => s.construction_status === 'טרם הסתיימו עבודות בניה -אתר אינו פעיל').length;
    const finishing = sites.filter(s => s.construction_status === 'עבודות גמר').length;
    const awaitingCert = sites.filter(s => s.construction_status === 'הבניה הסתיימה ממתין לתעודת גמר').length;
    const withCrane = enriched.filter(s => s._hasCrane).length;
    const expired = enriched.filter(s => s._permit === 'expired').length;
    const anomalies = sites.filter(s => s.is_anomaly).length;
    return { total, active, notStarted, inactive, finishing, awaitingCert, withCrane, expired, anomalies };
  }, [sites, enriched]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">תמ״א בביצוע</h1>
            <p className="text-sm text-muted-foreground mt-1">ניהול ומעקב אתרי תמ״א פעילים בעיר</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard icon={Building2} label="סה״כ אתרים" value={kpis.total} color="text-primary" />
          <KpiCard icon={Activity} label="אתרים פעילים" value={kpis.active} color="text-emerald-600" />
          <KpiCard icon={Clock} label="טרם החלו" value={kpis.notStarted} color="text-slate-500" />
          <KpiCard icon={XCircle} label="לא פעילים" value={kpis.inactive} color="text-amber-600" />
          <KpiCard icon={Construction} label="עבודות גמר" value={kpis.finishing} color="text-orange-600" />
          <KpiCard icon={CheckCircle2} label="ממתינים לתעודת גמר" value={kpis.awaitingCert} color="text-blue-600" />
          <KpiCard icon={Wrench} label="אתרים עם מנוף" value={kpis.withCrane} color="text-indigo-600" />
          <KpiCard icon={AlertTriangle} label="היתרים שפג תוקפם" value={kpis.expired} color="text-rose-600" />
          <KpiCard icon={AlertCircle} label="רשומות חריגות" value={kpis.anomalies} color="text-amber-700" />
        </div>

        {/* Filters */}
        <Card className="border-border/40">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש לפי כתובת / ת.בנין / בקשה / איש קשר / טלפון…"
                className="pr-10 h-10"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Select value={filterQuarter} onValueChange={setFilterQuarter}>
                <SelectTrigger><SelectValue placeholder="רובע" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרבעים</SelectItem>
                  {quarters.map(q => <SelectItem key={q} value={q}>רובע {q}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="סטטוס בניה" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  {statuses.map(s => <SelectItem key={s} value={s}>{STATUS_COLORS[s]?.label || s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCrane} onValueChange={setFilterCrane}>
                <SelectTrigger><SelectValue placeholder="מנוף" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">מנוף — הכל</SelectItem>
                  <SelectItem value="yes">יש מנוף</SelectItem>
                  <SelectItem value="no">אין מנוף</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPermit} onValueChange={setFilterPermit}>
                <SelectTrigger><SelectValue placeholder="תוקף היתר" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">תוקף — הכל</SelectItem>
                  <SelectItem value="valid">תקף</SelectItem>
                  <SelectItem value="soon">90 יום קרובים</SelectItem>
                  <SelectItem value="expired">פג תוקף</SelectItem>
                  <SelectItem value="missing">חסר תאריך</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterReview} onValueChange={setFilterReview}>
                <SelectTrigger><SelectValue placeholder="סטטוס ביקורת" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ביקורת — הכל</SelectItem>
                  {TAMA_REVIEW_STATUSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              מציג {filtered.length} מתוך {sites.length} אתרים
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border/40">
                  <tr className="text-right text-xs font-semibold text-muted-foreground">
                    <th className="px-3 py-2.5">כתובת</th>
                    <th className="px-3 py-2.5">רובע</th>
                    <th className="px-3 py-2.5">סטטוס בניה</th>
                    <th className="px-3 py-2.5">סוג</th>
                    <th className="px-3 py-2.5">תיאור היתר</th>
                    <th className="px-3 py-2.5">איש קשר</th>
                    <th className="px-3 py-2.5">טלפון</th>
                    <th className="px-3 py-2.5">תוקף היתר</th>
                    <th className="px-3 py-2.5">מנוף</th>
                    <th className="px-3 py-2.5">הערות יובל</th>
                    <th className="px-3 py-2.5">ביקורת</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const permitCfg = PERMIT_BADGE[s._permit];
                    return (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/tama/${s.id}`)}
                        className={cn(
                          'border-b border-border/20 hover:bg-muted/40 transition-colors cursor-pointer',
                          s.is_anomaly && 'bg-amber-50/50'
                        )}
                      >
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {s.site_address}
                          {s.is_anomaly && <span className="mr-1 inline-flex text-amber-600" title="רשומה חריגה"><AlertCircle className="h-3.5 w-3.5 inline" /></span>}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{s.quarter || '—'}</td>
                        <td className="px-3 py-2.5">{statusChip(s.construction_status)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{s.building_type || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[180px] truncate" title={s.permit_description || ''}>{s.permit_description || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[140px] truncate" title={s.contact_person || ''}>{s.contact_person || '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{s.phone || '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{s.permit_validity || '—'}</span>
                            <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium', permitCfg.bg, permitCfg.text)}>{permitCfg.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs">
                          {s._hasCrane ? <span className="text-indigo-600 font-bold">{s.cranes_count}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate" title={s.yuval_notes || ''}>{s.yuval_notes || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium',
                            s.review_status === 'תקין' ? 'bg-emerald-100 text-emerald-700' :
                            s.review_status === 'הושלם' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          )}>{s.review_status}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); navigate(`/tama/${s.id}`); }}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> עיין
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={12} className="text-center py-12 text-muted-foreground">לא נמצאו אתרים תואמים</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail / Edit Drawer */}
      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent side="left" className="w-[480px] sm:max-w-[480px] overflow-y-auto" dir="rtl">
          {detail && <DetailPanel site={detail} onUpdate={async (patch) => {
            try {
              await updateReview(detail.id, patch);
              setDetail({ ...detail, ...patch });
              toast.success('הביקורת נשמרה');
            } catch {
              toast.error('שגיאה בשמירת הביקורת');
            }
          }} />}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center', color)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground truncate">{label}</div>
            <div className="text-xl font-extrabold text-foreground">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailPanel({ site, onUpdate }: { site: TamaSite; onUpdate: (p: { review_status?: string; review_note?: string }) => Promise<void> }) {
  const [reviewStatus, setReviewStatus] = useState(site.review_status);
  const [reviewNote, setReviewNote] = useState(site.review_note);
  const [saving, setSaving] = useState(false);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-right flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {site.site_address}
        </SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-5">
        {site.is_anomaly && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>רשומה חריגה — בקובץ המקור הופיע מידע חלקי או בעמודה הלא נכונה. דורש אימות ידני.</span>
          </div>
        )}

        <Section title="פרטי אתר">
          <Field label="ת.בנין" value={site.building_number} />
          <Field label="מספר בקשה" value={site.request_number} />
          <Field label="רובע" value={site.quarter} />
          <Field label="סוג בניה" value={site.building_type} />
          <Field label="תיאור היתר" value={site.permit_description} />
          <Field label="תוקף היתר" value={site.permit_validity} />
          <Field label="סטטוס בניה" value={site.construction_status} />
          <Field label="מנוף (כמות)" value={site.cranes_count} />
          <Field label="מנופים (טקסט)" value={site.cranes_text} />
        </Section>

        <Section title="קשר">
          <Field label="איש קשר" value={site.contact_person} icon={User} />
          <Field label="טלפון" value={site.phone} icon={Phone} />
        </Section>

        <Section title="הערות מקור">
          <Field label="הערות" value={site.notes} multiline />
          <Field label="הערות יובל" value={site.yuval_notes} multiline />
        </Section>

        <Section title="ניהול ביקורת פנימית">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">סטטוס ביקורת</label>
            <Select value={reviewStatus} onValueChange={setReviewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAMA_REVIEW_STATUSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">הערת ביקורת</label>
            <Textarea
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              rows={4}
              placeholder="הערות פנימיות לביקורת…"
            />
          </div>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onUpdate({ review_status: reviewStatus, review_note: reviewNote });
              setSaving(false);
            }}
            className="w-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור ביקורת'}
          </Button>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">{title}</h3>
      <div className="space-y-2.5 rounded-xl bg-muted/30 p-3">{children}</div>
    </div>
  );
}

function Field({ label, value, icon: Icon, multiline }: { label: string; value: any; icon?: any; multiline?: boolean }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground min-w-[90px] shrink-0 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}:
      </span>
      <span className={cn('text-foreground font-medium', multiline ? 'whitespace-pre-wrap' : '')}>{value || '—'}</span>
    </div>
  );
}
