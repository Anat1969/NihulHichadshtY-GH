import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TASK_STATUS_LABELS, type TaskStatus } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { Loader2, ClipboardList, Plus, AlertTriangle, User, Calendar, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const STATUS_COLOR: Record<TaskStatus, { bg: string; dot: string; text: string }> = {
  open:        { bg: 'bg-blue-50/60 border-blue-100',       dot: 'bg-blue-400',                    text: 'text-blue-700' },
  in_progress: { bg: 'bg-orange-50/60 border-orange-100',   dot: 'bg-[hsl(var(--status-yellow))]', text: 'text-orange-700' },
  blocked:     { bg: 'bg-red-50/60 border-red-100',         dot: 'bg-[hsl(var(--status-red))]',    text: 'text-red-700' },
  completed:   { bg: 'bg-emerald-50/40 border-emerald-100', dot: 'bg-[hsl(var(--status-green))]',  text: 'text-emerald-700' },
};

const ALL_STATUSES: TaskStatus[] = ['open', 'in_progress', 'blocked', 'completed'];

export default function TasksTab({ projectId }: { projectId: string }) {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks(projectId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await addTask({ project_id: projectId, title: title.trim(), owner: owner.trim(), deadline: deadline || (null as any), status: 'open', blocker: '', notes: '' });
    setTitle(''); setOwner(''); setDeadline('');
    setSaving(false);
    setOpen(false);
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const doneTasks = tasks.filter(t => t.status === 'completed');
  const openCount = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;
  const doneCount = doneTasks.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            משימות
          </div>
          <div className="flex flex-wrap gap-2 text-[12px]">
            {openCount > 0 && <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1">{openCount} פתוח</span>}
            {blockedCount > 0 && <span className="bg-red-50 text-red-700 border border-red-100 rounded-full px-2.5 py-1">{blockedCount} חסום</span>}
            {doneCount > 0 && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1">{doneCount} הושלם</span>}
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 rounded-xl gap-1.5 text-[12px]">
              <Plus className="h-3.5 w-3.5" />
              משימה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="text-right">משימה חדשה</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-[12px]">כותרת</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="תיאור המשימה" className="h-10 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">אחראי</Label>
                  <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="שם" className="h-10 rounded-xl" />
                </div>
                <div>
                  <Label className="text-[12px]">יעד</Label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-10 rounded-xl" />
                </div>
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full h-10 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור משימה'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
            <ClipboardList className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-base font-semibold text-muted-foreground">אין משימות עדיין</p>
          <p className="text-sm text-muted-foreground/60 mt-1">לחץ על "משימה חדשה" כדי להוסיף</p>
        </div>
      )}

      <div className="space-y-2">
        {activeTasks.map(task => {
          const cfg = STATUS_COLOR[task.status as TaskStatus] ?? STATUS_COLOR.open;
          const isOverdue = task.deadline && task.deadline < today;
          return (
            <div key={task.id} className={cn('group relative rounded-2xl border p-3 transition-all duration-200', cfg.bg)}>
              <div className="flex items-start gap-3">
                <span className={cn('mt-1.5 w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{task.title}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className={cn('h-7 text-[12px] rounded-lg gap-1', cfg.text)}>
                          {TASK_STATUS_LABELS[task.status as TaskStatus]}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        {ALL_STATUSES.map(s => (
                          <DropdownMenuItem key={s} onClick={() => updateTask(task.id, { status: s })} className={cn('rounded-lg text-[12px] gap-2', s === task.status && 'font-bold')}>
                            <span className={cn('w-2 h-2 rounded-full', STATUS_COLOR[s].dot)} />
                            {TASK_STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {task.owner && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{task.owner}</span>}
                    {task.deadline && (
                      <span className={cn('inline-flex items-center gap-1', isOverdue && 'text-red-700 font-bold')}>
                        <Calendar className="h-3 w-3" />
                        {isOverdue && <AlertTriangle className="h-3 w-3" />}{formatDate(task.deadline)}
                      </span>
                    )}
                    {task.blocker && <span className="text-red-700">חסם: {task.blocker}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('למחוק את המשימה?')) return;
                  await deleteTask(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="מחק משימה"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {doneTasks.length > 0 && (
        <details className="mt-4">
          <summary className="text-[12px] text-muted-foreground cursor-pointer flex items-center gap-1 px-1">
            <ChevronDown className="h-3 w-3" />
            {doneTasks.length} משימות שהושלמו
          </summary>
          <div className="mt-2 space-y-1.5">
            {doneTasks.map(task => (
              <div key={task.id} className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-2.5">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--status-green))] shrink-0" />
                  <span className="text-foreground line-through opacity-70">{task.title}</span>
                  {task.owner && <span className="text-muted-foreground">· {task.owner}</span>}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
