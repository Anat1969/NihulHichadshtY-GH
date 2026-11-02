import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { STAGES } from '@/types/project';
import { ExternalLink } from 'lucide-react';
import type { ProjectWithAddresses } from '@/hooks/useProjects';

interface FullEditDrawerProps {
  project: ProjectWithAddresses | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Record<string, any>) => Promise<void>;
}

const MANAGEMENT_STATUSES = [
  { value: 'active', label: 'פעיל' },
  { value: 'on_hold', label: 'מושהה' },
  { value: 'stuck', label: 'תקוע' },
  { value: 'completed', label: 'הושלם' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'נמוך' },
  { value: 'medium', label: 'בינוני' },
  { value: 'high', label: 'גבוה' },
];

export default function FullEditDrawer({ project, open, onOpenChange, onSave }: FullEditDrawerProps) {
  const [data, setData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setData({
        project_name: project.project_name,
        quarter: project.quarter || '',
        plan_number: project.plan_number || '',
        iplan_object_id: project.iplan_object_id ?? '',
        authority: project.authority || '',
        developer: project.developer || '',
        plan_submitter: project.plan_submitter || '',
        address_cluster_summary: project.address_cluster_summary || '',
        source_addresses_text: project.source_addresses_text || '',
        units_in: project.units_in || 0,
        units_out: project.units_out || 0,
        main_stage: project.main_stage || 'forum1_harmonika',
        sub_stage: project.sub_stage || '',
        management_status: project.management_status || 'active',
        risk_level: project.risk_level || 'low',
        main_blocker: project.main_blocker || '',
        next_action: project.next_action || '',
        next_action_owner: project.next_action_owner || '',
        next_action_due_date: project.next_action_due_date || '',
        notes: project.notes || '',
      });
    }
  }, [project]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const unitsIn = Number(data.units_in) || 0;
      const unitsOut = Number(data.units_out) || 0;
      const multiplier = unitsIn > 0 ? parseFloat((unitsOut / unitsIn).toFixed(2)) : 0;
      // Normalize: empty date string -> null (PG date column rejects '')
      const dueDate = data.next_action_due_date && String(data.next_action_due_date).trim() !== ''
        ? data.next_action_due_date
        : null;
      const rawIplan = String(data.iplan_object_id ?? '').trim();
      const iplanObjectId = rawIplan === '' ? null : (Number.isFinite(Number(rawIplan)) ? Number(rawIplan) : null);
      await onSave({
        ...data,
        units_in: unitsIn,
        units_out: unitsOut,
        multiplier,
        next_action_due_date: dueDate,
        iplan_object_id: iplanObjectId,
        last_update: new Date().toISOString(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: any) => setData(prev => ({ ...prev, [key]: val }));

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider pt-2">{children}</h3>
  );

  const unitsIn = Number(data.units_in) || 0;
  const unitsOut = Number(data.units_out) || 0;
  const multiplier = unitsIn > 0 ? (unitsOut / unitsIn).toFixed(1) : '—';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right">עריכה מלאה — {project?.project_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-6">
          {/* Section 1: Basic Details */}
          <SectionTitle>פרטים בסיסיים</SectionTitle>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">שם הפרויקט</Label>
              <Input value={data.project_name || ''} onChange={e => set('project_name', e.target.value)} className="h-9 rounded-xl text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">רובע</Label>
                <Input value={data.quarter || ''} onChange={e => set('quarter', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">מספר תכנית</Label>
                <Input value={data.plan_number || ''} onChange={e => set('plan_number', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold flex items-center gap-2">
                iplan OBJECTID
                {data.iplan_object_id && (
                  <a
                    href={`https://mavat.iplan.gov.il/SV4/1/${data.iplan_object_id}/310`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="פתח מסמכי תוכנית ב-iplan"
                    className="text-primary hover:text-primary/80 inline-flex items-center"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </Label>
              <Input
                value={data.iplan_object_id ?? ''}
                onChange={e => set('iplan_object_id', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="לדוגמה: 6000390881"
                className="h-9 rounded-xl text-[13px] font-mono"
              />
              <p className="text-[11px] text-muted-foreground">מזהה ייחודי של התכנית במערכת iplan — מאפשר קישור ישיר למסמכים.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">רשות</Label>
                <Input value={data.authority || ''} onChange={e => set('authority', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">יזם</Label>
                <Input value={data.developer || ''} onChange={e => set('developer', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">מגיש תכנית</Label>
              <Input value={data.plan_submitter || ''} onChange={e => set('plan_submitter', e.target.value)} className="h-9 rounded-xl text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">כתובת / מתחם</Label>
              <Input value={data.address_cluster_summary || ''} onChange={e => set('address_cluster_summary', e.target.value)} className="h-9 rounded-xl text-[13px]" />
            </div>
          </div>

          <Separator />

          {/* Section 2: Planning Data */}
          <SectionTitle>נתוני תכנון</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">דירות קיימות</Label>
                <Input type="number" min="0" value={data.units_in || 0} onChange={e => set('units_in', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">דירות מתוכננות</Label>
                <Input type="number" min="0" value={data.units_out || 0} onChange={e => set('units_out', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">מכפיל</Label>
                <div className="h-9 rounded-xl bg-muted/50 flex items-center justify-center text-[13px] font-bold text-primary">×{multiplier}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Ongoing Management */}
          <SectionTitle>ניהול שוטף</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">שלב ראשי</Label>
                <Select value={data.main_stage} onValueChange={v => set('main_stage', v)}>
                  <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">תת-שלב</Label>
                <Input value={data.sub_stage || ''} onChange={e => set('sub_stage', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">סטטוס ניהולי</Label>
                <Select value={data.management_status} onValueChange={v => set('management_status', v)}>
                  <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{MANAGEMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">רמת סיכון</Label>
                <Select value={data.risk_level} onValueChange={v => set('risk_level', v)}>
                  <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">חסם מרכזי</Label>
              <Input value={data.main_blocker || ''} onChange={e => set('main_blocker', e.target.value)} className="h-9 rounded-xl text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">פעולה הבאה</Label>
              <Input value={data.next_action || ''} onChange={e => set('next_action', e.target.value)} className="h-9 rounded-xl text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">אחראי</Label>
                <Input value={data.next_action_owner || ''} onChange={e => set('next_action_owner', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">תאריך יעד</Label>
                <Input type="date" value={data.next_action_due_date || ''} onChange={e => set('next_action_due_date', e.target.value)} className="h-9 rounded-xl text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">הערות</Label>
              <Textarea value={data.notes || ''} onChange={e => set('notes', e.target.value)} className="rounded-xl text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 pb-6">
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl text-[13px] font-semibold press-scale">
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 rounded-xl text-[13px]">ביטול</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
