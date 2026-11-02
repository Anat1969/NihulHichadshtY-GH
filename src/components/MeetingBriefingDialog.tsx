import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, FileText, X, ClipboardList, Target, AlertTriangle, CheckSquare, ArrowRight, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStageName, StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import type { MeetingDocumentDraft, ActionItem } from '@/lib/formalDocumentExport';

interface BriefingSection {
  title: string;
  icon: React.ReactNode;
  lines: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: any;
  onCreateFormalDoc: (draft: Partial<MeetingDocumentDraft>) => void;
}

const has = (v: any) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '0';

function buildBriefing(p: any): BriefingSection[] {
  const sections: BriefingSection[] = [];

  // 1. Meeting purpose
  const purpose: string[] = [];
  purpose.push(`קידום והכרעות בנושא פרויקט "${p.project_name}"${p.plan_number ? ` – תכנית ${p.plan_number}` : ''}.`);
  if (p.main_stage) {
    purpose.push(`שלב נוכחי: ${getStageName(p.main_stage as StageId)}${p.sub_stage ? ` · ${p.sub_stage}` : ''}.`);
  }
  sections.push({ title: 'מטרת הישיבה', icon: <Target className="h-4 w-4" />, lines: purpose });

  // 2. Current status
  const status: string[] = [];
  if (has(p.quarter)) status.push(`רובע: ${p.quarter}`);
  if (has(p.developer)) status.push(`יזם: ${p.developer}`);
  if (has(p.plan_submitter)) status.push(`מגיש התכנית: ${p.plan_submitter}`);
  if (has(p.units_in) || has(p.units_out)) {
    const parts = [];
    if (has(p.units_in)) parts.push(`${p.units_in} קיימות`);
    if (has(p.units_out)) parts.push(`${p.units_out} מתוכננות`);
    if (has(p.multiplier) && Number(p.multiplier) > 0) parts.push(`מכפיל ×${Number(p.multiplier).toFixed(1)}`);
    status.push(`יח״ד: ${parts.join(' · ')}`);
  }
  if (has(p.units_out) && Number(p.units_out) > 0) {
    const potential = (Number(p.units_out) * 25000 / 1_000_000).toFixed(1);
    status.push(`פוטנציאל היטלים צפוי: ₪${potential}M (כפוף לאישור היתרים).`);
  }
  if (has(p.management_status)) status.push(`סטטוס ניהולי: ${p.management_status}.`);
  if (has(p.last_update)) status.push(`עדכון אחרון: ${formatDate(p.last_update)}.`);
  sections.push({ title: 'תמצית מצב נוכחי', icon: <ClipboardList className="h-4 w-4" />, lines: status });

  // 3. Critical points
  const critical: string[] = [];
  if (has(p.risk_level)) {
    const riskMap: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };
    critical.push(`רמת סיכון: ${riskMap[p.risk_level] || p.risk_level}.`);
  }
  if (has(p.main_stage)) critical.push(`להציג מעמד שלב "${getStageName(p.main_stage as StageId)}" ולוודא בשלות להמשך.`);
  if (has(p.units_out) && has(p.units_in) && Number(p.units_in) > 0) {
    const m = Number(p.units_out) / Number(p.units_in);
    if (m < 2) critical.push(`לדון במכפיל ×${m.toFixed(1)} – נמוך יחסית, לבחון העלאה.`);
  }
  if (critical.length === 0) critical.push('אין דגלים קריטיים שעלו אוטומטית מהמערכת.');
  sections.push({ title: 'נקודות קריטיות להעלאה', icon: <AlertTriangle className="h-4 w-4" />, lines: critical });

  // 4. Main blockers
  const blockers: string[] = [];
  if (has(p.main_blocker)) blockers.push(p.main_blocker);
  else blockers.push('לא תועד חסם מרכזי במערכת.');
  sections.push({ title: 'חסמים עיקריים', icon: <AlertTriangle className="h-4 w-4" />, lines: blockers });

  // 5. Decisions needed
  const decisions: string[] = [];
  if (has(p.next_action)) decisions.push(`לאשר את הפעולה: ${p.next_action}.`);
  if (has(p.main_blocker)) decisions.push('להחליט על מתווה הסרת החסם.');
  if (has(p.main_stage)) decisions.push(`לאשר מעבר/המשך בשלב "${getStageName(p.main_stage as StageId)}".`);
  if (decisions.length === 0) decisions.push('לקבוע יעדים והחלטות לפי דיון הצוות.');
  sections.push({ title: 'החלטות נדרשות', icon: <CheckSquare className="h-4 w-4" />, lines: decisions });

  // 6. Recommended next action
  const next: string[] = [];
  if (has(p.next_action)) {
    let line = p.next_action;
    const meta = [];
    if (has(p.next_action_owner)) meta.push(`אחראי: ${p.next_action_owner}`);
    if (has(p.next_action_due_date)) meta.push(`יעד: ${formatDate(p.next_action_due_date)}`);
    if (meta.length) line += ` (${meta.join(' · ')})`;
    next.push(line);
  } else {
    next.push('לא הוגדרה פעולה הבאה במערכת – להגדיר בדיון.');
  }
  sections.push({ title: 'פעולה הבאה מומלצת', icon: <ArrowRight className="h-4 w-4" />, lines: next });

  // 7. Pre-meeting checks
  const checks: string[] = [];
  if (has(p.plan_number)) checks.push(`לוודא נגישות תיק התכנית ${p.plan_number}.`);
  if (has(p.notes)) checks.push('לעבור על הערות הפרויקט המתועדות במערכת.');
  if (has(p.last_update)) checks.push(`לבדוק עדכונים מאז ${formatDate(p.last_update)}.`);
  checks.push('לוודא נוכחות גורמים רלוונטיים לקבלת החלטות.');
  sections.push({ title: 'בדיקות לפני הישיבה', icon: <ListChecks className="h-4 w-4" />, lines: checks });

  return sections;
}

function briefingToText(sections: BriefingSection[], projectName: string): string {
  let txt = `תדריך ישיבה – ${projectName}\n${'═'.repeat(40)}\n\n`;
  sections.forEach(s => {
    txt += `▪ ${s.title}\n`;
    s.lines.forEach(l => { txt += `  · ${l}\n`; });
    txt += '\n';
  });
  return txt;
}

export default function MeetingBriefingDialog({ open, onOpenChange, project, onCreateFormalDoc }: Props) {
  const { toast } = useToast();
  const sections = useMemo(() => buildBriefing(project), [project]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefingToText(sections, project.project_name));
      toast({ title: 'התדריך הועתק ✓' });
    } catch {
      toast({ title: 'שגיאה בהעתקה', variant: 'destructive' });
    }
  };

  const handleCreateDoc = () => {
    const findSec = (title: string) => sections.find(s => s.title === title);
    const purpose = findSec('מטרת הישיבה');
    const status = findSec('תמצית מצב נוכחי');
    const critical = findSec('נקודות קריטיות להעלאה');
    const blockers = findSec('חסמים עיקריים');
    const decisionsSec = findSec('החלטות נדרשות');
    const checks = findSec('בדיקות לפני הישיבה');

    const block = (title: string, lines?: string[]) =>
      lines && lines.length ? `▪ ${title}\n${lines.map(l => `  • ${l}`).join('\n')}` : '';

    const body = [
      block('מטרת הישיבה', purpose?.lines),
      block('תמצית מצב נוכחי', status?.lines),
      block('נקודות קריטיות להעלאה', critical?.lines),
      block('חסמים עיקריים', blockers?.lines),
      block('בדיקות לפני הישיבה', checks?.lines),
    ].filter(Boolean).join('\n\n');

    const decisionsText = decisionsSec
      ? decisionsSec.lines.map((l, i) => `(${i + 1}) ${l}`).join('\n')
      : '';

    const actionItems: ActionItem[] = [];
    if (project.next_action) {
      actionItems.push({
        id: crypto.randomUUID(),
        task: project.next_action,
        owner: project.next_action_owner || '',
        due: project.next_action_due_date ? formatDate(project.next_action_due_date) : '',
      });
    }
    if (actionItems.length === 0) {
      actionItems.push({ id: crypto.randomUUID(), task: '', owner: '', due: '' });
    }

    onCreateFormalDoc({
      documentType: 'meeting',
      subject: `תדריך ישיבה – ${project.project_name}${project.plan_number ? ` (תכנית ${project.plan_number})` : ''}`,
      projectsLine: project.plan_number ? `${project.project_name} – תכנית מס׳ ${project.plan_number}` : project.project_name,
      body,
      decisions: decisionsText,
      actionItems,
      bodyLabel: 'תדריך לקראת הישיבה',
      decisionsLabel: 'החלטות נדרשות בישיבה',
      actionItemsLabel: 'משימות לפעולה',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0" dir="rtl">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            תדריך ישיבה חכם – {project.project_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">פלט מערכת המבוסס על נתוני הפרויקט. ממוקד, קצר ומוכן לשימוש.</p>
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
              <Copy className="h-4 w-4" />העתק תדריך
            </Button>
            <Button onClick={handleCreateDoc} className="gap-2">
              <FileText className="h-4 w-4" />צור מסמך רשמי מהתדריך
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
