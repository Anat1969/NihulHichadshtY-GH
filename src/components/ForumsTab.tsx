import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MessageSquare, Plus, Calendar, ChevronLeft, Clock, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { FORUM_LABELS, type ForumType, type MeetingStatus } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';

interface Meeting {
  id: string;
  project_id: string;
  forum_type: ForumType;
  status: MeetingStatus;
  date: string | null;
  time?: string | null;
  location?: string | null;
  summary: string | null;
  number?: number | null;
  created_at: string;
}

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; icon: typeof Clock }> = {
  planned: { label: 'מתוכנן', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  completed: { label: 'בוצע', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  closed: { label: 'נסגר', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: FileText },
};

const FORUM_COLORS: Record<ForumType, string> = {
  forum1: 'border-r-blue-500',
  forum2: 'border-r-emerald-500',
  forum3: 'border-r-purple-500',
};

export default function ForumsTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    forum_type: 'forum1' as ForumType,
    date: '',
    time: '',
    time_end: '',
    location: '',
    summary: '',
  });

  useEffect(() => {
    loadMeetings();
  }, [projectId]);

  const loadMeetings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false, nullsFirst: false });
    setMeetings((data || []) as Meeting[]);
    setLoading(false);
  };

  const createMeeting = async () => {
    setCreating(true);
    const insertPayload = {
      project_id: projectId,
      forum_type: form.forum_type,
      date: form.date || null,
      time: form.time || null,
      time_end: form.time_end || null,
      summary: form.summary || form.location || '',
      raw_notes: form.location ? `מיקום: ${form.location}` : '',
      status: 'planned',
    };

    const { data, error } = await (supabase as any)
      .from('meetings')
      .insert(insertPayload)
      .select()
      .single();

    setCreating(false);
    if (error || !data) {
      toast({ title: 'שגיאה ביצירת ישיבה', variant: 'destructive' });
      return;
    }

    setNewOpen(false);
    setForm({ forum_type: 'forum1', date: '', time: '', time_end: '', location: '', summary: '' });
    toast({ title: 'ישיבה נוצרה בהצלחה ✓' });
    await loadMeetings();
    navigate(`/project/${projectId}/meeting/${data.id}`);
  };

  const groupedMeetings = (['forum1', 'forum2', 'forum3'] as ForumType[]).map((ft) => ({
    type: ft,
    label: FORUM_LABELS[ft],
    meetings: meetings.filter((m) => m.forum_type === ft),
  }));

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <Button onClick={() => setNewOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          ישיבה חדשה
        </Button>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          פורומים וישיבות
        </div>
      </div>

      {groupedMeetings.map((group) => (
        <section key={group.type} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              {group.label} · {group.meetings.length} ישיבות
            </h3>
          </div>

          {group.meetings.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-center text-sm text-muted-foreground">
              אין ישיבות — לחץ "ישיבה חדשה" להוסיף
            </div>
          ) : (
            <div className="grid gap-3">
              {group.meetings.map((meeting, index) => {
                const statusConf = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.planned;
                const StatusIcon = statusConf.icon;
                const meetingNumber = meeting.number || group.meetings.length - index;
                const location = meeting.location || '';

                return (
                  <Card
                    key={meeting.id}
                    className={`cursor-pointer border-r-4 ${FORUM_COLORS[group.type]} transition-all hover:shadow-md hover:-translate-y-0.5`}
                    onClick={() => navigate(`/project/${projectId}/meeting/${meeting.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">
                              {group.label} — ישיבה מס' {meetingNumber}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {meeting.date && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(meeting.date)}
                                {meeting.time && ` · ${meeting.time.slice(0, 5)}`}
                              </span>
                            )}
                            {location && <span>· {location}</span>}
                          </div>
                          {meeting.summary && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {meeting.summary}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`${statusConf.color} gap-1 border`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConf.label}
                          </Badge>
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {meetings.length === 0 && (
        <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <MessageSquare className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-bold text-foreground">אין ישיבות פורום</p>
          <p className="mt-1 text-sm text-muted-foreground">הוסף ישיבה ראשונה כדי להתחיל</p>
          <Button onClick={() => setNewOpen(true)} size="sm" className="mt-5 gap-1.5">
            <Plus className="h-4 w-4" />
            ישיבה חדשה
          </Button>
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Plus className="h-5 w-5 text-primary" />
              ישיבה חדשה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>פורום</Label>
              <Select value={form.forum_type} onValueChange={(v) => setForm((f) => ({ ...f, forum_type: v as ForumType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['forum1', 'forum2', 'forum3'] as ForumType[]).map((ft) => (
                    <SelectItem key={ft} value={ft}>{FORUM_LABELS[ft]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>תאריך</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>שעה</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div>
                <Label className="text-right block mb-1.5">שעת סיום</Label>
                <Input type="time" value={form.time_end}
                  onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>מיקום (אופציונלי)</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label>סיכום ישיבה (אופציונלי)</Label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                className="text-right resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 flex-row-reverse">
            <Button onClick={createMeeting} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              צור ישיבה
            </Button>
            <Button variant="outline" onClick={() => setNewOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
