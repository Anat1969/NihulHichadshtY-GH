import { useState, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Loader2, Sparkles, ShieldCheck, CheckCircle2,
  ListTodo, BellRing, FileEdit, Upload, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractFromFile, type ExtractResult } from '@/lib/fileExtractors';
import { cn } from '@/lib/utils';

type MatchState = 'matched' | 'low' | 'unmatched';
type Step = 'upload' | 'analyzing' | 'review' | 'applying' | 'done';
type ImportMode = 'status' | 'protocol' | 'text';

interface ExtractedItem {
  projectName: string | null;
  blocker: string | null;
  nextAction: string | null;
  owner: string | null;
  dueDate: string | null;
  notes: string | null;
  forumContext: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

interface ReviewRow extends ExtractedItem {
  id: string;
  matchedProjectId: string | null;
  matchState: MatchState;
  doUpdateProject: boolean;
  doCreateTask: boolean;
  doCreateReminder: boolean;
  expanded: boolean;
}

interface ApplyStats {
  rowsProcessed: number;
  projectsUpdated: number;
  tasksCreated: number;
  remindersCreated: number;
  failures: number;
}

function normalize(s: string): string {
  return s.normalize('NFKD').replace(/[\s\-_'"״׳]/g, '').toLowerCase();
}

const MODE_LABELS: Record<ImportMode, { label: string; desc: string; icon: string }> = {
  status:   { label: 'עדכון סטטוס כללי', desc: 'מצגת / דוח עם חסמים ופעולות לפי פרויקט', icon: '📊' },
  protocol: { label: 'פרוטוקול ישיבה',  desc: 'החלטות, משימות ותנאים מישיבת פורום',     icon: '📋' },
  text:     { label: 'מייל / טקסט חופשי', desc: 'עדכון, בקשה או הודעה בטקסט חופשי',      icon: '📧' },
};

export default function ImportActionsDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { projects } = useProjects();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [mode, setMode] = useState<ImportMode>('status');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyStats | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setStep('upload'); setFile(null); setPastedText('');
    setRows([]); setApplyResult(null); setExtractResult(null);
    setMode('status');
  };

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setExtractResult(null);
    setExtracting(true);
    try {
      const r = await extractFromFile(f);
      setExtractResult(r);
    } finally {
      setExtracting(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const matchProject = (name: string | null): { id: string | null; state: MatchState } => {
    if (!name) return { id: null, state: 'unmatched' };
    const target = normalize(name);
    if (!target) return { id: null, state: 'unmatched' };
    const exact = projects.find(p => normalize(p.project_name) === target);
    if (exact) return { id: exact.id, state: 'matched' };
    const partial = projects.find(p => {
      const n = normalize(p.project_name);
      return n.includes(target) || target.includes(n);
    });
    if (partial) return { id: partial.id, state: 'low' };
    return { id: null, state: 'unmatched' };
  };

  const analyze = async () => {
    setStep('analyzing');
    try {
      let text = pastedText.trim();
      let sourceLabel = 'הדבקה ידנית';
      if (file) {
        const r = extractResult || await extractFromFile(file);
        if (!extractResult) setExtractResult(r);
        if (r.status === 'failed' || !r.text) {
          toast({ title: 'חילוץ נכשל', description: r.message, variant: 'destructive' });
          setStep('upload'); return;
        }
        text = r.text;
        sourceLabel = file.name;
      }
      if (!text || text.length < 20) {
        toast({ title: 'לא נמצא תוכן', description: 'העלה קובץ או הדבק טקסט.', variant: 'destructive' });
        setStep('upload'); return;
      }

      const { data, error } = await supabase.functions.invoke('import-actions-extract', {
        body: { text, fileName: sourceLabel, mode },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'שגיאה בניתוח', description: data.error, variant: 'destructive' });
        setStep('upload'); return;
      }
      const items: ExtractedItem[] = data?.items || [];
      const reviewRows: ReviewRow[] = items.map((it, idx) => {
        const m = matchProject(it.projectName);
        const matched = m.state === 'matched';
        return {
          ...it,
          id: `r${idx}_${Date.now()}`,
          matchedProjectId: m.id,
          matchState: m.state,
          doUpdateProject: matched,
          doCreateTask: matched && !!it.nextAction,
          doCreateReminder: matched && !!it.nextAction && !!it.dueDate,
          expanded: false,
        };
      });
      if (reviewRows.length === 0) {
        toast({ title: 'לא נמצאו פריטים', description: 'נסה קובץ עשיר יותר או הדבק טקסט.' });
        setStep('upload'); return;
      }
      setRows(reviewRows);
      setStep('review');
    } catch (e: any) {
      toast({ title: 'שגיאה', description: e?.message || 'כשל לא צפוי', variant: 'destructive' });
      setStep('upload');
    }
  };

  const updateRow = (id: string, patch: Partial<ReviewRow>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const apply = async () => {
    const toApply = rows.filter(r => r.matchedProjectId && (r.doUpdateProject || r.doCreateTask || r.doCreateReminder));
    if (!toApply.length) {
      toast({ title: 'לא נבחרו פעולות', variant: 'destructive' }); return;
    }
    setStep('applying');
    const stats: ApplyStats = { rowsProcessed: 0, projectsUpdated: 0, tasksCreated: 0, remindersCreated: 0, failures: 0 };
    const sourceFile = file?.name || 'הדבקה ידנית';
    const today = new Date().toLocaleDateString('he-IL');

    for (const row of toApply) {
      let failed = false;
      if (row.doUpdateProject) {
        try {
          const updates: Record<string, any> = {};
          if (row.blocker)     updates.main_blocker = row.blocker;
          if (row.nextAction)  updates.next_action = row.nextAction;
          if (row.owner)       updates.next_action_owner = row.owner;
          if (row.dueDate)     updates.next_action_due_date = row.dueDate;
          if (Object.keys(updates).length > 0) {
            await supabase.from('projects').update(updates).eq('id', row.matchedProjectId!);
            stats.projectsUpdated++;
          }
        } catch { failed = true; }
      }
      if (row.doCreateTask) {
        try {
          await supabase.from('tasks').insert({
            project_id: row.matchedProjectId!,
            title: (row.nextAction || row.blocker || 'פעולה מיובאת').slice(0, 500),
            owner: row.owner || '',
            deadline: row.dueDate || null,
            blocker: row.blocker || '',
            notes: [`[יובא מ-${sourceFile} ב-${today}]`, row.notes].filter(Boolean).join('\n'),
            status: 'open',
          });
          stats.tasksCreated++;
        } catch { failed = true; }
      }
      if (row.doCreateReminder) {
        try {
          await supabase.from('reminders').insert({
            project_id: row.matchedProjectId!,
            title: (row.nextAction || row.blocker || 'תזכורת').slice(0, 500),
            due_at: row.dueDate ? new Date(row.dueDate + 'T09:00:00').toISOString() : null,
            notes: `[יובא מ-${sourceFile}]`,
            priority: 'normal',
            status: 'open',
          });
          stats.remindersCreated++;
        } catch { failed = true; }
      }
      await supabase.from('audit_log').insert({
        actor: 'Yohan AI Hands',
        action: 'import_apply',
        entity_type: 'project',
        entity_id: row.matchedProjectId!,
        project_id: row.matchedProjectId!,
        details: { sourceFile, mode, projectName: row.projectName },
      }).then(() => {});
      stats.rowsProcessed++;
      if (failed) stats.failures++;
    }
    setApplyResult(stats);
    setStep('done');
  };

  const totalActions = useMemo(() =>
    rows.filter(r => r.matchedProjectId && (r.doUpdateProject || r.doCreateTask || r.doCreateReminder)).length,
    [rows]
  );
  const matchedCount = rows.filter(r => r.matchState === 'matched').length;
  const unmatchedCount = rows.filter(r => r.matchState === 'unmatched').length;
  const lowCount = rows.filter(r => r.matchState === 'low').length;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Yohan AI Hands — ייבוא חסמים ופעולות
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(MODE_LABELS) as [ImportMode, typeof MODE_LABELS[ImportMode]][]).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMode(k)}
                  className={cn(
                    'rounded-xl border p-3 text-right transition-all duration-150',
                    mode === k
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/50 hover:border-primary/30 hover:bg-muted/40'
                  )}
                >
                  <div className="text-lg">{v.icon}</div>
                  <div className="font-semibold text-[13px] text-foreground">{v.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{v.desc}</div>
                </button>
              ))}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-8 text-center',
                dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pptx,.pdf,.docx,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 mx-auto flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-semibold text-[14px] text-foreground">{file.name}</p>
                  {extracting && (
                    <p className="text-[12px] text-muted-foreground flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> מחלץ טקסט...
                    </p>
                  )}
                  {extractResult && !extracting && (
                    <p className={cn('text-[12px]', extractResult.status === 'success' ? 'text-emerald-600' : 'text-amber-600')}>
                      {extractResult.status === 'success' ? '✓' : '⚠'} {extractResult.message}
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setExtractResult(null); }}>
                    הסר קובץ
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="font-semibold text-[14px] text-foreground">גרור קובץ לכאן</p>
                  <p className="text-[12px] text-muted-foreground">או לחץ לבחירה · PPTX · PDF · DOCX · TXT</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-muted-foreground">או הדבק טקסט ישירות</p>
              <Textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="לדוגמה: 'מרגנית — חסם: ממתין לתשובת יועץ תנועה. פעולה: לתאם ישיבה עד 30-04-2026. אחראי: דנה.'"
                className="text-[13px] resize-none rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>ביטול</Button>
              <Button
                className="gap-2 rounded-xl"
                disabled={extracting || (!pastedText.trim() && (!file || !extractResult || extractResult.status === 'failed'))}
                onClick={analyze}
              >
                <Sparkles className="h-4 w-4" />
                נתח עם Yohan AI
              </Button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-foreground">Yohan AI מנתח...</p>
              <p className="text-sm text-muted-foreground">מחלץ פרויקטים, חסמים ופעולות</p>
            </div>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">{rows.length} פרויקטים זוהו</span>
              {matchedCount > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">✓ ודאי: {matchedCount}</Badge>}
              {lowCount > 0 && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]">⚠ בדיקה: {lowCount}</Badge>}
              {unmatchedCount > 0 && <Badge className="bg-red-50 text-red-700 border-red-200 text-[11px]">✗ לא הותאם: {unmatchedCount}</Badge>}
            </div>

            <div className="space-y-3">
              {rows.map(row => {
                const matchColor = row.matchState === 'matched' ? 'border-emerald-200 bg-emerald-50/40'
                  : row.matchState === 'low' ? 'border-amber-200 bg-amber-50/40'
                  : 'border-red-200 bg-red-50/40';
                const matchLabel = row.matchState === 'matched' ? '✓ ודאי'
                  : row.matchState === 'low' ? '⚠ בדיקה'
                  : '✗ לא הותאם';
                const matchLabelColor = row.matchState === 'matched' ? 'text-emerald-700'
                  : row.matchState === 'low' ? 'text-amber-700'
                  : 'text-red-700';
                const projectName = projects.find(p => p.id === row.matchedProjectId)?.project_name || row.projectName || '—';

                return (
                  <div key={row.id} className={cn('rounded-xl border p-4 transition-all duration-200', matchColor)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[14px] text-foreground">{row.projectName || '—'}</span>
                          <span className={cn('text-[11px] font-semibold', matchLabelColor)}>{matchLabel}</span>
                        </div>
                        {row.matchState !== 'unmatched' && (
                          <p className="text-[12px] text-muted-foreground mt-0.5">פרויקט: {projectName}</p>
                        )}
                      </div>
                      <button onClick={() => updateRow(row.id, { expanded: !row.expanded })}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {row.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {row.matchState === 'unmatched' && (
                      <div className="mt-2">
                        <Select value={row.matchedProjectId || ''} onValueChange={v => updateRow(row.id, { matchedProjectId: v, matchState: 'matched' })}>
                          <SelectTrigger className="h-8 text-xs rounded-lg bg-white">
                            <SelectValue placeholder="בחר פרויקט מהמערכת..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.project_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="mt-2 space-y-0.5">
                      {row.blocker && <p className="text-[12px]"><span className="font-semibold text-foreground">חסם:</span> <span className="text-muted-foreground">{row.blocker}</span></p>}
                      {row.nextAction && <p className="text-[12px]"><span className="font-semibold text-foreground">פעולה:</span> <span className="text-muted-foreground">{row.nextAction}</span></p>}
                      {(row.owner || row.dueDate) && (
                        <p className="text-[11px] text-muted-foreground">
                          {row.owner && <span>אחראי: {row.owner}</span>}
                          {row.owner && row.dueDate && <span> · </span>}
                          {row.dueDate && <span>יעד: {row.dueDate}</span>}
                        </p>
                      )}
                    </div>

                    {row.expanded && (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-muted-foreground">חסם</p>
                            <Input className="h-8 text-xs rounded-lg" value={row.blocker || ''} onChange={e => updateRow(row.id, { blocker: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-muted-foreground">פעולה הבאה</p>
                            <Input className="h-8 text-xs rounded-lg" value={row.nextAction || ''} onChange={e => updateRow(row.id, { nextAction: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-muted-foreground">אחראי</p>
                            <Input className="h-8 text-xs rounded-lg" value={row.owner || ''} onChange={e => updateRow(row.id, { owner: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-muted-foreground">תאריך יעד</p>
                            <Input type="date" className="h-8 text-xs rounded-lg" value={row.dueDate || ''} onChange={e => updateRow(row.id, { dueDate: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
                            <Checkbox checked={row.doUpdateProject} disabled={!row.matchedProjectId}
                              onCheckedChange={v => updateRow(row.id, { doUpdateProject: !!v })} />
                            <FileEdit className="h-3.5 w-3.5 text-primary" />עדכן פרויקט
                          </label>
                          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
                            <Checkbox checked={row.doCreateTask} disabled={!row.matchedProjectId}
                              onCheckedChange={v => updateRow(row.id, { doCreateTask: !!v })} />
                            <ListTodo className="h-3.5 w-3.5 text-blue-600" />צור משימה
                          </label>
                          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
                            <Checkbox checked={row.doCreateReminder} disabled={!row.matchedProjectId}
                              onCheckedChange={v => updateRow(row.id, { doCreateReminder: !!v })} />
                            <BellRing className="h-3.5 w-3.5 text-purple-600" />תזכורת
                          </label>
                        </div>
                      </div>
                    )}

                    {!row.expanded && row.matchedProjectId && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {row.doUpdateProject && <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 flex items-center gap-1"><FileEdit className="h-2.5 w-2.5" />עדכון</span>}
                        {row.doCreateTask && <span className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 flex items-center gap-1"><ListTodo className="h-2.5 w-2.5" />משימה</span>}
                        {row.doCreateReminder && <span className="text-[10px] bg-purple-50 text-purple-700 rounded-full px-2 py-0.5 flex items-center gap-1"><BellRing className="h-2.5 w-2.5" />תזכורת</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep('upload')}>חזרה</Button>
              <div className="flex gap-2">
                <Button variant="ghost" className="rounded-xl text-xs"
                  onClick={() => setRows(prev => prev.map(r => ({ ...r, doUpdateProject: false, doCreateTask: false, doCreateReminder: false })))}>
                  בטל הכל
                </Button>
                <Button onClick={apply} disabled={totalActions === 0} className="gap-2 rounded-xl">
                  <ShieldCheck className="h-4 w-4" />
                  אשר והחל {totalActions > 0 && `(${totalActions})`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'applying' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-semibold">מחיל שינויים...</p>
            <p className="text-sm text-muted-foreground">מעדכן פרויקטים, יוצר משימות ותזכורות</p>
          </div>
        )}

        {step === 'done' && applyResult && (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-lg">הושלם בהצלחה</p>
              <p className="text-sm text-muted-foreground mt-1">כל הפעולות בוצעו ותועדו</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {applyResult.projectsUpdated > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-primary">{applyResult.projectsUpdated}</p>
                  <p className="text-[11px] text-muted-foreground">פרויקטים עודכנו</p>
                </div>
              )}
              {applyResult.tasksCreated > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-600">{applyResult.tasksCreated}</p>
                  <p className="text-[11px] text-muted-foreground">משימות נוצרו</p>
                </div>
              )}
              {applyResult.remindersCreated > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-purple-600">{applyResult.remindersCreated}</p>
                  <p className="text-[11px] text-muted-foreground">תזכורות נוצרו</p>
                </div>
              )}
              {applyResult.failures > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-destructive">{applyResult.failures}</p>
                  <p className="text-[11px] text-muted-foreground">כשלונות</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={reset}>ייבוא נוסף</Button>
              <Button className="rounded-xl" onClick={() => onOpenChange(false)}>סגור</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
