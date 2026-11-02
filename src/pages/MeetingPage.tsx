import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useMeeting } from '@/hooks/useMeetings';
import { useTasks } from '@/hooks/useTasks';
import { FORUM_LABELS, ForumType, MeetingStatus } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import StatusBadge from '@/components/StatusBadge';
import Layout from '@/components/Layout';
import { ArrowRight, Plus, FileText, Mail, Loader2, Calendar, Clock, MapPin, Trash2, Edit2, Save, X } from 'lucide-react';

type Project = Tables<'projects'>;

export default function MeetingPage() {
  const { id, meetingId } = useParams<{ id: string; meetingId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const { meeting, decisions, updateMeeting, addDecision, loading: meetingLoading } = useMeeting(meetingId);
  const { addTask } = useTasks();
  const [newDecision, setNewDecision] = useState('');
  const [showForum3, setShowForum3] = useState(false);
  const navigate = useNavigate();
  const [editingDetails, setEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ date: '', time: '', location: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) { setProjectLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
      setProject(data);
      setProjectLoading(false);
    })();
  }, [id]);

  if (projectLoading || meetingLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-muted-foreground/30 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground/60">טוען נתוני ישיבה...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-lg font-medium text-muted-foreground">פרויקט לא נמצא</p>
          <Link to="/projects" className="text-sm text-primary hover:underline mt-3">חזרה לרשימת הפרויקטים</Link>
        </div>
      </Layout>
    );
  }

  if (!meeting) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-lg font-medium text-muted-foreground">ישיבה לא נמצאה</p>
          <Link to={`/project/${id}`} className="text-sm text-primary hover:underline mt-3">חזרה לעמוד הפרויקט</Link>
        </div>
      </Layout>
    );
  }

  const forumLabel = FORUM_LABELS[meeting.forum_type as ForumType] || meeting.forum_type;

  const generateSummary = async () => {
    const notes = (meeting.raw_notes || '').split('\n').filter(Boolean);
    const summary = `סיכום ישיבת ${forumLabel} – ${project.project_name}\nתאריך: ${meeting.date ? formatDate(meeting.date) : '—'}\n\n` +
      `נקודות עיקריות:\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n` +
      `החלטות:\n${decisions.map(d => `${d.number}. ${d.text}`).join('\n') || 'אין החלטות'}\n\n` +
      `משימות נגזרות: ${decisions.length} החלטות → יש ליצור משימות`;
    await updateMeeting({ summary });
  };

  const handleAddDecision = async () => {
    if (newDecision.trim()) {
      await addDecision(newDecision.trim());
      setNewDecision('');
    }
  };

  const createTasksFromDecisions = async () => {
    if (!id) return;
    for (const d of decisions) {
      await addTask({
        project_id: id,
        decision_id: d.id,
        meeting_id: meeting.id,
        title: d.text,
        owner: 'אני',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'open',
        blocker: '',
        notes: `נגזר מהחלטה #${d.number}`,
      });
    }
  };

  const closeForum3 = () => { setShowForum3(true); };

  const saveForum3Summary = async (social: string, environmental: string, operational: string, recommendation: string) => {
    await updateMeeting({
      status: 'closed',
      forum3_summary: { social, environmental, operational, recommendation },
    });
    setShowForum3(false);
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`סיכום ${forumLabel} – ${project.project_name} – ${meeting.date ? formatDate(meeting.date) : ''}`);
    const body = encodeURIComponent(meeting.summary || `סיכום ישיבת ${forumLabel}\n${meeting.raw_notes || ''}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const openEditDetails = () => {
    setEditForm({
      date: meeting.date || '',
      time: (meeting as any).time || '',
      location: (meeting as any).location || '',
    });
    setEditingDetails(true);
  };

  const saveDetails = async () => {
    await updateMeeting({
      date: editForm.date || null,
      time: editForm.time || null,
      location: editForm.location || null,
    } as any);
    setEditingDetails(false);
  };

  const deleteMeeting = async () => {
    setDeleting(true);
    await supabase.from('meetings').delete().eq('id', meeting.id);
    setDeleting(false);
    setDeleteOpen(false);
    navigate(`/project/${id}`);
  };

  const forum3Summary = meeting.forum3_summary as { social: string; environmental: string; operational: string; recommendation: string } | null;

  return (
    <Layout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">דשבורד</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <Link to={`/project/${id}`} className="hover:text-foreground transition-colors">{project.project_name}</Link>
          <ArrowRight className="h-3 w-3 rotate-180" />
          <span className="text-foreground font-medium">{forumLabel} – {meeting.date ? formatDate(meeting.date) : ''}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end flex-wrap">
              <Button variant="ghost" onClick={openEditDetails} className="gap-1.5 h-8 text-xs">
                <Edit2 className="h-3.5 w-3.5" />
                ערוך פרטים
              </Button>
              <Button variant="ghost" onClick={() => setDeleteOpen(true)}
                className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
                מחק ישיבה
              </Button>
              <h1 className="text-2xl font-bold">{forumLabel}</h1>
            </div>
            <div className="flex items-center gap-3 justify-end flex-wrap text-muted-foreground mt-1 text-sm">
              {meeting.date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(meeting.date)}
                  {(meeting as any).time && ` · ${((meeting as any).time as string).slice(0,5)}`}
                </span>
              )}
              {(meeting as any).location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {(meeting as any).location}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge type="meeting" status={meeting.status as MeetingStatus} />
            <Select value={meeting.status} onValueChange={(v) => updateMeeting({ status: v })}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">מתוכנן</SelectItem>
                <SelectItem value="completed">בוצע</SelectItem>
                <SelectItem value="closed">נסגר</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-right">נקודות גולמיות</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={meeting.raw_notes || ''}
              onChange={e => updateMeeting({ raw_notes: e.target.value })}
              placeholder="הזן נקודות מהישיבה – שורה לכל נקודה..."
              className="min-h-[150px]"
              dir="rtl"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 flex-wrap">
          <Button onClick={generateSummary} className="gap-2 h-9">
            <FileText className="h-4 w-4" />צור סיכום ישיבה
          </Button>
          <Button variant="outline" onClick={sendEmail} className="gap-2 h-9">
            <Mail className="h-4 w-4" />שלח במייל
          </Button>
          {meeting.forum_type === 'forum3' && meeting.status !== 'closed' && (
            <Button variant="outline" onClick={closeForum3} className="h-9">סגור + סיכום ועדה</Button>
          )}
        </div>

        {meeting.summary && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-right">סיכום</CardTitle></CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed" dir="rtl">{meeting.summary}</pre>
            </CardContent>
          </Card>
        )}

        {showForum3 && <Forum3SummaryForm onSave={saveForum3Summary} onCancel={() => setShowForum3(false)} />}
        {forum3Summary && (
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-sm font-semibold text-right">סיכום לוועדה</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><strong>חברתי:</strong> {forum3Summary.social}</div>
              <div><strong>סביבתי:</strong> {forum3Summary.environmental}</div>
              <div><strong>תפעולי:</strong> {forum3Summary.operational}</div>
              <div className="pt-2 border-t"><strong>המלצה:</strong> {forum3Summary.recommendation}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-right">החלטות</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {decisions.map(d => (
              <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold">{d.number}</span>
                <p className="text-sm">{d.text}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newDecision}
                onChange={e => setNewDecision(e.target.value)}
                placeholder="החלטה חדשה..."
                onKeyDown={e => e.key === 'Enter' && handleAddDecision()}
              />
              <Button onClick={handleAddDecision} size="sm" className="gap-1 h-9">
                <Plus className="h-3 w-3" />הוסף
              </Button>
            </div>
            {decisions.length > 0 && (
              <Button variant="outline" onClick={createTasksFromDecisions} className="w-full h-9">
                הפק משימות מהחלטות ({decisions.length})
              </Button>
            )}
          </CardContent>
        </Card>
        {editingDetails && (
          <Dialog open={editingDetails} onOpenChange={setEditingDetails}>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">עריכת פרטי ישיבה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-right block">תאריך</Label>
                    <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-right block">שעה</Label>
                    <Input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-right block">מיקום</Label>
                  <Input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                    className="text-right h-9" />
                </div>
              </div>
              <DialogFooter className="flex gap-2 flex-row-reverse">
                <Button onClick={saveDetails} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  שמור
                </Button>
                <Button variant="outline" onClick={() => setEditingDetails(false)}>
                  <X className="h-4 w-4" />
                  ביטול
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">מחיקת ישיבה</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-right">
              האם למחוק את ישיבת {forumLabel}? פעולה זו אינה ניתנת לביטול.
            </p>
            <DialogFooter className="flex gap-2 flex-row-reverse">
              <Button variant="destructive" onClick={deleteMeeting} disabled={deleting} className="gap-1.5">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                מחק
              </Button>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>ביטול</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function Forum3SummaryForm({ onSave, onCancel }: { onSave: (s: string, e: string, o: string, r: string) => void; onCancel: () => void }) {
  const [social, setSocial] = useState('');
  const [environmental, setEnvironmental] = useState('');
  const [operational, setOperational] = useState('');
  const [recommendation, setRecommendation] = useState('');

  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="text-sm font-semibold text-right">סיכום לוועדה – 3 היבטים</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5"><Label className="text-right block">חברתי</Label><Textarea value={social} onChange={e => setSocial(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-right block">סביבתי</Label><Textarea value={environmental} onChange={e => setEnvironmental(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-right block">תפעולי</Label><Textarea value={operational} onChange={e => setOperational(e.target.value)} /></div>
        <div className="space-y-1.5"><Label className="text-right block">סיכום המלצה</Label><Textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} /></div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(social, environmental, operational, recommendation)}>שמור וסגור</Button>
          <Button variant="ghost" onClick={onCancel}>ביטול</Button>
        </div>
      </CardContent>
    </Card>
  );
}
