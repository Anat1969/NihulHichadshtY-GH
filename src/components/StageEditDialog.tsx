import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

const STATUS_LABELS: Record<StageStatus, string> = {
  not_started: 'טרם התחיל',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  blocked: 'חסום',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  stageId: string;
  stageName: string;
  onSaved?: () => void;
}

export default function StageEditDialog({ open, onOpenChange, projectId, stageId, stageName, onSaved }: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<StageStatus>('not_started');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from('project_stage_dates')
        .select('status, planned_start, planned_end, notes')
        .eq('project_id', projectId)
        .eq('stage_id', stageId)
        .maybeSingle();
      setStatus((data?.status as StageStatus) || 'not_started');
      setStart(data?.planned_start || '');
      setEnd(data?.planned_end || '');
      setNotes(data?.notes || '');
      setLoading(false);
    })();
  }, [open, projectId, stageId]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from('project_stage_dates')
      .upsert(
        {
          project_id: projectId,
          stage_id: stageId,
          status,
          planned_start: start || null,
          planned_end: end || null,
          notes: notes || null,
        },
        { onConflict: 'project_id,stage_id' },
      );
    setSaving(false);
    if (error) {
      toast({ title: 'שגיאה בשמירה', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'השלב נשמר' });
    window.dispatchEvent(new CustomEvent('stage-dates-changed', { detail: { projectId } }));
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">עריכת שלב</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>שם השלב</Label>
            <Input value={stageName} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>סטטוס</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StageStatus)} disabled={loading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as StageStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>תאריך התחלה</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} disabled={loading} />
            </div>
            <div>
              <Label>תאריך סיום</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div>
            <Label>הערות</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} disabled={loading} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? 'שומר...' : 'שמור'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
