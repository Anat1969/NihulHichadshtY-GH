import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, Sparkles, FileText } from 'lucide-react';
import { getStageName, StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import type { MeetingDocumentDraft, ActionItem } from '@/lib/formalDocumentExport';

interface Props {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFormalDoc?: (draft: Partial<MeetingDocumentDraft>) => void;
}

const statusLabel = (s?: string | null) => {
  if (s === 'active') return 'פעיל';
  if (s === 'on_hold') return 'מושהה';
  if (s === 'stuck') return 'תקוע';
  if (s === 'completed') return 'הושלם';
  return s || '';
};

const riskLabel = (r?: string | null) => {
  if (r === 'high') return 'גבוה';
  if (r === 'medium') return 'בינוני';
  if (r === 'low') return 'נמוך';
  return r || '';
};

function formatNis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} מיליון ₪`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} אלף ₪`;
  return `${n.toLocaleString()} ₪`;
}

function buildSummary(p: any): { title: string; sections: { label: string; value: string }[]; bullets: string[]; plain: string } {
  const sections: { label: string; value: string }[] = [];
  const planned = p.units_out || 0;
  const existing = p.units_in || 0;
  const potential = planned * 25000;
  const mult = p.multiplier || (existing > 0 ? (planned / existing).toFixed(1) : null);

  // Current status
  const stageName = getStageName((p.main_stage as StageId) || 'forum1_harmonika');
  const statusBits: string[] = [stageName];
  if (p.sub_stage) statusBits.push(p.sub_stage);
  if (p.management_status) statusBits.push(`סטטוס ניהולי: ${statusLabel(p.management_status)}`);
  sections.push({ label: 'מצב נוכחי', value: statusBits.join(' · ') });

  // Main blocker
  if (p.main_blocker && p.main_blocker.trim()) {
    sections.push({ label: 'חסם מרכזי', value: p.main_blocker.trim() });
  }

  // Next action
  if (p.next_action && p.next_action.trim()) {
    const parts = [p.next_action.trim()];
    if (p.next_action_owner) parts.push(`אחראי: ${p.next_action_owner}`);
    if (p.next_action_due_date) parts.push(`יעד: ${formatDate(p.next_action_due_date)}`);
    sections.push({ label: 'פעולה הבאה', value: parts.join(' · ') });
  }

  // Risk
  if (p.risk_level) {
    sections.push({ label: 'רמת סיכון', value: riskLabel(p.risk_level) });
  }

  // Nearest due
  if (p.next_action_due_date) {
    const due = new Date(p.next_action_due_date);
    const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let txt = formatDate(p.next_action_due_date);
    if (days < 0) txt += ` · באיחור של ${Math.abs(days)} ימים`;
    else if (days === 0) txt += ' · היום';
    else txt += ` · בעוד ${days} ימים`;
    sections.push({ label: 'יעד קרוב', value: txt });
  }

  // Permit potential
  if (planned > 0) {
    sections.push({
      label: 'פוטנציאל צפוי מהיתרים',
      value: `${formatNis(potential)} (${planned.toLocaleString()} יח״ד × 25,000 ₪, בכפוף לאישור היתרים)`,
    });
  }

  // Bullets
  const bullets: string[] = [];
  if (existing > 0 && planned > 0) {
    bullets.push(`קיים ${existing.toLocaleString()} יח״ד · מתוכנן ${planned.toLocaleString()} יח״ד${mult ? ` · מכפיל x${mult}` : ''}`);
  }
  if (p.plan_number) bullets.push(`מספר תכנית: ${p.plan_number}`);
  if (p.developer) bullets.push(`יזם: ${p.developer}`);
  if (p.plan_submitter) bullets.push(`מגיש התכנית / אדריכל: ${p.plan_submitter}`);
  if (p.quarter) bullets.push(`רובע: ${p.quarter}`);
  if (p.last_update) bullets.push(`עדכון אחרון: ${formatDate(p.last_update)}`);
  if (p.notes && p.notes.trim()) bullets.push(`הערות: ${p.notes.trim()}`);

  const title = `סיכום מצב פרויקט – ${p.project_name}`;

  // Plain text version for copy
  const lines = [title, '─'.repeat(40)];
  sections.forEach(s => lines.push(`${s.label}: ${s.value}`));
  if (bullets.length > 0) {
    lines.push('', 'נקודות מפתח:');
    bullets.forEach(b => lines.push(`• ${b}`));
  }
  lines.push('', `הופק: ${formatDate(new Date())}`);

  return { title, sections, bullets, plain: lines.join('\n') };
}

export default function ProjectSmartSummary({ project, open, onOpenChange, onCreateFormalDoc }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const summary = useMemo(() => (project ? buildSummary(project) : null), [project]);

  if (!summary) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.plain);
      setCopied(true);
      toast({ title: 'הסיכום הועתק', description: 'ניתן להדביק במייל / וואטסאפ / מסמך' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'העתקה נכשלה', variant: 'destructive' });
    }
  };

  const handleCreateDoc = () => {
    if (!onCreateFormalDoc) return;
    const bodyLines: string[] = [];
    bodyLines.push(`דו״ח מצב לפרויקט "${project.project_name}"${project.plan_number ? ` (תכנית ${project.plan_number})` : ''}.`);
    bodyLines.push('');
    summary.sections.forEach(s => {
      bodyLines.push(`▪ ${s.label}: ${s.value}`);
    });
    if (summary.bullets.length) {
      bodyLines.push('');
      bodyLines.push('▪ נקודות מפתח:');
      summary.bullets.forEach(b => bodyLines.push(`  • ${b}`));
    }

    const decisionsLines: string[] = [];
    if (project.main_blocker?.trim()) decisionsLines.push(`(1) טיפול בחסם המרכזי: ${project.main_blocker.trim()}`);
    if (project.next_action?.trim()) decisionsLines.push(`(${decisionsLines.length + 1}) קידום הפעולה הבאה: ${project.next_action.trim()}`);
    if (project.risk_level === 'high') decisionsLines.push(`(${decisionsLines.length + 1}) הסלמה ניהולית עקב רמת סיכון גבוהה`);

    const actionItems: ActionItem[] = [];
    if (project.next_action?.trim()) {
      actionItems.push({
        id: crypto.randomUUID(),
        task: project.next_action.trim(),
        owner: project.next_action_owner || '',
        due: project.next_action_due_date ? formatDate(project.next_action_due_date) : '',
      });
    }
    if (actionItems.length === 0) actionItems.push({ id: crypto.randomUUID(), task: '', owner: '', due: '' });

    onCreateFormalDoc({
      documentType: 'project_status',
      subject: `סיכום מצב פרויקט – ${project.project_name}${project.plan_number ? ` (תכנית ${project.plan_number})` : ''}`,
      projectsLine: project.plan_number ? `${project.project_name} – תכנית מס׳ ${project.plan_number}` : project.project_name,
      body: bodyLines.join('\n'),
      decisions: decisionsLines.join('\n'),
      actionItems,
      bodyLabel: 'תמצית מצב הפרויקט',
      decisionsLabel: 'נקודות מפתח להמשך',
      actionItemsLabel: 'משימות פתוחות',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Sparkles className="h-5 w-5 text-primary" />
            סיכום מצב פרויקט
          </DialogTitle>
          <DialogDescription className="text-right">
            סיכום ניהולי אוטומטי המבוסס על נתוני המערכת בלבד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-right" dir="rtl">
          <h3 className="font-bold text-lg border-b pb-2">{project.project_name}</h3>

          <div className="space-y-2.5">
            {summary.sections.map((s, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="font-semibold text-foreground shrink-0 min-w-[120px]">{s.label}:</span>
                <span className="text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>

          {summary.bullets.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-semibold text-sm mb-2">נקודות מפתח</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {summary.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3 gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">הופק: {formatDate(new Date())}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'הועתק' : 'העתק סיכום'}
              </Button>
              {onCreateFormalDoc && (
                <Button size="sm" onClick={handleCreateDoc} className="gap-2">
                  <FileText className="h-4 w-4" />
                  צור מסמך רשמי
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
