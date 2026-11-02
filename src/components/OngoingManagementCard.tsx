import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ArrowRight, Calendar, Edit, ShieldAlert, User, Clock } from 'lucide-react';

interface OngoingManagementCardProps {
  project: {
    management_status?: string | null;
    risk_level?: string | null;
    main_blocker?: string | null;
    next_action?: string | null;
    next_action_owner?: string | null;
    next_action_due_date?: string | null;
    last_update?: string | null;
    notes?: string | null;
  };
  onUpdate: (updates: Record<string, any>) => Promise<void>;
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

const RISK_LABELS: Record<string, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
};

const STATUS_COLORS: Record<string, string> = {
  'active': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'בתוקף': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'בדרך לאישור סופי': 'bg-blue-100 text-blue-800 border-blue-200',
  'הכנה לדיון הפקדה': 'bg-amber-100 text-amber-800 border-amber-200',
  'בדרך להפקדה': 'bg-amber-100 text-amber-800 border-amber-200',
  'הופקדה': 'bg-sky-100 text-sky-800 border-sky-200',
  'ממתינה לאישור': 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function OngoingManagementCard({ project, onUpdate }: OngoingManagementCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const hasBlocker = project.main_blocker && project.main_blocker.trim() !== '';
  const hasNextAction = project.next_action && project.next_action.trim() !== '';
  const riskLevel = project.risk_level || 'low';
  const statusColor = STATUS_COLORS[project.management_status || ''] || 'bg-secondary text-secondary-foreground border-border';
  const riskColor = RISK_COLORS[riskLevel] || RISK_COLORS.low;

  const openEdit = () => {
    setEditData({
      management_status: project.management_status || '',
      risk_level: project.risk_level || 'low',
      main_blocker: project.main_blocker || '',
      next_action: project.next_action || '',
      next_action_owner: project.next_action_owner || '',
      next_action_due_date: project.next_action_due_date || '',
      notes: project.notes || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    await onUpdate(editData);
    setEditOpen(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/30">
          <h2 className="text-[14px] font-bold">ניהול שוטף</h2>
          <Button variant="ghost" size="sm" onClick={openEdit} className="h-7 gap-1.5 text-[12px] text-muted-foreground rounded-lg">
            <Edit className="h-3.5 w-3.5" />עריכה
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tags row: status + risk */}
          <div className="flex items-center gap-2 flex-wrap">
            {project.management_status && (
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border', statusColor)}>
                {project.management_status}
              </span>
            )}
            <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-semibold border', riskColor)}>
              <ShieldAlert className="h-3 w-3" />
              סיכון: {RISK_LABELS[riskLevel] || riskLevel}
            </span>
            {project.last_update && (
              <span className="text-[11px] text-muted-foreground mr-auto flex items-center gap-1">
                <Clock className="h-3 w-3" />
                עדכון אחרון: {formatDate(project.last_update)}
              </span>
            )}
          </div>

          {/* Main Blocker */}
          <div className={cn(
            'rounded-xl p-4 border',
            hasBlocker ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40' : 'bg-muted/30 border-border/40'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className={cn('h-4 w-4', hasBlocker ? 'text-red-600' : 'text-muted-foreground/40')} />
              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">חסם מרכזי</span>
            </div>
            <p className={cn('text-[14px] font-semibold', hasBlocker ? 'text-red-900 dark:text-red-200' : 'text-muted-foreground/50')}>
              {hasBlocker ? project.main_blocker : 'לא הוגדר חסם'}
            </p>
          </div>

          {/* Next Action */}
          <div className={cn(
            'rounded-xl p-4 border',
            hasNextAction ? 'bg-primary/[0.04] border-primary/20' : 'bg-muted/30 border-border/40'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowRight className={cn('h-4 w-4', hasNextAction ? 'text-primary' : 'text-muted-foreground/40')} />
              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">הפעולה הבאה</span>
            </div>
            <p className={cn('text-[14px] font-semibold', hasNextAction ? 'text-foreground' : 'text-muted-foreground/50')}>
              {hasNextAction ? project.next_action : 'לא הוגדרה פעולה'}
            </p>
            {hasNextAction && (project.next_action_owner || project.next_action_due_date) && (
              <div className="flex items-center gap-4 mt-2 text-[12px] text-muted-foreground">
                {project.next_action_owner && (
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{project.next_action_owner}</span>
                )}
                {project.next_action_due_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.next_action_due_date)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader><DialogTitle>עריכת ניהול שוטף</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">סטטוס ניהולי</Label>
                <Input value={editData.management_status || ''} onChange={e => setEditData({ ...editData, management_status: e.target.value })} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">רמת סיכון</Label>
                <select
                  value={editData.risk_level || 'low'}
                  onChange={e => setEditData({ ...editData, risk_level: e.target.value })}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-[13px]"
                >
                  <option value="low">נמוך</option>
                  <option value="medium">בינוני</option>
                  <option value="high">גבוה</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">חסם מרכזי</Label>
              <Textarea value={editData.main_blocker || ''} onChange={e => setEditData({ ...editData, main_blocker: e.target.value })} className="rounded-xl text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">הפעולה הבאה</Label>
              <Textarea value={editData.next_action || ''} onChange={e => setEditData({ ...editData, next_action: e.target.value })} className="rounded-xl text-[13px] min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">אחראי</Label>
                <Input value={editData.next_action_owner || ''} onChange={e => setEditData({ ...editData, next_action_owner: e.target.value })} className="h-9 rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">תאריך יעד</Label>
                <Input type="date" value={editData.next_action_due_date || ''} onChange={e => setEditData({ ...editData, next_action_due_date: e.target.value })} className="h-9 rounded-xl text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">הערות</Label>
              <Textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} className="rounded-xl text-[13px] min-h-[60px]" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 h-10 rounded-xl text-[13px] font-semibold">שמור</Button>
              <Button variant="ghost" onClick={() => setEditOpen(false)} className="h-10 rounded-xl">ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}