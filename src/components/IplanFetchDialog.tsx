import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Sparkles, CheckCircle2, ExternalLink, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IplanData {
  plan_number: string;
  project_name: string | null;
  developer: string | null;
  address_cluster_summary: string | null;
  quarter: string | null;
  units_in: number | null;
  units_out: number | null;
  authority: string | null;
  plan_status: string | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  onApplied?: () => void;
}

type Step = 'input' | 'fetching' | 'review' | 'applying' | 'done';

const FIELD_LABELS: { key: keyof IplanData; label: string; editable: boolean }[] = [
  { key: 'plan_number', label: 'מספר תוכנית', editable: false },
  { key: 'project_name', label: 'שם הפרויקט', editable: true },
  { key: 'developer', label: 'יזם', editable: true },
  { key: 'address_cluster_summary', label: 'כתובת מתחם', editable: true },
  { key: 'quarter', label: 'רובע', editable: true },
  { key: 'units_in', label: 'דירות קיימות', editable: true },
  { key: 'units_out', label: 'דירות מוצעות', editable: true },
  { key: 'plan_status', label: 'סטטוס תוכנית', editable: true },
  { key: 'notes', label: 'הערות', editable: true },
];

export default function IplanFetchDialog({ open, onOpenChange, projectId, onApplied }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('input');
  const [planNumber, setPlanNumber] = useState('');
  const [data, setData] = useState<IplanData | null>(null);
  const [iplanUrl, setIplanUrl] = useState('');
  const [edited, setEdited] = useState<Partial<Record<keyof IplanData, string>>>({});

  const reset = () => {
    setStep('input');
    setPlanNumber('');
    setData(null);
    setIplanUrl('');
    setEdited({});
  };

  const fetchData = async () => {
    if (!planNumber.trim()) return;
    setStep('fetching');
    try {
      const { data: resp, error } = await supabase.functions.invoke('iplan-fetch', {
        body: { planNumber: planNumber.trim() },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      setData(resp.data as IplanData);
      setIplanUrl(resp.iplanUrl || '');
      setEdited({});
      setStep('review');
    } catch (e: any) {
      toast({ title: 'שגיאה בשליפה', description: e?.message || 'נסה שוב', variant: 'destructive' });
      setStep('input');
    }
  };

  const apply = async () => {
    if (!data) return;
    setStep('applying');
    try {
      const merged: any = { ...data, ...edited };
      const updates: Record<string, any> = {};
      if (merged.plan_number) updates.plan_number = merged.plan_number;
      if (merged.project_name) updates.project_name = merged.project_name;
      if (merged.developer) updates.developer = merged.developer;
      if (merged.address_cluster_summary) updates.address_cluster_summary = merged.address_cluster_summary;
      if (merged.quarter) updates.quarter = merged.quarter;
      if (merged.units_in != null && merged.units_in !== '') updates.units_in = Number(merged.units_in);
      if (merged.units_out != null && merged.units_out !== '') updates.units_out = Number(merged.units_out);
      if (merged.authority) updates.authority = merged.authority;
      if (merged.notes) updates.notes = merged.notes;

      const { error } = await supabase.from('projects').update(updates).eq('id', projectId);
      if (error) throw error;

      await supabase.from('audit_log').insert({
        actor: 'iplan-fetch',
        action: 'iplan_data_applied',
        entity_type: 'project',
        entity_id: projectId,
        project_id: projectId,
        details: { planNumber, appliedFields: Object.keys(updates), iplanUrl },
      });

      setStep('done');
      onApplied?.();
      toast({ title: 'הנתונים שותלו בפרויקט ✓' });
    } catch (e: any) {
      toast({ title: 'שגיאה בשתילה', description: e?.message, variant: 'destructive' });
      setStep('review');
    }
  };

  const getValue = (key: keyof IplanData): string => {
    const v = edited[key] !== undefined ? edited[key] : data?.[key];
    return v != null ? String(v) : '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            ייבוא מ-iplan — מידע תכנוני
          </DialogTitle>
        </DialogHeader>

        {/* INPUT */}
        {step === 'input' && (
          <div className="space-y-5 pt-2">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground mb-1">כיצד זה עובד?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                הזן מספר תוכנית → Yohan AI שולף נתונים מ-iplan → תראה תצוגה מקדימה → אשר ושתול בפרויקט
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">מספר תוכנית</p>
              <Input
                value={planNumber}
                onChange={(e) => setPlanNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                placeholder="לדוגמה: 405-0123456"
                className="rounded-xl text-base h-11 font-mono"
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground">המספר מופיע באתר mavat.iplan.gov.il</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button className="gap-2 rounded-xl" onClick={fetchData} disabled={!planNumber.trim()}>
                <Sparkles className="h-4 w-4" />
                שלוף נתונים
              </Button>
            </div>
          </div>
        )}

        {/* FETCHING */}
        {step === 'fetching' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold">שולף נתונים מ-iplan...</p>
              <p className="text-sm text-muted-foreground">מחפש תוכנית {planNumber}</p>
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* REVIEW */}
        {step === 'review' && data && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                ✓ נמצאה תוכנית {planNumber}
              </Badge>
              {iplanUrl && (
                <a
                  href={iplanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  צפה ב-iplan <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="rounded-xl border border-border/60 divide-y divide-border/40">
              {FIELD_LABELS.map(({ key, label, editable }) => {
                const val = getValue(key);
                const isEmpty = !val;
                return (
                  <div key={key} className="grid grid-cols-[140px_1fr] gap-3 items-center px-4 py-2.5">
                    <p className="text-[12px] font-semibold text-muted-foreground">{label}</p>
                    {editable ? (
                      <Input
                        value={val}
                        onChange={(e) => setEdited((prev) => ({ ...prev, [key]: e.target.value }))}
                        className={cn(
                          'h-8 text-[13px] rounded-lg border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none',
                          isEmpty && 'text-muted-foreground italic',
                        )}
                        placeholder={isEmpty ? 'לא נמצא — ניתן למלא ידנית' : ''}
                      />
                    ) : (
                      <p className="text-[13px] font-mono">{val || '—'}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep('input')}>
                חזרה
              </Button>
              <Button className="gap-2 rounded-xl" onClick={apply}>
                <Building2 className="h-4 w-4" />
                שתול בפרויקט
              </Button>
            </div>
          </div>
        )}

        {/* APPLYING */}
        {step === 'applying' && (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-semibold">משתיל נתונים בפרויקט...</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-lg">הנתונים שותלו בהצלחה</p>
              <p className="text-sm text-muted-foreground mt-1">הפרויקט עודכן עם נתוני iplan</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={reset}>
                שליפה נוספת
              </Button>
              <Button className="rounded-xl" onClick={() => onOpenChange(false)}>
                סגור
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
