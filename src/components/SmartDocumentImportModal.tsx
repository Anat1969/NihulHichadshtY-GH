import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { extractFromFile } from '@/lib/fileExtractors';
import { cn } from '@/lib/utils';

type Confidence = 'high' | 'medium' | 'low';
interface ImportResult {
  nameInDocument: string;
  matchedProjectName: string | null;
  confidence: Confidence;
  extractedData: Record<string, string>;
  projectId: string | null;
}
interface Row extends ImportResult { selected: boolean; expanded: boolean; }
type ApplyStatus = 'pending' | 'success' | 'error';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projects: { id: string; project_name: string }[];
  onDone?: () => void;
}

const MAX_SIZE = 20 * 1024 * 1024;
const ACCEPT = ['.docx', '.pdf', '.xlsx'];
const STEPS = ['העלאה', 'ניתוח', 'בדיקה', 'עדכון'];

const confBadge: Record<Confidence, { label: string; cls: string }> = {
  high: { label: '✅ גבוה', cls: 'bg-status-green text-primary-foreground' },
  medium: { label: '⚠️ בינוני', cls: 'bg-status-yellow text-primary-foreground' },
  low: { label: '❓ נמוך', cls: 'bg-status-red text-primary-foreground' },
};
const rowBg: Record<Confidence, string> = {
  high: 'bg-status-green/10',
  medium: 'bg-status-yellow/10',
  low: '',
};

export default function SmartDocumentImportModal({ open, onOpenChange, projects, onDone }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState('');
  const [applyStatus, setApplyStatus] = useState<Record<number, ApplyStatus>>({});
  const [applyIndex, setApplyIndex] = useState(0);
  const [applyDone, setApplyDone] = useState(false);

  const reset = () => {
    setStep(0); setFile(null); setFileError(''); setRows([]); setSummary('');
    setApplyStatus({}); setApplyIndex(0); setApplyDone(false);
  };
  const handleOpenChange = (o: boolean) => {
    if (!o && step === 1) return;
    if (!o) { if (applyDone) onDone?.(); reset(); }
    onOpenChange(o);
  };

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.includes(ext)) { setFileError('פורמט לא נתמך. יש להעלות Word, PDF או Excel'); setFile(null); return; }
    if (f.size > MAX_SIZE) { setFileError('הקובץ גדול מ-20MB'); setFile(null); return; }
    setFileError(''); setFile(f);
  };

  const analyze = async () => {
    if (!file) return;
    setStep(1);
    try {
      const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
      const safe = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `imports/${safe}`;
      const { error: upErr } = await supabase.storage.from('project-assets').upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      const { data: urlData } = supabase.storage.from('project-assets').getPublicUrl(path);

      let text: string | undefined;
      if (ext === 'xlsx') {
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        text = wb.SheetNames.map(n => `### גיליון: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
      } else if (ext === 'docx') {
        const r = await extractFromFile(file);
        if (!r.text) throw new Error(r.message);
        text = r.text;
      }

      const { data, error } = await supabase.functions.invoke('analyze-document-import', {
        body: { fileUrl: urlData.publicUrl, fileName: file.name, text },
      });
      if (error) {
        let msg = error.message;
        try { const b = await (error as any).context?.json?.(); if (b?.error) msg = b.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      const results: ImportResult[] = data?.results || [];
      setSummary(data?.summary || '');
      setRows(results.map(r => ({ ...r, selected: r.confidence !== 'low' && !!r.projectId, expanded: false })));
      setStep(2);
    } catch (e: any) {
      toast({ title: 'שגיאה בניתוח המסמך', description: e?.message || 'אירעה שגיאה', variant: 'destructive' });
      setStep(0);
    }
  };

  const updateRow = (i: number, patch: Partial<Row>) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const selected = rows.map((r, i) => ({ r, i })).filter(x => x.r.selected && x.r.projectId);

  const apply = async () => {
    setStep(3);
    const importDate = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
    let ok = 0;
    for (let k = 0; k < selected.length; k++) {
      const { r, i } = selected[k];
      setApplyIndex(k + 1);
      try {
        const dataLines = Object.entries(r.extractedData).map(([key, v]) => `${key}: ${v}`).join('\n');
        const note = `\n\n--- ייבוא מסמך ${importDate} (${file?.name || ''}) ---\n${dataLines}`;
        const { data: proj, error: fErr } = await supabase.from('projects').select('notes').eq('id', r.projectId!).single();
        if (fErr) throw fErr;
        const { error: uErr } = await supabase.from('projects').update({ notes: (proj?.notes || '') + note }).eq('id', r.projectId!);
        if (uErr) throw uErr;
        ok++;
        setApplyStatus(s => ({ ...s, [i]: 'success' }));
      } catch {
        setApplyStatus(s => ({ ...s, [i]: 'error' }));
      }
    }
    setApplyDone(true);
    toast(ok === selected.length
      ? { title: `${ok} פרויקטים עודכנו בהצלחה` }
      : { title: `${ok} מתוך ${selected.length} עודכנו`, variant: 'destructive' });
  };

  const highCount = rows.filter(r => r.confidence === 'high').length;
  const reviewCount = rows.length - highCount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="max-w-[860px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-right">
          <DialogTitle>{step === 2 ? 'תוצאות הניתוח – בחר פרויקטים לעדכון' : 'ייבוא מסמך מעקב'}</DialogTitle>
          {step === 0 && <DialogDescription>העלה קובץ Word, PDF או Excel המכיל נתוני מעקב על פרויקטים</DialogDescription>}
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
              <span className={cn('text-xs', i === step ? 'font-semibold' : 'text-muted-foreground')}>{s}</span>
              {i < STEPS.length - 1 && <div className={cn('h-px flex-1', i < step ? 'bg-primary' : 'bg-border')} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
              onClick={() => inputRef.current?.click()}
              className={cn('border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">גרור קובץ לכאן או לחץ לבחירה</p>
              <p className="text-xs text-muted-foreground mt-1">DOCX, PDF, XLSX — עד 20MB</p>
              <input ref={inputRef} type="file" accept={ACCEPT.join(',')} className="hidden"
                onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            {file && (
              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <Button onClick={analyze}>נתח מסמך</Button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="font-medium">המערכת מנתחת את המסמך ומזהה פרויקטים...</p>
            <p className="text-sm text-muted-foreground">הניתוח עשוי לקחת כ-20-30 שניות</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              זוהו {rows.length} פרויקטים | {highCount} עם ביטחון גבוה | {reviewCount} דורשים בדיקה
              {summary && <p className="text-xs text-muted-foreground mt-1">{summary}</p>}
            </div>
            {rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">לא זוהו פרויקטים במסמך</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="hidden md:grid grid-cols-[48px_1fr_1.3fr_90px_1.6fr] gap-2 px-3 py-2 bg-muted text-xs font-semibold">
                  <span>בחר</span><span>שם במסמך</span><span>פרויקט שזוהה</span><span>ביטחון</span><span>נתונים שחולצו</span>
                </div>
                {rows.map((r, i) => {
                  const entries = Object.entries(r.extractedData);
                  const shown = r.expanded ? entries : entries.slice(0, 2);
                  return (
                    <div key={i} className={cn('grid grid-cols-1 md:grid-cols-[48px_1fr_1.3fr_90px_1.6fr] gap-2 px-3 py-3 border-t items-start text-sm',
                      rowBg[r.confidence] || (i % 2 ? 'bg-muted/20' : ''))}>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={r.selected} disabled={!r.projectId} onCheckedChange={v => updateRow(i, { selected: !!v })} />
                        <span className="md:hidden font-medium">{r.nameInDocument}</span>
                      </div>
                      <span className="hidden md:block font-medium">{r.nameInDocument}</span>
                      <Select value={r.projectId || ''} onValueChange={v => {
                        const p = projects.find(x => x.id === v);
                        updateRow(i, { projectId: v, matchedProjectName: p?.project_name || null, selected: true });
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="בחר פרויקט" /></SelectTrigger>
                        <SelectContent dir="rtl">
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div><Badge className={cn('border-0', confBadge[r.confidence]?.cls)}>{confBadge[r.confidence]?.label || r.confidence}</Badge></div>
                      <div className="text-xs space-y-0.5">
                        {shown.map(([k, v]) => <div key={k}><span className="font-semibold">{k}:</span> {String(v)}</div>)}
                        {entries.length > 2 && (
                          <button className="text-primary hover:underline" onClick={() => updateRow(i, { expanded: !r.expanded })}>
                            {r.expanded ? 'הצג פחות' : `הצג הכל (${entries.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={reset}>מסמך אחר</Button>
              <Button onClick={apply} disabled={selected.length === 0}>✅ עדכן {selected.length} פרויקטים שנבחרו</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              {applyDone
                ? `${Object.values(applyStatus).filter(s => s === 'success').length} פרויקטים עודכנו בהצלחה`
                : `מעדכן פרויקט ${applyIndex} מתוך ${selected.length}...`}
            </p>
            <Progress value={selected.length ? (applyIndex / selected.length) * 100 : 0} />
            <div className="space-y-1.5">
              {selected.map(({ r, i }) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {applyStatus[i] === 'success' ? <CheckCircle2 className="h-4 w-4 text-status-green" />
                    : applyStatus[i] === 'error' ? <XCircle className="h-4 w-4 text-destructive" />
                    : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {r.matchedProjectName}
                </div>
              ))}
            </div>
            {applyDone && <div className="flex justify-end"><Button onClick={() => handleOpenChange(false)}>סגור</Button></div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
