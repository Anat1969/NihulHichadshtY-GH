import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, FileText, X, Activity, AlertTriangle, Flame, TrendingUp, Megaphone, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateUtils';
import { getStageName, StageId } from '@/types/project';
import type { ProjectWithAddresses } from '@/hooks/useProjects';
import type { MeetingDocumentDraft, ActionItem } from '@/lib/formalDocumentExport';

interface Section {
  title: string;
  icon: React.ReactNode;
  lines: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: ProjectWithAddresses[];
  onCreateFormalDoc: (draft: Partial<MeetingDocumentDraft>) => void;
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) return `₪${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `₪${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₪${(amount / 1_000).toFixed(0)}K`;
  return `₪${amount.toLocaleString()}`;
}

function buildSummary(projects: ProjectWithAddresses[]): { sections: Section[]; meta: any } {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const total = projects.length;
  const totalIn = projects.reduce((s, p) => s + (p.units_in || 0), 0);
  const totalOut = projects.reduce((s, p) => s + (p.units_out || 0), 0);
  const avgMult = totalIn > 0 ? (totalOut / totalIn).toFixed(1) : null;
  const potential = totalOut * 25000;

  const blocked = projects.filter(p => p.main_blocker && p.main_blocker.trim());
  const highRisk = projects.filter(p => p.risk_level === 'high');
  const medRisk = projects.filter(p => p.risk_level === 'medium');
  const overdue = projects.filter(p => p.next_action_due_date && p.next_action_due_date < today);
  const nearDue = projects.filter(p => p.next_action_due_date && p.next_action_due_date >= today && p.next_action_due_date <= threeDaysFromNow);
  const stuck = projects.filter(p => ['stuck', 'on_hold', 'תקוע', 'מושהה'].includes(p.management_status || ''));
  const stale = projects.filter(p => (p.last_update || p.updated_at) < sevenDaysAgo);

  const top5 = [...projects]
    .filter(p => (p.units_out || 0) > 0)
    .sort((a, b) => (b.units_out || 0) - (a.units_out || 0))
    .slice(0, 5);

  const sections: Section[] = [];

  // 1. System snapshot
  const snap: string[] = [];
  snap.push(`סך הכל ${total} פרויקטים פעילים במערכת.`);
  if (totalIn > 0) snap.push(`${totalIn.toLocaleString()} דירות קיימות → ${totalOut.toLocaleString()} מתוכננות${avgMult ? ` · מכפיל ממוצע ×${avgMult}` : ''}.`);
  if (potential > 0) snap.push(`פוטנציאל היטלים מצטבר: ${formatRevenue(potential)} (לפי 25,000 ₪ ליח״ד, כפוף לאישור היתרים).`);
  sections.push({ title: 'תמונת מצב כללית', icon: <Activity className="h-4 w-4" />, lines: snap });

  // 2. Risks & exceptions
  const risks: string[] = [];
  if (blocked.length) risks.push(`${blocked.length} פרויקטים עם חסם פעיל.`);
  if (highRisk.length) risks.push(`${highRisk.length} בסיכון גבוה${medRisk.length ? `, ${medRisk.length} בסיכון בינוני` : ''}.`);
  else if (medRisk.length) risks.push(`${medRisk.length} פרויקטים בסיכון בינוני.`);
  if (overdue.length) risks.push(`${overdue.length} פרויקטים עם פעולה שעבר היעד שלה.`);
  if (nearDue.length) risks.push(`${nearDue.length} פרויקטים עם יעד ב-3 הימים הקרובים.`);
  if (stuck.length) risks.push(`${stuck.length} פרויקטים תקועים / מושהים.`);
  if (stale.length) risks.push(`${stale.length} פרויקטים ללא עדכון מעל שבוע.`);
  if (risks.length === 0) risks.push('אין חריגות מערכתיות שעלו אוטומטית.');
  sections.push({ title: 'סיכונים וחריגות', icon: <AlertTriangle className="h-4 w-4" />, lines: risks });

  // 3. Immediate attention (top 5 by composite score)
  const scored = projects.map(p => {
    let s = 0;
    if (p.main_blocker?.trim()) s += 4;
    if (p.risk_level === 'high') s += 3;
    if (p.risk_level === 'medium') s += 1;
    if (p.next_action_due_date && p.next_action_due_date < today) s += 3;
    if (['stuck', 'תקוע'].includes(p.management_status || '')) s += 3;
    return { p, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);

  const attention: string[] = scored.length
    ? scored.map(({ p }) => {
        const tags = [];
        if (p.main_blocker?.trim()) tags.push(`חסם: ${p.main_blocker}`);
        if (p.next_action_due_date && p.next_action_due_date < today) tags.push(`יעד עבר ${formatDate(p.next_action_due_date)}`);
        if (['stuck', 'תקוע'].includes(p.management_status || '')) tags.push('תקוע');
        return `${p.project_name} – ${tags.join(' · ')}`;
      })
    : ['אין כרגע פרויקטים הדורשים טיפול מיידי.'];
  sections.push({ title: 'דורש טיפול מיידי', icon: <Flame className="h-4 w-4" />, lines: attention });

  // 4. Trends / pressure points
  const trends: string[] = [];
  if (top5.length) {
    trends.push(`5 הפרויקטים עם הפוטנציאל הגבוה ביותר מרכזים ${top5.reduce((s, p) => s + (p.units_out || 0), 0).toLocaleString()} יח״ד מתוכננות.`);
    trends.push(`מוביל: ${top5[0].project_name} (${(top5[0].units_out || 0).toLocaleString()} יח״ד · ${formatRevenue((top5[0].units_out || 0) * 25000)}).`);
  }
  if (blocked.length && total > 0) {
    const pct = Math.round((blocked.length / total) * 100);
    if (pct >= 30) trends.push(`${pct}% מהפרויקטים עם חסם פעיל – נקודת לחץ מערכתית.`);
  }
  if (overdue.length && total > 0) {
    const pct = Math.round((overdue.length / total) * 100);
    if (pct >= 20) trends.push(`${pct}% מהפרויקטים עם פעולה באיחור – לבחון תהליך מעקב.`);
  }
  if (trends.length === 0) trends.push('לא זוהו מגמות חריגות מהנתונים הנוכחיים.');
  sections.push({ title: 'מגמות ונקודות לחץ', icon: <TrendingUp className="h-4 w-4" />, lines: trends });

  // 5. Key points to management
  const exec: string[] = [];
  if (potential > 0) exec.push(`פוטנציאל היטלים מצטבר של ${formatRevenue(potential)} בכפוף להוצאת היתרים.`);
  if (blocked.length) exec.push(`${blocked.length} פרויקטים מחייבים החלטה מערכתית להסרת חסמים.`);
  if (overdue.length + stuck.length > 0) exec.push(`${overdue.length + stuck.length} סטיות תפעוליות (איחורים/תקיעות) דורשות בקרה ניהולית.`);
  if (top5.length) exec.push(`לרכז מאמץ ב-${top5.length} הפרויקטים המובילים – פוטנציאל מצרפי משמעותי.`);
  if (exec.length === 0) exec.push('אין הצפות מהותיות להעלות כעת להנהלה.');
  sections.push({ title: 'נקודות מפתח להנהלה', icon: <Megaphone className="h-4 w-4" />, lines: exec });

  // 6. Recommended next system action
  const next: string[] = [];
  if (overdue.length) next.push(`לקיים סבב בקרה על ${overdue.length} הפרויקטים עם יעד שעבר.`);
  if (blocked.length) next.push(`לקבוע ישיבת חסמים לצוות הניהול עם ${blocked.length} הפרויקטים החסומים.`);
  if (stale.length >= 3) next.push(`לדרוש עדכון סטטוס מ-${stale.length} הפרויקטים שלא עודכנו השבוע.`);
  if (next.length === 0) next.push('להמשיך מעקב שוטף; אין פעולה מערכתית קריטית כעת.');
  sections.push({ title: 'פעולה מערכתית הבאה מומלצת', icon: <ArrowRight className="h-4 w-4" />, lines: next });

  return {
    sections,
    meta: { total, totalIn, totalOut, avgMult, potential, blocked: blocked.length, overdue: overdue.length, stuck: stuck.length, top5 },
  };
}

function summaryToText(sections: Section[]): string {
  let txt = `סיכום מצב מערכת – ההתחדשות העירונית, אשדוד\nתאריך: ${formatDate(new Date())}\n${'═'.repeat(50)}\n\n`;
  sections.forEach(s => {
    txt += `▪ ${s.title}\n`;
    s.lines.forEach(l => { txt += `  · ${l}\n`; });
    txt += '\n';
  });
  return txt;
}

export default function SystemSummaryDialog({ open, onOpenChange, projects, onCreateFormalDoc }: Props) {
  const { toast } = useToast();
  const { sections, meta } = useMemo(() => buildSummary(projects), [projects]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryToText(sections));
      toast({ title: 'הסיכום הועתק ✓' });
    } catch {
      toast({ title: 'שגיאה בהעתקה', variant: 'destructive' });
    }
  };

  const handleCreateDoc = () => {
    const findSec = (title: string) => sections.find(s => s.title === title);
    const snap = findSec('תמונת מצב כללית');
    const risks = findSec('סיכונים וחריגות');
    const attention = findSec('דורש טיפול מיידי');
    const exec = findSec('נקודות מפתח להנהלה');
    const next = findSec('פעולה מערכתית הבאה מומלצת');

    const body = [
      'דו״ח סטטוס מערכתי על מצב פרויקטי ההתחדשות העירונית בעיריית אשדוד.',
      snap ? 'תמונת מצב: ' + snap.lines.join(' ') : '',
      risks ? 'סיכונים וחריגות: ' + risks.lines.join(' ') : '',
      attention ? 'דורש טיפול מיידי:\n' + attention.lines.map(l => `• ${l}`).join('\n') : '',
    ].filter(Boolean).join('\n\n');

    const decisions = exec ? exec.lines.map((l, i) => `(${i + 1}) ${l}`).join('\n') : '';

    const actionItems: ActionItem[] = next
      ? next.lines.map(l => ({ id: crypto.randomUUID(), task: l, owner: '', due: '' }))
      : [{ id: crypto.randomUUID(), task: '', owner: '', due: '' }];

    onCreateFormalDoc({
      documentType: 'system_status',
      subject: `דו״ח סטטוס מערכת – התחדשות עירונית אשדוד (${formatDate(new Date())})`,
      projectsLine: `${meta.total} פרויקטים פעילים · ${meta.totalOut?.toLocaleString() || 0} יח״ד מתוכננות`,
      body,
      decisions,
      actionItems,
      bodyLabel: 'תמונת מצב מערכתית',
      decisionsLabel: 'נקודות להעלאה להנהלה',
      actionItemsLabel: 'פעולות מערכתיות הבאות',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0" dir="rtl">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            סיכום מצב מערכת – פלט חכם
          </DialogTitle>
          <p className="text-sm text-muted-foreground">תדריך מערכתי קצר וממוקד, מבוסס על נתוני המערכת בזמן אמת.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sections.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-2 text-primary">
                {s.icon}
                <h3 className="font-bold text-[14px]">{s.title}</h3>
              </div>
              <ul className="space-y-1.5 mr-1">
                {s.lines.map((l, i) => (
                  <li key={i} className="text-[13px] leading-relaxed text-foreground/90 flex gap-2">
                    <span className="text-primary/60 mt-1.5 shrink-0">•</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t p-4 flex items-center justify-between gap-3 bg-background">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="gap-2">
            <X className="h-4 w-4" />סגור
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />העתק סיכום
            </Button>
            <Button onClick={handleCreateDoc} className="gap-2">
              <FileText className="h-4 w-4" />צור מסמך רשמי מהסיכום
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
