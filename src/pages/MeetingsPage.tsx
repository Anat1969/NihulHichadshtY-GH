import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useMeetings } from '@/hooks/useMeetings';
import { useProjects } from '@/hooks/useProjects';
import { FORUM_LABELS, MEETING_STATUS_LABELS, ForumType } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarDays, Search, Filter, X, ExternalLink, Loader2, Plus, Printer } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function MeetingsPage() {
  const { meetings, loading } = useMeetings();
  const { projects } = useProjects();
  const [search, setSearch] = useState('');
  const [forumFilter, setForumFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    project_id: '',
    forum_type: 'forum1' as ForumType,
    date: '',
    time_start: '',
    time_end: '',
    location: '',
    summary: '',
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'meetings-print-style';
    style.innerHTML = `
      .print-only { display: none; }
      @media print {
        body * { visibility: hidden; }
        .meetings-print-area, .meetings-print-area * { visibility: visible; }
        .meetings-print-area { position: absolute; top: 0; right: 0; width: 100%; direction: rtl; }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        @page { margin: 15mm; size: A4; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('meetings-print-style')?.remove(); };
  }, []);

  const createMeeting = async () => {
    if (!form.project_id) return;
    setCreating(true);
    const existingForForum = meetings.filter(
      m => m.project_id === form.project_id && m.forum_type === form.forum_type
    );
    const number = existingForForum.length + 1;
    const { data, error } = await (supabase as any)
      .from('meetings')
      .insert({
        project_id: form.project_id,
        forum_type: form.forum_type,
        date: form.date || null,
        time: form.time_start || null,
        time_end: form.time_end || null,
        location: form.location || null,
        summary: form.summary || null,
        status: 'planned',
        number,
      })
      .select()
      .single();
    setCreating(false);
    if (error || !data) return;
    setNewOpen(false);
    setForm({ project_id: '', forum_type: 'forum1', date: '', time_start: '', time_end: '', location: '', summary: '' });
    navigate(`/project/${form.project_id}/meeting/${data.id}`);
  };

  const filtered = useMemo(() => {
    let list = [...meetings];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => {
        const project = projects.find(p => p.id === m.project_id);
        return (project?.project_name.toLowerCase().includes(q)) || FORUM_LABELS[m.forum_type as ForumType]?.toLowerCase().includes(q);
      });
    }
    if (forumFilter !== 'all') list = list.filter(m => m.forum_type === forumFilter);
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    return list;
  }, [meetings, projects, search, forumFilter, statusFilter]);

  const hasFilters = search || forumFilter !== 'all' || statusFilter !== 'all';
  const today = new Date().toISOString().split('T')[0];
  const upcoming = meetings.filter(m => m.date && m.date >= today && m.status === 'planned').length;

  return (
    <Layout>
      <div className="meetings-print-area space-y-6">
        <div className="print-only text-right mb-6">
          <h1 className="text-2xl font-bold text-foreground">יומן ישיבות — ניהול ההתחדשות העירונית אשדוד</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            הופק: {new Date().toLocaleDateString('he-IL')} · סה&quot;כ {meetings.length} ישיבות
            {filtered.length !== meetings.length ? ` · מסוננות: ${filtered.length}` : ''}
          </p>
        </div>

        <div className="page-header">
          <div>
            <h1>ישיבות</h1>
            <p className="caption mt-1">{meetings.length} ישיבות במערכת</p>
          </div>
          <div className="flex items-center gap-2">
            {upcoming > 0 && (
              <span className="chip chip-primary">{upcoming} ישיבות קרובות</span>
            )}
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 no-print">
              <Printer className="h-4 w-4" />הדפסה
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5 no-print">
              <Plus className="h-4 w-4" />ישיבה חדשה
            </Button>
          </div>
        </div>

        <div className="toolbar no-print">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי פרויקט..." className="pr-10 h-9 text-[13px] bg-secondary/40 border-0 rounded-xl focus-visible:ring-primary/30" />
          </div>
          <Select value={forumFilter} onValueChange={setForumFilter}>
            <SelectTrigger className="w-[140px] h-9 text-[13px] bg-secondary/40 border-0 rounded-xl"><SelectValue placeholder="סוג פורום" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">כל הפורומים</SelectItem>
              {Object.entries(FORUM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-[13px] bg-secondary/40 border-0 rounded-xl"><SelectValue placeholder="סטטוס" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {Object.entries(MEETING_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setForumFilter('all'); setStatusFilter('all'); }} className="gap-1.5 text-[12px] h-8 rounded-lg">
              <X className="h-3 w-3" />נקה
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="flex items-center gap-3 text-sm bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 animate-enter">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{filtered.length} תוצאות</span>
          </div>
        )}

        {loading ? (
          <div className="premium-card border-dashed border-2 border-border">
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground/60">טוען ישיבות...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="premium-card border-dashed border-2 border-border">
            <div className="py-16 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/15 mb-4" />
              <p className="text-sm font-semibold text-muted-foreground/50">אין ישיבות להצגה</p>
              <p className="caption mt-1">ישיבות שייווצרו בעמודי הפרויקט יופיעו כאן</p>
            </div>
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>פורום</th>
                    <th>פרויקט</th>
                    <th>תאריך</th>
                    <th>סטטוס</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(meeting => {
                    const project = projects.find(p => p.id === meeting.project_id);
                    return (
                      <tr key={meeting.id} className="group">
                        <td className="font-semibold">{FORUM_LABELS[meeting.forum_type as ForumType] || meeting.forum_type}</td>
                        <td className="text-muted-foreground">
                          {project ? <Link to={`/project/${project.id}`} className="hover:text-primary transition-colors">{project.project_name}</Link> : '—'}
                        </td>
                        <td className="text-muted-foreground">{meeting.date ? formatDate(meeting.date) : '—'}</td>
                        <td>
                          <span className={`chip ${
                            meeting.status === 'closed' ? 'chip-success' :
                            meeting.status === 'completed' ? 'chip-primary' : 'chip-muted'
                          }`}>
                            {MEETING_STATUS_LABELS[meeting.status as keyof typeof MEETING_STATUS_LABELS] || meeting.status}
                          </span>
                        </td>
                        <td>
                          {project && (
                            <Link to={`/project/${project.id}/meeting/${meeting.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary rounded-lg"><ExternalLink className="h-3.5 w-3.5" /></Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">ישיבה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-right block mb-1.5">פרויקט *</Label>
              <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-right block mb-1.5">פורום</Label>
              <Select value={form.forum_type} onValueChange={v => setForm(f => ({ ...f, forum_type: v as ForumType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FORUM_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-right block mb-1.5">תאריך</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-right block mb-1.5">שעת התחלה</Label>
                <Input type="time" value={form.time_start} onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-right block mb-1.5">שעת סיום</Label>
                <Input type="time" value={form.time_end} onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div>
              <Label className="text-right block mb-1.5">מיקום (אופציונלי)</Label>
              <Input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="text-right h-9"
              />
            </div>

            <div>
              <Label className="text-right block mb-1.5">סיכום ראשוני (אופציונלי)</Label>
              <Textarea
                value={form.summary}
                onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                className="text-right resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-row-reverse">
            <Button onClick={createMeeting} disabled={creating || !form.project_id} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              צור ישיבה
            </Button>
            <Button variant="outline" onClick={() => setNewOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
