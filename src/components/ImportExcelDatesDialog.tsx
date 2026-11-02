import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
  sheet: string;
  project?: string;
  status: string;
  datesInserted?: number;
  stageUpdated?: boolean;
  mostAdvancedStage?: string;
}

interface ImportSheet {
  name: string;
  rows: unknown[][];
}

export default function ImportExcelDatesDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [unmappedSheets, setUnmappedSheets] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<{id: string, project_name: string}[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [pendingSheets, setPendingSheets] = useState<ImportSheet[]>([]);

  useEffect(() => {
    supabase.from('projects').select('id, project_name').order('project_name')
      .then(({ data }) => setProjects(data || []));
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast({ title: 'יש לבחור קובץ Excel (.xlsx)', variant: 'destructive' });
      return;
    }
    setImporting(true);
    setResults([]);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      const sheets = workbook.SheetNames.map(name => {
        const ws = workbook.Sheets[name];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd',
          defval: null,
        });
        return { name, rows };
      });

      const { data, error } = await supabase.functions.invoke('import-excel-dates', {
        body: { sheets }
      });

      if (error) throw error;

      setResults(data.results || []);

      const notFoundSheets = data.results
        ?.filter((r: ImportResult) => r.status === 'not_found')
        .map((r: ImportResult) => r.sheet) || [];

      if (notFoundSheets.length > 0) {
        setUnmappedSheets(notFoundSheets);
        setPendingSheets(sheets);
        setShowMapping(true);
      }

      const found = data.results?.filter((r: ImportResult) => r.status === 'ok').length || 0;
      const notFound = data.results?.filter((r: ImportResult) => r.status === 'not_found').length || 0;

      toast({
        title: `ייבוא הושלם — ${found} פרויקטים עודכנו${notFound > 0 ? `, ${notFound} לא נמצאו` : ''}`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      toast({ title: `שגיאה: ${message}`, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            ייבוא תאריכים מאקסל
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            העלה קובץ Excel עם תאריכי תב״ע לכל פרויקט. המערכת תעדכן אוטומטית את הגאנט ואת השלב הנוכחי.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => document.getElementById('excel-input')?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            {importing ? (
              <div className="space-y-3">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="font-semibold">מייבא נתונים...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-semibold">גרור קובץ Excel לכאן</p>
                <p className="text-xs text-muted-foreground">או לחץ לבחירת קובץ · xlsx בלבד</p>
              </div>
            )}
          </div>

          <input id="excel-input" type="file" accept=".xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <div key={`${r.sheet}-${i}`} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    {r.status === 'ok'
                      ? <CheckCircle2 className="h-5 w-5 text-primary" />
                      : <AlertCircle className="h-5 w-5 text-destructive" />
                    }
                    <div>
                      <p className="font-medium text-sm">{r.project || r.sheet}</p>
                      {r.status === 'ok' ? (
                        <p className="text-xs text-muted-foreground">
                          {r.datesInserted} תאריכים · {r.stageUpdated ? `שלב עודכן ← ${r.mostAdvancedStage}` : 'שלב לא שונה'}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive">לא נמצא במערכת</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.sheet}</span>
                </div>
              ))}
            </div>
          )}

          {showMapping && unmappedSheets.length > 0 && (
            <div className="rounded-xl border border-border p-4 space-y-4">
              <p className="font-semibold text-sm">
                {unmappedSheets.length} פרויקטים לא נמצאו — בצע התאמה ידנית:
              </p>

              {unmappedSheets.map(sheetName => (
                <div key={sheetName} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <span className="text-sm font-medium truncate">{sheetName}</span>
                  <span className="text-muted-foreground">←</span>
                  <Select
                    value={mappings[sheetName] || ''}
                    onValueChange={v => setMappings(prev => ({ ...prev, [sheetName]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר פרויקט" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">-- דלג --</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.project_name}>{p.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                disabled={importing}
                onClick={async () => {
                  setImporting(true);
                  const remappedSheets = pendingSheets
                    .filter(s => mappings[s.name] && mappings[s.name] !== 'skip')
                    .map(s => ({ ...s, name: mappings[s.name] }));
                  if (remappedSheets.length === 0) { setImporting(false); return; }
                  const { data, error } = await supabase.functions.invoke('import-excel-dates', {
                    body: { sheets: remappedSheets }
                  });
                  setImporting(false);
                  if (error) { toast({ title: `שגיאה: ${error.message}`, variant: 'destructive' }); return; }
                  setResults(prev => [...prev, ...(data.results || [])]);
                  setShowMapping(false);
                  setUnmappedSheets([]);
                  const found = data.results?.filter((r: ImportResult) => r.status === 'ok').length || 0;
                  toast({ title: `עוד ${found} פרויקטים עודכנו ✓` });
                }}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                ייבא פרויקטים מותאמים
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}