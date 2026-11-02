import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReminders, DbReminder } from '@/hooks/useReminders';
import { useProjects } from '@/hooks/useProjects';
import { formatDateTime } from '@/lib/dateUtils';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, CheckCircle2, Circle, Trash2, Edit, Clock, Bell, Undo2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder, loading } = useReminders();
  const { projects } = useProjects();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [projectId, setProjectId] = useState('none');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const sorted = useMemo(() =>
    [...reminders].sort((a, b) => (a.due_at || '').localeCompare(b.due_at || '')),
    [reminders]
  );

  const filters = {
    today: sorted.filter(r => r.status === 'open' && r.due_at && r.due_at.startsWith(today)),
    week: sorted.filter(r => r.status === 'open' && r.due_at && r.due_at >= today && r.due_at <= weekEnd + 'T23:59:59'),
    overdue: sorted.filter(r => r.status === 'open' && r.due_at && r.due_at < today),
    all: sorted,
  };

  const resetForm = () => {
    setTitle(''); setDueAt(''); setProjectId('none'); setPriority('normal'); setNotes(''); setEditId(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !dueAt) return;
    const payload = {
      title: title.trim(),
      due_at: new Date(dueAt).toISOString(),
      project_id: projectId !== 'none' ? projectId : null,
      priority,
      notes: notes || null,
      status: 'open',
    };
    if (editId) {
      await updateReminder(editId, payload);
      toast({ title: 'תזכורת עודכנה ✓' });
    } else {
      await addReminder(payload);
      toast({ title: 'תזכורת נוצרה ✓' });
    }
    resetForm();
    setOpen(false);
  };

  const startEdit = (r: DbReminder) => {
    setTitle(r.title);
    setDueAt(r.due_at ? new Date(r.due_at).toISOString().slice(0, 16) : '');
    setProjectId(r.project_id || 'none');
    setPriority((r.priority as 'normal' | 'urgent') || 'normal');
    setNotes(r.notes || '');
    setEditId(r.id);
    setOpen(true);
  };

  const toggleStatus = async (r: DbReminder) => {
    const newStatus = r.status === 'open' ? 'done' : 'open';
    await updateReminder(r.id, { status: newStatus });
    if (newStatus === 'done') {
      toast({
        title: 'תזכורת הושלמה ✓',
        action: <Button variant="ghost" size="sm" className="gap-1.5 text-[12px]" onClick={() => updateReminder(r.id, { status: 'open' })}><Undo2 className="h-3 w-3" />ביטול</Button>,
      });
    }
  };

  const projectName = (id?: string | null) => projects.find(p => p.id === id)?.project_name || '—';

  const renderList = (list: DbReminder[]) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-muted-foreground/30 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground/60">טוען תזכורות...</p>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Bell className="h-7 w-7 text-muted-foreground/25" />
          </div>
          <p className="font-semibold text-muted-foreground">אין תזכורות להצגה</p>
          <p className="caption mt-1">צור תזכורת חדשה כדי להתחיל</p>
          <Button size="sm" className="mt-4 gap-2 rounded-xl" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />תזכורת חדשה
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {list.map(r => (
          <div key={r.id} className={`premium-card p-4 flex items-center gap-4 group ${r.status === 'done' ? 'opacity-45' : ''} ${r.priority === 'urgent' && r.status === 'open' ? 'border-destructive/20 bg-destructive/[0.02]' : ''}`}>
            <button onClick={() => toggleStatus(r)} className="shrink-0 transition-transform duration-150 hover:scale-110 press-scale">
              {r.status === 'done' ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" /> : <Circle className="h-5 w-5 text-muted-foreground/30" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className={`font-semibold text-sm ${r.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{r.title}</span>
                {r.priority === 'urgent' && <span className="bg-destructive/10 text-destructive text-[10px] px-2 py-0.5 rounded-lg font-bold">דחוף</span>}
              </div>
              <div className="flex items-center gap-3 caption mt-1.5">
                {r.due_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(r.due_at)}</span>}
                {r.project_id && <span>{projectName(r.project_id)}</span>}
                {r.notes && <span className="truncate max-w-[200px]">{r.notes}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => startEdit(r)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1>תזכורות</h1>
            <p className="caption mt-1">{reminders.filter(r => r.status === 'open').length} תזכורות פתוחות</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-10 rounded-xl text-[13px] shadow-sm press-scale"><Plus className="h-4 w-4" />תזכורת חדשה</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>{editId ? 'עריכת תזכורת' : 'תזכורת חדשה'}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-3">
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">כותרת</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="תזכורת..." className="h-10 rounded-xl" autoFocus /></div>
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">תאריך ושעה</Label><Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className="h-10 rounded-xl" /></div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">פרויקט (אופציונלי)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="ללא פרויקט" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">ללא פרויקט</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">דחיפות</Label>
                  <Select value={priority} onValueChange={(v: 'normal' | 'urgent') => setPriority(v)}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="normal">רגיל</SelectItem>
                      <SelectItem value="urgent">דחוף</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">הערות</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות..." className="rounded-xl" /></div>
                <Button onClick={handleSave} disabled={!title.trim() || !dueAt} className="w-full h-10 rounded-xl text-[13px] font-semibold press-scale">{editId ? 'עדכן' : 'צור תזכורת'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-secondary/40 p-1.5 rounded-2xl">
            <TabsTrigger value="today" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 font-semibold">היום {filters.today.length > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-2 rounded-full font-bold">{filters.today.length}</span>}</TabsTrigger>
            <TabsTrigger value="week" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm font-semibold">השבוע</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 font-semibold">באיחור {filters.overdue.length > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] px-2 rounded-full font-bold">{filters.overdue.length}</span>}</TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm font-semibold">הכל</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-5">{renderList(filters.today)}</TabsContent>
          <TabsContent value="week" className="mt-5">{renderList(filters.week)}</TabsContent>
          <TabsContent value="overdue" className="mt-5">{renderList(filters.overdue)}</TabsContent>
          <TabsContent value="all" className="mt-5">{renderList(filters.all)}</TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תזכורת</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את התזכורת?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteId) { await deleteReminder(deleteId); setDeleteId(null); toast({ title: 'תזכורת נמחקה' }); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
