import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText, Download, Copy, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { getStageName, StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

export default function EnhancedReportsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [checks, setChecks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'status' | 'forum1' | 'forum2' | 'committee'>('status');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pr, tk, mt, ch, rv] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('tasks').select('*').eq('project_id', projectId),
        supabase.from('meetings').select('*').eq('project_id', projectId).order('date', { ascending: false }),
        supabase.from('forum1_checks').select('*').eq('project_id', projectId),
        supabase.from('forum2_reviews').select('*').eq('project_id', projectId),
      ]);
      setProject(pr.data);
      setTasks(tk.data || []);
      setMeetings(mt.data || []);
      setChecks(ch.data || []);
      setReviews(rv.data || []);
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
  if (!project) return null;

  const openTasks = tasks.filter(t => t.status === 'open' || t.status === 'in_progress');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.deadline && t.deadline < new Date().toISOString().split('T')[0]);
  const redChecks = checks.filter(c => c.status === 'red');
  const yellowChecks = checks.filter(c => c.status === 'yellow');
  const pendingReviews = reviews.filter(r => r.status === 'not_sent' || r.status === 'fix_required');
  const approvedReviews = reviews.filter(r => r.status === 'approved');

  const stageName = getStageName((project.main_stage as StageId) || 'forum1_harmonika');
  const today = formatDate(new Date());

  const buildReport = (): string => {
    const sep = '─'.repeat(50);
    const header = `דוח פרויקט: ${project.project_name}
${project.plan_number ? `תכנית: ${project.plan_number}` : ''}
תאריך הפקה: ${today}
${sep}`;

    if (reportType === 'status') {
      return `${header}
דוח סטטוס כללי

שלב נוכחי: ${stageName}
${project.sub_stage ? `תת-שלב: ${project.sub_stage}` : ''}
סטטוס ניהולי: ${project.management_status || 'לא הוגדר'}
רמת סיכון: ${({low:'נמוכה',medium:'בינונית',high:'גבוהה'} as Record<string,string>)[project.risk_level] || 'לא הוגדרה'}
עדכון אחרון: ${project.last_update ? formatDate(project.last_update) : 'לא עודכן'}

נתוני יחידות:
- דירות קיימות: ${project.units_in || '—'}
- דירות מתוכננות: ${project.units_out || '—'}
- מכפיל: ×${project.multiplier || '—'}

${project.main_blocker ? `חסם מרכזי:\n${project.main_blocker}` : 'חסם מרכזי: אין'}

${project.next_action ? `פעולה הבאה: ${project.next_action}
אחראי: ${project.next_action_owner || '—'}
יעד: ${project.next_action_due_date ? formatDate(project.next_action_due_date) : '—'}` : ''}

${sep}
משימות פתוחות: ${openTasks.length}
משימות חסומות: ${blockedTasks.length}
משימות באיחור: ${overdueTasks.length}
ישיבות שהתקיימו: ${meetings.length}`;
    }

    if (reportType === 'forum1') {
      const greenCount = checks.filter(c => c.status === 'green').length;
      return `${header}
דוח בקרת תכן — פורום 1 (הרמוניקה)

סיכום ממצאים:
- ירוק (עומד בדרישות): ${greenCount}
- צהוב (דרוש שיפור): ${yellowChecks.length}
- אדום (לא עומד): ${redChecks.length}

${redChecks.length > 0 ? `ממצאים קריטיים (אדום):\n${redChecks.map(c => `• ${c.name}: ${c.note || 'ללא הערה'}`).join('\n')}` : ''}

${yellowChecks.length > 0 ? `ממצאים לשיפור (צהוב):\n${yellowChecks.map(c => `• ${c.name}: ${c.note || 'ללא הערה'}`).join('\n')}` : ''}

המלצה: ${redChecks.length === 0 && yellowChecks.length === 0 ? 'התכנית עומדת בכל קריטריוני פורום 1 — ניתן להתקדם לפורום 2.' : redChecks.length > 0 ? 'נדרש תיקון הממצאים האדומים לפני קידום לפורום הבא.' : 'נדרשת התייחסות לממצאים הצהובים.'}`;
    }

    if (reportType === 'forum2') {
      return `${header}
דוח יועצים — פורום 2

${sep}
סיכום סטטוס יועצים:
- אושר: ${approvedReviews.length}
- ממתין לטיפול: ${pendingReviews.length}
- סה"כ יועצים: ${reviews.length}

${reviews.map(r => `${r.reviewer_name}: ${
  r.status === 'approved' ? '✅ אושר' :
  r.status === 'fix_required' ? '🔴 נדרש תיקון' :
  r.status === 'sent' ? '📤 נשלח' :
  r.status === 'received' ? '📥 התקבל' : '⏳ טרם נשלח'
}${r.note ? ` — ${r.note}` : ''}`).join('\n')}

${pendingReviews.length > 0 ? `\nפעולות נדרשות:\n${pendingReviews.map(r => `• ${r.reviewer_name} — ${r.status === 'fix_required' ? 'נדרש תיקון: ' + (r.note || '') : 'לשלוח לבדיקה'}`).join('\n')}` : '\nכל היועצים אישרו — ניתן להתקדם לפורום 3.'}`;
    }

    if (reportType === 'committee') {
      return `${header}
תדריך הכנה לוועדה

${sep}
פרטי הפרויקט:
- שם: ${project.project_name}
- מספר תכנית: ${project.plan_number || '—'}
- יזם: ${project.developer || '—'}
- מגיש: ${project.plan_submitter || '—'}

נתונים תכנוניים:
- דירות קיימות: ${project.units_in || '—'}
- דירות מתוכננות: ${project.units_out || '—'}
- מכפיל: ×${project.multiplier || '—'}
- פוטנציאל: ₪${((project.units_out || 0) * 25000).toLocaleString()}

${sep}
סיכום יועצים: ${approvedReviews.length}/${reviews.length} אישרו
בקרת תכן: ${checks.filter(c => c.status === 'green').length}/${checks.length} ירוק

המלצה לוועדה:
${project.main_blocker ? `⚠️ יש לטפל בחסם: ${project.main_blocker}` : '✅ הפרויקט מוכן לדיון בוועדה.'}

${project.notes ? `הערות נוספות:\n${project.notes}` : ''}`;
    }
    return '';
  };

  const reportText = buildReport();

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'הדוח הועתק ✓' });
  };

  const downloadPdf = () => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, W, 22, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(project.project_name, W - 10, 14, { align: 'right' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`עיריית אשדוד · ${today}`, 10, 14);

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(reportText, W - 20);
    let y = 32;
    for (const line of lines) {
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, W - 10, y, { align: 'right' });
      y += 6;
    }

    pdf.save(`דוח-${project.project_name}.pdf`);
  };

  const REPORT_TYPES = [
    { id: 'status', label: 'סטטוס כללי', icon: FileText },
    { id: 'forum1', label: 'פורום 1', icon: CheckCircle2 },
    { id: 'forum2', label: 'פורום 2 — יועצים', icon: Users },
    { id: 'committee', label: 'תדריך ועדה', icon: AlertTriangle },
  ] as const;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${reportType === rt.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40 bg-card'}`}>
              <Icon className="h-4 w-4" />
              {rt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'משימות פתוחות', value: openTasks.length, color: 'text-primary' },
          { label: 'משימות חסומות', value: blockedTasks.length, color: 'text-destructive' },
          { label: 'ממצאי פורום 1', value: redChecks.length + yellowChecks.length, color: 'text-orange-500' },
          { label: 'יועצים ממתינים', value: pendingReviews.length, color: 'text-yellow-600' },
        ].map(s => (
          <Card key={s.label} className="border-border/40">
            <CardContent className="p-4 text-right">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyReport} className="gap-2">
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'הועתק!' : 'העתק'}
              </Button>
              <Button size="sm" onClick={downloadPdf} className="gap-2">
                <Download className="h-4 w-4" />
                הורד PDF
              </Button>
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">
              {REPORT_TYPES.find(r => r.id === reportType)?.label}
            </h3>
          </div>
          <pre className="text-right text-sm leading-relaxed whitespace-pre-wrap font-sans bg-muted/30 rounded-xl p-4 border border-border/30 max-h-[500px] overflow-y-auto" dir="rtl">
            {reportText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
