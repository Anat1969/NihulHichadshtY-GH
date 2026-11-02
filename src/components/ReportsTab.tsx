import { useState, useCallback } from 'react';
import { useApp } from '@/context/ProjectContext';
import { getStageName, getNextForum, getMultiplier, getProjectProgress, STAGES } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, Mail, FileText, BarChart3, FileSpreadsheet, Image, ImageOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import logoAshdod from '@/assets/logo-ashdod.jpg';
import logoHeader from '@/assets/logo-ashdod-2.jpg';

type ExportAction = 'copy' | 'email' | 'excel';

export default function ReportsTab({ projectId }: { projectId: string }) {
  const {
    projects, getProjectTasks, getProjectChecks, getProjectReviews,
    getProjectMeetings,
  } = useApp();
  const { toast } = useToast();
  const project = projects.find(p => p.id === projectId);
  const [reportType, setReportType] = useState<'status' | 'summary'>('status');
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ExportAction | null>(null);

  if (!project) return null;

  const tasks = getProjectTasks(projectId);
  const checks = getProjectChecks(projectId);
  const reviews = getProjectReviews(projectId);
  const meetings = getProjectMeetings(projectId);
  const today = formatDate(new Date());

  const openTasks = tasks.filter(t => t.status === 'open');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.deadline < new Date().toISOString().split('T')[0]);
  const redChecks = checks.filter(c => c.status === 'red');
  const stuckReviews = reviews.filter(r => r.status === 'not_sent' || r.status === 'fix_required');
  const multiplier = getMultiplier(project.existingUnits, project.plannedUnits);
  const progress = getProjectProgress(project.currentStage);

  const buildReportText = (withLogo: boolean) => {
    const logoLine = withLogo ? '📋 מסמך רשמי – עיריית אשדוד | המרכז להתחדשות עירונית\n\n' : '';

    if (reportType === 'status') {
      return `${logoLine}דוח מצב פרויקט: ${project.name}
${project.planNumber ? `מספר תכנית: ${project.planNumber}\n` : ''}כתובת: ${project.address}
תאריך: ${today}

שלב נוכחי: ${getStageName(project.currentStage)}
פורום הבא: ${getNextForum(project.currentStage)}
התקדמות: ${progress}%
מוכן לפורום 3: ${project.readyForForum3 ? 'כן' : 'לא'}
מוכן לוועדה: ${project.readyForCommittee ? 'כן' : 'לא'}

נתוני דירות:
דירות קיימות: ${project.existingUnits}
דירות מתוכננות: ${project.plannedUnits}
מכפיל: ×${multiplier}

ישיבות: ${meetings.length}
סה"כ משימות: ${tasks.length}
משימות פתוחות: ${openTasks.length}
חסומים: ${blockedTasks.length}
באיחור: ${overdueTasks.length}

משימות פתוחות (${openTasks.length}):
${openTasks.map(t => `• ${t.title} – ${t.owner} (דדליין: ${formatDate(t.deadline)})`).join('\n') || 'אין'}

חסומים (${blockedTasks.length}):
${blockedTasks.map(t => `• ${t.title} – חסם: ${t.blocker}`).join('\n') || 'אין'}

באיחור (${overdueTasks.length}):
${overdueTasks.map(t => `• ${t.title} – ${t.owner} (דדליין: ${formatDate(t.deadline)})`).join('\n') || 'אין'}

אדומים בבקרת תכן (${redChecks.length}):
${redChecks.map(c => `• ${c.name}: ${c.note || 'ללא הערה'}`).join('\n') || 'אין'}

יועצים/גורמים תקועים (${stuckReviews.length}):
${stuckReviews.map(r => `• ${r.reviewerName}: ${r.note || 'ללא הערה'}`).join('\n') || 'אין'}

מה חסר כדי להתקדם:
${blockedTasks.length > 0 ? `• לפתור ${blockedTasks.length} חסמים` : ''}
${redChecks.length > 0 ? `• לטפל ב-${redChecks.length} סעיפים אדומים בבקרת תכן` : ''}
${stuckReviews.length > 0 ? `• להשלים ${stuckReviews.length} חוות דעת יועצים/גורמים` : ''}
${blockedTasks.length === 0 && redChecks.length === 0 && stuckReviews.length === 0 ? '• אין חסמים – ניתן להתקדם' : ''}`;
    }

    return `${logoLine}סיכום כללי – ${project.name}
תאריך: ${today}

פרטי פרויקט:
שם: ${project.name}
${project.planNumber ? `מספר תכנית: ${project.planNumber}\n` : ''}כתובת: ${project.address}
שלב: ${getStageName(project.currentStage)}
דירות קיימות: ${project.existingUnits} | מתוכננות: ${project.plannedUnits} | מכפיל: ×${multiplier}

ישיבות (${meetings.length}):
${meetings.map(m => `• ${formatDate(m.date)} – ${m.forumType === 'forum1' ? 'פורום 1' : m.forumType === 'forum2' ? 'פורום 2' : 'פורום 3'} – ${m.status === 'closed' ? 'נסגר' : m.status === 'completed' ? 'בוצע' : 'מתוכנן'}`).join('\n')}

החלטות עיקריות:
${tasks.filter(t => t.decisionId).map(t => `• ${t.title}`).join('\n') || 'אין'}`;
  };

  const previewText = buildReportText(false);

  const requestAction = (action: ExportAction) => {
    setPendingAction(action);
    setLogoDialogOpen(true);
  };

  const executeAction = (withLogo: boolean) => {
    const text = buildReportText(withLogo);
    setLogoDialogOpen(false);

    switch (pendingAction) {
      case 'copy':
        navigator.clipboard.writeText(text);
        toast({ title: 'הועתק', description: withLogo ? 'הדוח הועתק עם לוגו' : 'הדוח הועתק ללוח' });
        break;
      case 'email': {
        const subject = encodeURIComponent(`דוח מצב – ${project.name} – ${today}`);
        const body = encodeURIComponent(text);
        window.open(`mailto:?subject=${subject}&body=${body}`);
        break;
      }
      case 'excel':
        exportProjectExcel();
        break;
    }
    setPendingAction(null);
  };

  const exportProjectExcel = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      { 'שדה': 'שם פרויקט', 'ערך': project.name },
      { 'שדה': 'מספר תכנית', 'ערך': project.planNumber || '—' },
      { 'שדה': 'כתובת', 'ערך': project.address },
      { 'שדה': 'שלב נוכחי', 'ערך': getStageName(project.currentStage) },
      { 'שדה': 'פורום הבא', 'ערך': getNextForum(project.currentStage) },
      { 'שדה': 'התקדמות', 'ערך': `${progress}%` },
      { 'שדה': 'דירות קיימות', 'ערך': String(project.existingUnits) },
      { 'שדה': 'דירות מתוכננות', 'ערך': String(project.plannedUnits) },
      { 'שדה': 'מכפיל', 'ערך': `×${multiplier}` },
      { 'שדה': 'תאריך דוח', 'ערך': today },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'סיכום');

    const taskSheet = (list: typeof tasks, name: string) => {
      if (list.length === 0) list = [{ id: '', projectId: '', title: '', owner: '', deadline: '', status: 'open' as any, blocker: '', notes: '' }];
      return XLSX.utils.json_to_sheet(list.map(t => ({
        'כותרת': t.title, 'אחראי': t.owner, 'דדליין': formatDate(t.deadline), 'סטטוס': t.status, 'חסם': t.blocker, 'הערות': t.notes,
      })));
    };
    XLSX.utils.book_append_sheet(wb, taskSheet(openTasks, 'פתוחות'), 'משימות פתוחות');
    XLSX.utils.book_append_sheet(wb, taskSheet(blockedTasks, 'חסומים'), 'חסומים');
    XLSX.utils.book_append_sheet(wb, taskSheet(overdueTasks, 'באיחור'), 'באיחור');

    const redData = redChecks.length > 0
      ? redChecks.map(c => ({ 'סעיף': c.name, 'הערה': c.note || '—' }))
      : [{ 'סעיף': '', 'הערה': '' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(redData), 'אדומים בבקרת תכן');

    const stuckData = stuckReviews.length > 0
      ? stuckReviews.map(r => ({ 'גורם': r.reviewerName, 'הערה': r.note || '—' }))
      : [{ 'גורם': '', 'הערה': '' }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stuckData), 'יועצים תקועים');

    XLSX.writeFile(wb, `דוח_${project.name}_${formatDate(new Date())}.xlsx`);
    toast({ title: 'יוצא לאקסל', description: 'הקובץ הורד בהצלחה' });
  };

  return (
    <div className="space-y-5 pt-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={reportType} onValueChange={(v: 'status' | 'summary') => setReportType(v)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="status">דוח מצב</SelectItem>
            <SelectItem value="summary">סיכום כללי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => requestAction('copy')} className="gap-2 h-9">
          <Copy className="h-4 w-4" />העתק לטקסט
        </Button>
        <Button variant="outline" onClick={() => requestAction('email')} className="gap-2 h-9">
          <Mail className="h-4 w-4" />שלח במייל
        </Button>
        <Button variant="outline" onClick={() => requestAction('excel')} className="gap-2 h-9">
          <FileSpreadsheet className="h-4 w-4" />ייצוא לאקסל
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="משימות פתוחות" value={openTasks.length} />
        <MiniStat label="חסומים" value={blockedTasks.length} destructive={blockedTasks.length > 0} />
        <MiniStat label="באיחור" value={overdueTasks.length} destructive={overdueTasks.length > 0} />
        <MiniStat label="ישיבות" value={meetings.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {reportType === 'status' ? 'דוח מצב פרויקט' : 'סיכום כללי'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80" dir="rtl">{previewText}</pre>
        </CardContent>
      </Card>

      {/* Logo prompt dialog */}
      <Dialog open={logoDialogOpen} onOpenChange={(v) => { setLogoDialogOpen(v); if (!v) setPendingAction(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת לוגו למסמך</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              האם להוסיף את הלוגו הרשמי למסמך?
            </p>
            <div className="flex justify-center gap-4 p-4 bg-secondary/30 rounded-xl">
              <img src={logoAshdod} alt="לוגו אשדוד" className="h-12 object-contain" />
              <img src={logoHeader} alt="המרכז להתחדשות עירונית" className="h-12 object-contain" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => executeAction(false)} className="gap-2 flex-1 h-9">
              <ImageOff className="h-4 w-4" />
              בלי לוגו
            </Button>
            <Button onClick={() => executeAction(true)} className="gap-2 flex-1 h-9">
              <Image className="h-4 w-4" />
              עם לוגו
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, destructive }: { label: string; value: number; destructive?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={`text-2xl font-bold ${destructive ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}
