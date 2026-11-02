import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CheckSquare, Bell, Star, Plus, ChevronLeft, Loader2, Filter } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { FORUM_LABELS, ForumType } from '@/types/project';

type EventType = 'meeting' | 'task' | 'action' | 'reminder' | 'milestone';
type EventFilter = 'all' | EventType;
type EventPriority = 'normal' | 'attention' | 'urgent' | 'done';

interface CalendarEvent {
  id: string;
  date: string;
  time_start?: string;
  time_end?: string;
  title: string;
  subtitle?: string;
  type: EventType;
  project_name?: string;
  project_id?: string;
  link?: string;
  overdue?: boolean;
  priority?: EventPriority;
}

const TYPE_CONFIG = {
  meeting: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'ישיבה' },
  task: { icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'משימה' },
  action: { icon: ChevronLeft, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', label: 'פעולה הבאה' },
  reminder: { icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', label: 'תזכורת' },
  milestone: { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'אבן דרך' },
};

const PRIORITY_OPTIONS: { val: EventPriority; label: string; color: string }[] = [
  { val: 'normal', label: 'רגיל', color: 'bg-gray-100 border-gray-300 text-gray-600' },
  { val: 'attention', label: 'לתשומת לב', color: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  { val: 'urgent', label: 'דחוף', color: 'bg-red-100 border-red-400 text-red-700' },
  { val: 'done', label: 'הושלם', color: 'bg-green-100 border-green-400 text-green-700' },
];

const PRIORITY_BORDER: Record<EventPriority, string> = {
  urgent: 'border-r-4 border-r-red-500',
  attention: 'border-r-4 border-r-yellow-400',
  done: 'border-r-4 border-r-green-500',
  normal: '',
};

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: '',
    time_start: '',
    time_end: '',
    type: 'milestone' as EventType,
    project_id: '',
    notes: '',
    priority: 'normal' as EventPriority,
  });
  const [projects, setProjects] = useState<{ id: string; project_name: string }[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [meetingsRes, tasksRes, projectsRes, remindersRes, milestonesRes] = await Promise.all([
      supabase.from('meetings').select('id, date, time, time_end, forum_type, project_id, summary').gte('date', threeMonthsAgo).order('date'),
      supabase.from('tasks').select('id, title, deadline, project_id, status').not('deadline', 'is', null).gte('deadline', threeMonthsAgo).order('deadline'),
      supabase.from('projects').select('id, project_name, next_action_due_date, next_action, quarter').not('next_action_due_date', 'is', null),
      supabase.from('reminders').select('id, title, due_at, project_id').not('due_at', 'is', null).order('due_at'),
      supabase.from('audit_log').select('id, details, entity_id, created_at').eq('action', 'milestone').order('created_at', { ascending: false }).limit(20),
    ]);

    const projectMap: Record<string, string> = {};
    for (const p of projectsRes.data || []) projectMap[p.id] = p.project_name;
    setProjects(projectsRes.data?.map(p => ({ id: p.id, project_name: p.project_name })) || []);

    const all: CalendarEvent[] = [];

    for (const m of meetingsRes.data || []) {
      if (!m.date) continue;
      all.push({
        id: `meeting-${m.id}`,
        date: m.date,
        time_start: m.time || undefined,
        time_end: m.time_end || undefined,
        title: FORUM_LABELS[m.forum_type as ForumType] || m.forum_type,
        subtitle: m.summary || undefined,
        type: 'meeting',
        project_name: projectMap[m.project_id] || '',
        project_id: m.project_id,
        link: `/project/${m.project_id}/meeting/${m.id}`,
      });
    }

    for (const t of tasksRes.data || []) {
      if (!t.deadline || t.status === 'completed') continue;
      all.push({
        id: `task-${t.id}`,
        date: t.deadline,
        title: t.title,
        type: 'task',
        project_name: projectMap[t.project_id] || '',
        project_id: t.project_id,
        link: `/project/${t.project_id}?tab=tasks`,
        overdue: t.deadline < today,
      });
    }

    for (const p of projectsRes.data || []) {
      if (!p.next_action_due_date || !p.next_action) continue;
      all.push({
        id: `action-${p.id}`,
        date: p.next_action_due_date,
        title: p.next_action,
        type: 'action',
        project_name: p.project_name,
        project_id: p.id,
        link: `/project/${p.id}`,
        overdue: p.next_action_due_date < today,
      });
    }

    for (const r of remindersRes.data || []) {
      if (!r.due_at) continue;
      const date = r.due_at.split('T')[0];
      const time = r.due_at.includes('T') ? r.due_at.split('T')[1].slice(0, 5) : undefined;
      all.push({
        id: `reminder-${r.id}`,
        date,
        time_start: time,
        title: r.title || 'תזכורת',
        type: 'reminder',
        project_name: r.project_id ? projectMap[r.project_id] || '' : '',
        project_id: r.project_id || undefined,
        overdue: date < today,
      });
    }

    for (const entry of milestonesRes.data || []) {
      const d = entry.details as Record<string, unknown> | null;
      const date = typeof d?.date === 'string' ? d.date : '';
      if (!date) continue;
      all.push({
        id: `milestone-${entry.id}`,
        date,
        time_start: typeof d?.time_start === 'string' ? d.time_start : undefined,
        time_end: typeof d?.time_end === 'string' ? d.time_end : undefined,
        title: typeof d?.title === 'string' ? d.title : 'אבן דרך',
        subtitle: typeof d?.notes === 'string' ? d.notes : undefined,
        type: 'milestone',
        project_name: typeof d?.project_name === 'string' ? d.project_name : '',
        priority: (typeof d?.priority === 'string' && d.priority in PRIORITY_BORDER ? d.priority : 'normal') as EventPriority,
      });
    }

    all.sort((a, b) => a.date.localeCompare(b.date));
    setEvents(all);
    setLoading(false);
  };

  const saveMilestone = async () => {
    if (!form.title || !form.date) return;
    setSaving(true);
    const project_name = projects.find(p => p.id === form.project_id)?.project_name || '';
    await supabase.from('audit_log').insert({
      entity_type: 'project',
      entity_id: form.project_id || 'manual',
      action: 'milestone',
      actor: 'יוהאן אבוחציירה',
      details: {
        title: form.title,
        date: form.date,
        time_start: form.time_start || null,
        time_end: form.time_end || null,
        notes: form.notes || null,
        project_name,
        type: form.type,
        priority: form.priority,
      },
    });
    setSaving(false);
    setNewOpen(false);
    setForm({ title: '', date: '', time_start: '', time_end: '', type: 'milestone', project_id: '', notes: '', priority: 'normal' });
    await loadAll();
  };

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter(e => e.type === filter)),
    [events, filter],
  );

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const groups = [
    { label: 'באיחור', events: filtered.filter(e => e.overdue), urgent: true },
    { label: 'השבוע', events: filtered.filter(e => !e.overdue && e.date >= today && e.date <= nextWeek) },
    { label: 'החודש', events: filtered.filter(e => !e.overdue && e.date > nextWeek && e.date <= nextMonth) },
    { label: 'הלאה', events: filtered.filter(e => !e.overdue && e.date > nextMonth) },
  ].filter(g => g.events.length > 0);

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        <div className="page-header">
          <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />הוסף אירוע
          </Button>
          <div className="text-right">
            <h1>יומן אירועים</h1>
            <p className="caption mt-1">{events.length} אירועים · ישיבות, משימות, פעולות ותזכורות</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['all', 'meeting', 'task', 'action', 'reminder', 'milestone'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40 bg-card'
              }`}
            >
              {f === 'all' ? `הכל (${events.length})` : `${TYPE_CONFIG[f].label} (${events.filter(e => e.type === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="premium-card py-16 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/40 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="premium-card border-dashed border-2 border-border py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-sm font-semibold text-muted-foreground/60">אין אירועים להצגה</p>
            <p className="caption mt-1">הוסף ישיבות, משימות עם יעד, או אירועים ידניים</p>
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map(group => (
              <section key={group.label} className="space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant={group.urgent ? 'destructive' : 'secondary'}>{group.label} · {group.events.length}</Badge>
                </div>

                <div className="space-y-2">
                  {group.events.map(event => {
                    const conf = TYPE_CONFIG[event.type];
                    const Icon = conf.icon;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => event.link && navigate(event.link)}
                        className={`premium-card w-full p-0 text-right overflow-hidden transition-all hover:shadow-md ${event.link ? 'cursor-pointer' : 'cursor-default'} ${PRIORITY_BORDER[event.priority || 'normal']}`}
                      >
                        <div className="flex items-stretch gap-4 p-4">
                          <div className="w-16 shrink-0 text-center border-l border-border pl-4">
                            <p className="text-2xl font-bold leading-none">{new Date(event.date + 'T12:00:00').getDate()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(event.date + 'T12:00:00').toLocaleDateString('he-IL', { month: 'short' })}</p>
                            <p className="text-[10px] text-muted-foreground/70">{new Date(event.date + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'short' })}</p>
                          </div>

                          <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Badge variant="outline" className={`${conf.bg} ${conf.color} gap-1 border`}>
                                  <Icon className="h-3 w-3" />
                                  {conf.label}
                                </Badge>
                                {event.overdue && <Badge variant="destructive">באיחור</Badge>}
                              </div>
                              <p className="font-semibold text-foreground truncate">{event.title}</p>
                              {event.project_name && <p className="caption truncate">{event.project_name}</p>}
                              {event.subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{event.subtitle}</p>}
                            </div>

                            {event.time_start && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 pt-1">
                                <Clock className="h-3.5 w-3.5" />
                                {event.time_start.slice(0, 5)}{event.time_end ? `–${event.time_end.slice(0, 5)}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">הוסף אירוע ידני</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-right block mb-1.5 text-xs">סוג אירוע</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as EventType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-right block mb-1.5 text-xs">כותרת *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="תיאור האירוע..." className="text-right h-9" />
              </div>

              <div>
                <Label className="text-right block mb-1.5 text-xs">פרויקט (אופציונלי)</Label>
                <Select value={form.project_id || 'none'} onValueChange={v => setForm(f => ({ ...f, project_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא פרויקט</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-right block mb-1.5 text-xs">תאריך *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-right block mb-1.5 text-xs">שעת התחלה</Label>
                  <Input type="time" value={form.time_start} onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-right block mb-1.5 text-xs">שעת סיום</Label>
                  <Input type="time" value={form.time_end} onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))} className="h-9" />
                </div>
              </div>

              <div>
                <Label className="text-right block mb-1.5 text-xs">עדיפות / סטטוס</Label>
                <div className="flex gap-2 justify-end">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                        form.priority === p.val ? `${p.color} scale-105 shadow-sm` : 'bg-card border-border text-muted-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-right block mb-1.5 text-xs">הערות (אופציונלי)</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="פרטים נוספים..." className="text-right resize-none" rows={2} />
              </div>
            </div>
            <DialogFooter className="flex gap-2 flex-row-reverse">
              <Button onClick={saveMilestone} disabled={saving || !form.title || !form.date} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                שמור אירוע
              </Button>
              <Button variant="outline" onClick={() => setNewOpen(false)}>ביטול</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
