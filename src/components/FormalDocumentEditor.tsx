import { useState, useRef, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, FileText, FileType, Eye, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateUtils';
import {
  exportFormalDocPdfFromElement,
  exportFormalDocDocx,
  LETTERHEAD_LOGOS,
  type ActionItem,
  type MeetingDocumentDraft,
} from '@/lib/formalDocumentExport';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: any;
  draftOverride?: Partial<MeetingDocumentDraft> | null;
}

const newActionItem = (): ActionItem => ({
  id: crypto.randomUUID(),
  task: '',
  owner: '',
  due: '',
});

export default function FormalDocumentEditor({ open, onOpenChange, project, draftOverride }: Props) {
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  // Build initial draft based on the requested document type (defaults to meeting)
  const buildInitialDraft = (override?: Partial<MeetingDocumentDraft> | null): MeetingDocumentDraft => {
    const docType = override?.documentType || 'meeting';

    if (docType === 'project_status') {
      return {
        date: formatDate(new Date()),
        recipient: 'מאן דבעי',
        subject: `סיכום מצב פרויקט – ${project?.project_name || ''}`,
        projectsLine: project?.plan_number ? `${project.project_name} – תכנית מס׳ ${project.plan_number}` : (project?.project_name || ''),
        participantsMunicipality: '',
        participantsProjects: '',
        body: '',
        decisions: '',
        actionItems: [newActionItem()],
        signature: 'יוהאן אבוחצירה – מנהל פרויקטים, התחדשות עירונית',
        copies: '',
        showLogo1: true,
        showLogo2: true,
        documentType: 'project_status',
        bodyLabel: 'תמצית מצב הפרויקט',
        decisionsLabel: 'נקודות מפתח להמשך',
        actionItemsLabel: 'משימות פתוחות',
        hideParticipants: true,
        ...override,
      };
    }

    if (docType === 'system_status') {
      return {
        date: formatDate(new Date()),
        recipient: 'הנהלת מינהל הנדסה',
        subject: `דו״ח סטטוס מערכת – התחדשות עירונית אשדוד (${formatDate(new Date())})`,
        projectsLine: '',
        participantsMunicipality: '',
        participantsProjects: '',
        body: '',
        decisions: '',
        actionItems: [newActionItem()],
        signature: 'יוהאן אבוחצירה – מנהל פרויקטים, התחדשות עירונית',
        copies: '',
        showLogo1: true,
        showLogo2: true,
        documentType: 'system_status',
        bodyLabel: 'תמונת מצב מערכתית',
        decisionsLabel: 'נקודות להעלאה להנהלה',
        actionItemsLabel: 'פעולות מערכתיות הבאות',
        hideParticipants: true,
        ...override,
      };
    }

    if (docType === 'tama_site') {
      return {
        date: formatDate(new Date()),
        recipient: 'מאן דבעי',
        subject: `דו״ח אתר תמ״א בביצוע – ${project?.site_address || ''}`,
        projectsLine: '',
        participantsMunicipality: '',
        participantsProjects: '',
        body: '',
        decisions: '',
        actionItems: [newActionItem()],
        signature: 'יוהאן אבוחצירה – מנהל פרויקטים, התחדשות עירונית',
        copies: '',
        showLogo1: true,
        showLogo2: true,
        documentType: 'tama_site',
        bodyLabel: 'פרטי האתר וסטטוס ביצוע',
        decisionsLabel: 'ממצאי ביקורת והערות',
        actionItemsLabel: 'נקודות מעקב ופעולה',
        hideParticipants: true,
        ...override,
      };
    }

    return {
      date: formatDate(new Date()),
      recipient: 'מאן דבעי',
      subject: `סיכום פגישה לעניין קידום תכנית בינוי – ${project?.project_name || ''}`,
      projectsLine: project?.plan_number ? `${project.project_name} – תכנית מס׳ ${project.plan_number}` : (project?.project_name || ''),
      participantsMunicipality: 'יוהאן אבוחצירה – מנהל פרויקטים\nאסי ידידיה – מנהל תחום תכנון',
      participantsProjects: project?.developer ? `${project.developer} – יזם` : '',
      body: 'הישיבה נערכה לצורך תיאום וקידום עבודת התכנון למתחם שבנדון.',
      decisions: '(1) ייקבע מתווה התקדמות לתכנית הבינוי.\n(2) תתואם פגישת המשך עם צוות התכנון.',
      actionItems: [newActionItem()],
      signature: 'יוהאן אבוחצירה – מנהל פרויקטים, התחדשות עירונית',
      copies: 'אדר׳ איאד יוסף בלעום – מהנדס העיר\nעו"ד ליאור לוי – ראש המינהלת\nאדר׳ ענת דוד שטיבלמן – אדריכלית העיר',
      showLogo1: true,
      showLogo2: true,
      documentType: 'meeting',
      bodyLabel: 'מהלך הישיבה',
      decisionsLabel: 'החלטות וסיכומים',
      actionItemsLabel: 'משימות לביצוע',
      hideParticipants: false,
      ...override,
    };
  };

  const initialDraft = useMemo<MeetingDocumentDraft>(() => buildInitialDraft(draftOverride), [project, draftOverride]);

  const [draft, setDraft] = useState<MeetingDocumentDraft>(initialDraft);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [exporting, setExporting] = useState(false);

  // Apply override (e.g. from "הכן אותי לישיבה") when dialog opens
  useEffect(() => {
    if (open) {
      setDraft(buildInitialDraft(draftOverride));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftOverride]);

  const update = <K extends keyof MeetingDocumentDraft>(key: K, value: MeetingDocumentDraft[K]) =>
    setDraft(d => ({ ...d, [key]: value }));

  const updateAction = (id: string, patch: Partial<ActionItem>) =>
    setDraft(d => ({ ...d, actionItems: d.actionItems.map(a => a.id === id ? { ...a, ...patch } : a) }));

  const addAction = () => setDraft(d => ({ ...d, actionItems: [...d.actionItems, newActionItem()] }));
  const removeAction = (id: string) => setDraft(d => ({ ...d, actionItems: d.actionItems.filter(a => a.id !== id) }));

  const handleExportPdf = async () => {
    setTab('preview');
    setExporting(true);
    // wait next paint
    await new Promise(r => setTimeout(r, 150));
    if (!previewRef.current) {
      setExporting(false);
      return;
    }
    try {
      await exportFormalDocPdfFromElement(previewRef.current, `${draft.subject || 'document'}.pdf`);
      toast({ title: 'PDF נוצר ✓' });
    } catch (e: any) {
      toast({ title: 'שגיאה בייצוא PDF', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      await exportFormalDocDocx(draft, `${draft.subject || 'document'}.docx`);
      toast({ title: 'מסמך Word נוצר ✓' });
    } catch (e: any) {
      toast({ title: 'שגיאה בייצוא Word', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0" dir="rtl">
        <DialogHeader className="p-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            יצירת מסמך רשמי – סיכום פגישה
          </DialogTitle>
          <p className="text-sm text-muted-foreground">צור טיוטה, ערוך, צפה בתצוגה מקדימה ואז ייצא ל-PDF או Word</p>
        </DialogHeader>

        {/* Branding controls */}
        <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Switch checked={draft.showLogo1} onCheckedChange={v => update('showLogo1', v)} id="logo1" />
            <Label htmlFor="logo1" className="cursor-pointer">לוגו עיריית אשדוד</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={draft.showLogo2} onCheckedChange={v => update('showLogo2', v)} id="logo2" />
            <Label htmlFor="logo2" className="cursor-pointer">לוגו התחדשות אשדוד</Label>
          </div>
          <div className="text-xs text-muted-foreground mr-auto">
            מצב: <span className="font-semibold text-foreground">
              {draft.showLogo1 || draft.showLogo2 ? 'רשמי (עם לוגואים)' : 'נקי (ללא לוגואים)'}
            </span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-6 mt-3 self-start">
            <TabsTrigger value="edit" className="gap-2"><Pencil className="h-3.5 w-3.5" />עריכה</TabsTrigger>
            <TabsTrigger value="preview" className="gap-2"><Eye className="h-3.5 w-3.5" />תצוגה מקדימה</TabsTrigger>
          </TabsList>

          {/* ─── EDIT TAB ─── */}
          <TabsContent value="edit" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 m-0">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך</Label>
                <Input value={draft.date} onChange={e => update('date', e.target.value)} />
              </div>
              <div>
                <Label>לכבוד</Label>
                <Input value={draft.recipient} onChange={e => update('recipient', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>הנדון</Label>
              <Textarea rows={2} value={draft.subject} onChange={e => update('subject', e.target.value)} />
            </div>
            <div>
              <Label>שמות פרויקטים / מספרי תכנית</Label>
              <Input value={draft.projectsLine} onChange={e => update('projectsLine', e.target.value)} />
            </div>

            {!draft.hideParticipants && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>משתתפים מטעם העירייה (שורה לכל משתתף)</Label>
                  <Textarea rows={4} value={draft.participantsMunicipality} onChange={e => update('participantsMunicipality', e.target.value)} />
                </div>
                <div>
                  <Label>משתתפים מטעם הפרויקטים</Label>
                  <Textarea rows={4} value={draft.participantsProjects} onChange={e => update('participantsProjects', e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label>{draft.bodyLabel || 'מהלך הישיבה'}</Label>
              <Textarea rows={6} value={draft.body} onChange={e => update('body', e.target.value)} />
            </div>
            <div>
              <Label>{draft.decisionsLabel || 'החלטות וסיכומים'}</Label>
              <Textarea rows={4} value={draft.decisions} onChange={e => update('decisions', e.target.value)} />
            </div>

            {/* Action items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{draft.actionItemsLabel || 'משימות לביצוע'}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addAction} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />הוסף משימה
                </Button>
              </div>
              <div className="space-y-2">
                {draft.actionItems.map((a, i) => (
                  <div key={a.id} className="grid grid-cols-[28px_1fr_180px_180px_36px] gap-2 items-center">
                    <span className="text-sm text-muted-foreground text-center">{i + 1}</span>
                    <Input placeholder="משימה" value={a.task} onChange={e => updateAction(a.id, { task: e.target.value })} />
                    <Input placeholder="אחראי" value={a.owner} onChange={e => updateAction(a.id, { owner: e.target.value })} />
                    <Input placeholder="יעד" value={a.due} onChange={e => updateAction(a.id, { due: e.target.value })} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeAction(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>חתימה</Label>
                <Textarea rows={3} value={draft.signature} onChange={e => update('signature', e.target.value)} />
              </div>
              <div>
                <Label>העתקים</Label>
                <Textarea rows={3} value={draft.copies} onChange={e => update('copies', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* ─── PREVIEW TAB ─── */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto px-6 py-4 m-0 bg-muted/30">
            <div ref={previewRef} className="bg-white mx-auto p-14 shadow-md max-w-[800px] text-black" dir="rtl" style={{ fontFamily: '"David", "Times New Roman", serif', minHeight: '1100px', lineHeight: 1.55 }}>
              {/* Letterhead — optical balance: equal HEIGHT, width proportional to aspect ratio */}
              {(draft.showLogo1 || draft.showLogo2) && (
                <>
                  <div className="flex items-end justify-between mb-3" style={{ minHeight: '94px' }}>
                    <div className="flex items-end" style={{ height: '94px' }}>
                      {draft.showLogo2 && (
                        <img
                          src={LETTERHEAD_LOGOS.logo2}
                          alt="התחדשות אשדוד"
                          crossOrigin="anonymous"
                          style={{ height: '83px', width: 'auto', objectFit: 'contain', display: 'block' }}
                        />
                      )}
                    </div>
                    <div className="flex items-end" style={{ height: '94px' }}>
                      {draft.showLogo1 && (
                        <img
                          src={LETTERHEAD_LOGOS.logo1}
                          alt="עיריית אשדוד"
                          crossOrigin="anonymous"
                          style={{ height: '88px', width: 'auto', objectFit: 'contain', display: 'block' }}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ borderTop: '1.5px solid #1f3a5f', marginBottom: '18px' }} />
                </>
              )}

              <div className="text-left" style={{ fontSize: '13px', color: '#444', marginBottom: '14px' }}>{draft.date}</div>
              <div style={{ fontSize: '15px', marginBottom: '4px' }}>לכבוד: <span style={{ fontWeight: 600 }}>{draft.recipient}</span></div>
              <div style={{ fontSize: '15px', marginBottom: '14px' }}>שלום רב,</div>

              {/* Subject — formal, prominent */}
              <div
                className="mb-5"
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '10px 0',
                  borderTop: '1px solid #1f3a5f',
                  borderBottom: '1px solid #1f3a5f',
                  letterSpacing: '0.2px',
                }}
              >
                הנדון: {draft.subject}
              </div>
              {draft.projectsLine && <div className="mb-6" style={{ fontWeight: 600, textAlign: 'center', fontSize: '14px' }}>{draft.projectsLine}</div>}

              {!draft.hideParticipants && draft.participantsMunicipality.trim() && (
                <div className="mb-4">
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1f3a5f', marginBottom: '4px' }}>משתתפים מטעם העירייה:</div>
                  {draft.participantsMunicipality.split('\n').filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
              {!draft.hideParticipants && draft.participantsProjects.trim() && (
                <div className="mb-4">
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1f3a5f', marginBottom: '4px' }}>משתתפים מטעם הפרויקטים:</div>
                  {draft.participantsProjects.split('\n').filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}

              {draft.body.trim() && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1f3a5f', marginTop: '18px', marginBottom: '6px' }}>{(draft.bodyLabel || 'מהלך הישיבה')}:</div>
                  {draft.body.split('\n').filter(Boolean).map((l, i) => <div key={i} className="mb-1" style={{ textAlign: 'justify' }}>{l}</div>)}
                </>
              )}

              {draft.decisions.trim() && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1f3a5f', marginTop: '18px', marginBottom: '6px' }}>{(draft.decisionsLabel || 'החלטות וסיכומים')}:</div>
                  {draft.decisions.split('\n').filter(Boolean).map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                </>
              )}

              {draft.actionItems.some(a => a.task.trim()) && (
                <>
                  <div className="font-bold mt-4 mb-2">{(draft.actionItemsLabel || 'משימות לביצוע')}:</div>
                  <table className="w-full border-collapse text-sm mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-1 text-right w-12">מס׳</th>
                        <th className="border border-gray-400 p-1 text-right">משימה</th>
                        <th className="border border-gray-400 p-1 text-right w-40">אחראי</th>
                        <th className="border border-gray-400 p-1 text-right w-40">יעד</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.actionItems.filter(a => a.task.trim()).map((a, i) => (
                        <tr key={a.id}>
                          <td className="border border-gray-400 p-1 text-center">{i + 1}</td>
                          <td className="border border-gray-400 p-1">{a.task}</td>
                          <td className="border border-gray-400 p-1">{a.owner}</td>
                          <td className="border border-gray-400 p-1">{a.due}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <div style={{ marginTop: '32px', fontSize: '15px' }}>בברכה,</div>
              <div style={{ marginTop: '6px', lineHeight: 1.5 }}>
                {draft.signature.split('\n').filter(Boolean).map((l, i) => (
                  <div key={i} style={{ fontWeight: i === 0 ? 700 : 500, fontSize: i === 0 ? '14.5px' : '13.5px', color: i === 0 ? '#1f3a5f' : '#333' }}>{l}</div>
                ))}
              </div>

              {draft.copies.trim() && (
                <div style={{ marginTop: '28px', paddingTop: '10px', borderTop: '1px solid #c9d3e0' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1f3a5f', marginBottom: '4px', letterSpacing: '0.3px' }}>העתקים:</div>
                  {draft.copies.split('\n').filter(Boolean).map((l, i) => (
                    <div key={i} style={{ fontSize: '12.5px', color: '#444', lineHeight: 1.55 }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t p-4 flex items-center justify-between gap-3 bg-background">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>סגור</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportDocx} disabled={exporting} className="gap-2">
              <FileType className="h-4 w-4" />ייצוא Word
            </Button>
            <Button onClick={handleExportPdf} disabled={exporting} className="gap-2">
              <FileText className="h-4 w-4" />ייצוא PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
