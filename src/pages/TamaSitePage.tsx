import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { TamaSite, TAMA_REVIEW_STATUSES, permitValidityCategory } from '@/hooks/useTamaSites';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ArrowRight, MapPin, Phone, User, FileText, Loader2, Wrench,
  AlertCircle, Download, FileSpreadsheet, FileSignature, Save,
  Building2, Activity, Clock, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import FormalDocumentEditor from '@/components/FormalDocumentEditor';
import type { MeetingDocumentDraft } from '@/lib/formalDocumentExport';
import { formatDate } from '@/lib/dateUtils';

const PERMIT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  expired: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'פג תוקף' },
  soon: { bg: 'bg-amber-100', text: 'text-amber-700', label: '90 יום קרובים' },
  valid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'תקף' },
  missing: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'חסר תאריך' },
};

export default function TamaSitePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [site, setSite] = useState<TamaSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from('tama_sites').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (!error && data) {
        setSite(data as TamaSite);
        setReviewStatus(data.review_status);
        setReviewNote(data.review_note);
      }
      setLoading(false);
    });
  }, [id]);

  const permitCfg = useMemo(() => PERMIT_BADGE[permitValidityCategory(site?.permit_validity)], [site]);
  const hasCrane = !!(site?.cranes_count && /^[1-9]/.test(site.cranes_count));

  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    const { error } = await supabase
      .from('tama_sites')
      .update({ review_status: reviewStatus, review_note: reviewNote })
      .eq('id', site.id);
    setSaving(false);
    if (error) {
      toast.error('שגיאה בשמירה');
      return;
    }
    setSite({ ...site, review_status: reviewStatus, review_note: reviewNote });
    toast.success('נשמר בהצלחה');
  };

  const exportExcel = () => {
    if (!site) return;
    const row = {
      'כתובת': site.site_address,
      'רובע': site.quarter || '',
      'ת.בנין': site.building_number || '',
      'מספר בקשה': site.request_number || '',
      'סוג בניה': site.building_type || '',
      'תיאור היתר': site.permit_description || '',
      'תוקף היתר': site.permit_validity || '',
      'סטטוס בניה': site.construction_status || '',
      'איש קשר': site.contact_person || '',
      'טלפון': site.phone || '',
      'מנוף (כמות)': site.cranes_count || '',
      'מנופים (טקסט)': site.cranes_text || '',
      'הערות': site.notes || '',
      'הערות יובל': site.yuval_notes || '',
      'סטטוס ביקורת': site.review_status,
      'הערת ביקורת': site.review_note,
    };
    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'אתר תמא');
    XLSX.writeFile(wb, `tama_${site.site_address.replace(/[^a-zA-Z0-9א-ת]/g, '_')}.xlsx`);
    toast.success('Excel יוצא');
  };

  const exportPDF = () => {
    if (!site) return;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text(`TAMA Site Report`, 14, 18);
    doc.setFontSize(10);
    let y = 30;
    const lines: [string, string][] = [
      ['Address', site.site_address],
      ['Quarter', site.quarter || '-'],
      ['Building #', site.building_number || '-'],
      ['Request #', site.request_number || '-'],
      ['Type', site.building_type || '-'],
      ['Permit Desc', site.permit_description || '-'],
      ['Permit Valid', site.permit_validity || '-'],
      ['Status', site.construction_status || '-'],
      ['Contact', site.contact_person || '-'],
      ['Phone', site.phone || '-'],
      ['Cranes', site.cranes_count || '-'],
      ['Notes', site.notes || '-'],
      ['Yuval Notes', site.yuval_notes || '-'],
      ['Review Status', site.review_status],
      ['Review Note', site.review_note || '-'],
    ];
    lines.forEach(([k, v]) => {
      const text = `${k}: ${String(v).slice(0, 90)}`;
      doc.text(text, 14, y);
      y += 7;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`tama_${site.id.slice(0, 8)}.pdf`);
    toast.success('PDF יוצא');
  };

  const tamaDraft = useMemo<Partial<MeetingDocumentDraft> | null>(() => {
    if (!site) return null;
    const headerLines = [
      `כתובת אתר: ${site.site_address}`,
      site.quarter && `רובע: ${site.quarter}`,
      site.building_number && `ת.בנין: ${site.building_number}`,
      site.request_number && `מספר בקשה: ${site.request_number}`,
      site.building_type && `סוג הבניה: ${site.building_type}`,
      site.permit_description && `תיאור ההיתר: ${site.permit_description}`,
      site.construction_status && `סטטוס בניה: ${site.construction_status}`,
      site.permit_validity && `תוקף היתר: ${site.permit_validity}`,
      site.contact_person && `איש קשר: ${site.contact_person}`,
      site.phone && `טלפון: ${site.phone}`,
      (site.cranes_count || site.cranes_text) && `מנופים: ${site.cranes_count || ''} ${site.cranes_text || ''}`.trim(),
    ].filter(Boolean).join('\n');

    const decisionsLines = [
      `סטטוס ביקורת: ${site.review_status}`,
      site.review_note && `הערת ביקורת: ${site.review_note}`,
      site.notes && `הערות: ${site.notes}`,
      site.yuval_notes && `הערות יובל: ${site.yuval_notes}`,
      site.is_anomaly && 'הערה: רשומה סומנה כחריגה — דורשת אימות נקודתי.',
    ].filter(Boolean).join('\n');

    return {
      documentType: 'tama_site',
      date: formatDate(new Date()),
      subject: `דו״ח אתר תמ״א בביצוע – ${site.site_address}`,
      body: headerLines,
      decisions: decisionsLines,
    };
  }, [site]);

  const openOfficialDoc = () => {
    if (!site) return;
    setDocOpen(true);
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Layout>;
  }
  if (!site) {
    return <Layout><div className="text-center py-20 text-muted-foreground">אתר תמ״א לא נמצא</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" onClick={() => navigate('/tama')} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            חזרה לרשימת תמ״א
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
              <Download className="h-4 w-4" /> ייצוא PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> ייצוא Excel
            </Button>
            <Button variant="outline" size="sm" onClick={openOfficialDoc} className="gap-2">
              <FileSignature className="h-4 w-4" /> צור מסמך רשמי
            </Button>
          </div>
        </div>

        {/* Header */}
        <Card className="border-border/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{site.site_address}</h1>
                  {site.is_anomaly && (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-medium">
                      <AlertCircle className="h-3 w-3" /> רשומה חריגה
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {site.quarter && <span>רובע {site.quarter}</span>}
                  {site.building_type && <span>· {site.building_type}</span>}
                  {site.building_number && <span>· ת.בנין {site.building_number}</span>}
                  {site.request_number && <span>· בקשה {site.request_number}</span>}
                </div>
                {site.permit_description && (
                  <p className="text-sm text-foreground/80 max-w-3xl">{site.permit_description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-sm pt-2">
                  {site.contact_person && (
                    <span className="inline-flex items-center gap-1.5 text-foreground/80">
                      <User className="h-3.5 w-3.5" />{site.contact_person}
                    </span>
                  )}
                  {site.phone && (
                    <a href={`tel:${site.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" />{site.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniKpi icon={Activity} label="סטטוס בניה" value={site.construction_status || '—'} />
          <MiniKpi icon={Clock} label="תוקף היתר" value={site.permit_validity || '—'} badge={permitCfg} />
          <MiniKpi icon={Wrench} label="מנוף" value={hasCrane ? site.cranes_count! : 'אין'} />
          <MiniKpi icon={ShieldCheck} label="סטטוס ביקורת" value={site.review_status} />
          <MiniKpi icon={Building2} label="חריגה" value={site.is_anomaly ? 'כן' : 'לא'} />
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Section title="פרטי אתר מלאים">
            <Field label="כתובת" value={site.site_address} />
            <Field label="רובע" value={site.quarter} />
            <Field label="ת.בנין" value={site.building_number} />
            <Field label="מספר בקשה" value={site.request_number} />
            <Field label="סוג בניה" value={site.building_type} />
            <Field label="תיאור היתר" value={site.permit_description} multiline />
            <Field label="תוקף היתר" value={site.permit_validity} />
            <Field label="סטטוס בניה" value={site.construction_status} />
            <Field label="מנוף (כמות)" value={site.cranes_count} />
            <Field label="מנופים (טקסט)" value={site.cranes_text} />
          </Section>

          <Section title="קשר והערות מקור">
            <Field label="איש קשר" value={site.contact_person} icon={User} />
            <Field label="טלפון" value={site.phone} icon={Phone} />
            <Field label="הערות" value={site.notes} multiline />
            <Field label="הערות יובל" value={site.yuval_notes} multiline />
          </Section>
        </div>

        {/* Edit Section */}
        <Card className="border-border/40">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">ערוך נתוני אתר — ביקורת פנימית</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">סטטוס ביקורת</label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAMA_REVIEW_STATUSES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:row-span-2">
                <label className="text-xs font-semibold text-muted-foreground">הערת ביקורת</label>
                <Textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  rows={5}
                  placeholder="הערות פנימיות לביקורת…"
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור שינויים
            </Button>
          </CardContent>
        </Card>
      </div>

      <FormalDocumentEditor
        open={docOpen}
        onOpenChange={setDocOpen}
        project={site}
        draftOverride={tamaDraft}
      />
    </Layout>
  );
}

function MiniKpi({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string; badge?: { bg: string; text: string; label: string } }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-[11px] mb-1">
          <Icon className="h-3.5 w-3.5" />{label}
        </div>
        <div className="text-sm font-semibold text-foreground truncate" title={value}>{value}</div>
        {badge && <span className={cn('inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium', badge.bg, badge.text)}>{badge.label}</span>}
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-4 space-y-2.5">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, icon: Icon, multiline }: { label: string; value: any; icon?: any; multiline?: boolean }) {
  return (
    <div className="flex gap-2 text-xs py-1 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground min-w-[110px] shrink-0 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}:
      </span>
      <span className={cn('text-foreground font-medium', multiline ? 'whitespace-pre-wrap' : '')}>{value || '—'}</span>
    </div>
  );
}
