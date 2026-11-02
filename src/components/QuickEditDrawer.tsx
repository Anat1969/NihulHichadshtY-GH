import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STAGES } from '@/types/project';
import type { ProjectWithAddresses } from '@/hooks/useProjects';

interface QuickEditDrawerProps {
  project: ProjectWithAddresses | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Record<string, any>) => Promise<void>;
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

export default function QuickEditDrawer({ project, open, onOpenChange, onSave }: QuickEditDrawerProps) {
  const [data, setData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setData({
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
    if (!project) return;
    setSaving(true);
    await onSave(project.id, { ...data, last_update: new Date().toISOString() });
    setSaving(false);
    onOpenChange(false);
  };

  const set = (key: string, val: any) => setData(prev => ({ ...prev, [key]: val }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right">עריכה מהירה — {project?.project_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-6">
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
              <Input value={data.sub_stage} onChange={e => set('sub_stage', e.target.value)} className="h-9 rounded-xl text-[13px]" placeholder="אופציונלי" />
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
            <Input value={data.main_blocker} onChange={e => set('main_blocker', e.target.value)} className="h-9 rounded-xl text-[13px]" placeholder="מה חוסם את ההתקדמות?" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">פעולה הבאה</Label>
            <Input value={data.next_action} onChange={e => set('next_action', e.target.value)} className="h-9 rounded-xl text-[13px]" placeholder="מה צריך לעשות?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">אחראי</Label>
              <Input value={data.next_action_owner} onChange={e => set('next_action_owner', e.target.value)} className="h-9 rounded-xl text-[13px]" placeholder="מי?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">תאריך יעד</Label>
              <Input type="date" value={data.next_action_due_date} onChange={e => set('next_action_due_date', e.target.value)} className="h-9 rounded-xl text-[13px]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">הערות</Label>
            <Textarea value={data.notes} onChange={e => set('notes', e.target.value)} className="rounded-xl text-[13px] min-h-[60px]" placeholder="הערות קצרות..." />
          </div>

          <div className="flex gap-3 pt-3">
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
