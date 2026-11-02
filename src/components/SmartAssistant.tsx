import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Sparkles, Send, Loader2, FileText, Mail, ClipboardList, Copy, FileSignature, Presentation, Target, AlertTriangle, Activity, ArrowLeft, Paperclip, X, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { useTamaSites } from '@/hooks/useTamaSites';
import { formatDate } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { containsList, exportYohanPdf, exportYohanDocx } from '@/lib/yohanExport';

type MsgKind = 'summary' | 'email' | 'generic' | 'system_summary' | 'system_exceptions' | 'mgmt_update' | 'briefing' | 'document_draft' | 'iplan_docs';
type Attachment = { name: string; mimeType: string; dataBase64: string; previewUrl?: string };
type IplanDoc = { name: string; type: string; url: string };
type Msg = { role: 'user' | 'assistant'; content: string; kind?: MsgKind; attachments?: Attachment[]; iplanDocs?: IplanDoc[] };

export default function SmartAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Conversations are isolated per context key (screen + entity id)
  const [conversations, setConversations] = useState<Record<string, Msg[]>>({});
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const projectMatch = useMatch('/project/:id');
  const tamaSiteMatch = useMatch('/tama/:id');
  const { projects } = useProjects();
  const { sites: tamaSites } = useTamaSites();
  const { toast } = useToast();

  const screenContext = useMemo(() => {
    const path = location.pathname;
    let screen: string = 'unknown';
    let entityId: string | null = null;
    let entity: Record<string, any> | null = null;

    if (path === '/') {
      screen = 'dashboard';
    } else if (path.startsWith('/projects')) {
      screen = 'projects_list';
    } else if (projectMatch?.params.id) {
      screen = 'project_detail';
      entityId = projectMatch.params.id;
      const p = projects.find((x) => x.id === projectMatch.params.id);
      if (p) {
        entity = {
          project_id: p.id,
          project_name: p.project_name,
          plan_number: p.plan_number ?? null,
          quarter: p.quarter ?? null,
          main_stage: p.main_stage ?? null,
          management_status: p.management_status ?? null,
          units_in: p.units_in ?? null,
          units_out: p.units_out ?? null,
          multiplier: p.multiplier ?? null,
          main_blocker: p.main_blocker ?? null,
          next_action: p.next_action ?? null,
          next_action_owner: p.next_action_owner ?? null,
          next_action_due_date: p.next_action_due_date ?? null,
          risk_level: p.risk_level ?? null,
          developer: p.developer ?? null,
          plan_submitter: p.plan_submitter ?? null,
          last_update: p.last_update ?? null,
          sub_stage: p.sub_stage ?? null,
        };
      } else {
        entity = {
          project_id: projectMatch.params.id,
          project_name: null,
          plan_number: null,
        };
      }
    } else if (path === '/tama') {
      screen = 'tama_list';
    } else if (tamaSiteMatch?.params.id) {
      screen = 'tama_site_detail';
      entityId = tamaSiteMatch.params.id;
      const s = tamaSites.find((x) => x.id === tamaSiteMatch.params.id);
      if (s) {
        entity = {
          tama_site_id: s.id,
          site_address: s.site_address,
          building_number: s.building_number ?? null,
          review_status: s.review_status ?? null,
        };
      } else {
        entity = { tama_site_id: tamaSiteMatch.params.id };
      }
    } else {
      screen = path;
    }

    return { screen, path, entityId, entity };
  }, [location.pathname, projectMatch?.params.id, tamaSiteMatch?.params.id, projects, tamaSites]);

  // Stable key isolating conversation per screen+entity
  const conversationKey = useMemo(() => {
    return screenContext.entityId
      ? `${screenContext.screen}:${screenContext.entityId}`
      : screenContext.screen;
  }, [screenContext]);

  const messages = conversations[conversationKey] ?? [];

  // When the conversation key changes while the sheet is open, the displayed
  // history will switch automatically (messages is derived from conversationKey).
  useEffect(() => {
    // Reset draft input when switching contexts to avoid sending a question
    // intended for a different screen.
    setInput('');
  }, [conversationKey]);

  // Allow other parts of the app (e.g. the project top-action bar) to open Yohan AI
  // and optionally trigger a quick action: 'summary' | 'briefing' | 'document'
  const pendingActionRef = useRef<null | 'summary' | 'briefing' | 'document'>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      setOpen(true);
      const detail = (e as CustomEvent).detail;
      const action = detail?.action;
      if (action === 'summary' || action === 'briefing' || action === 'document') {
        pendingActionRef.current = action;
      }
    };
    window.addEventListener('open-yohan-ai', handler);
    return () => window.removeEventListener('open-yohan-ai', handler);
  }, []);

  const sendText = async (
    text: string,
    replyKind: MsgKind = 'generic',
    attachments?: Attachment[],
    apiPrompt?: string,
  ) => {
    if ((!text && !attachments?.length) || loading) return;
    const keyAtSend = conversationKey;
    const current = conversations[keyAtSend] ?? [];
    const userMsg: Msg = { role: 'user', content: text, attachments };
    const next: Msg[] = [...current, userMsg];
    // What we send to the AI may differ from what we display in the UI
    // (action buttons send a detailed instruction prompt while showing a clean Hebrew label).
    const apiMessages: Msg[] = apiPrompt
      ? [...current, { role: 'user', content: apiPrompt, attachments }]
      : next;
    setConversations((c) => ({ ...c, [keyAtSend]: next }));
    setInput('');
    setPendingAttachment(null);
    setLoading(true);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 35000),
    );
    try {
      const invokePromise = supabase.functions.invoke('assistant-chat', {
        body: { messages: apiMessages, screenContext },
      });
      const { data, error } = (await Promise.race([
        invokePromise,
        timeoutPromise,
      ])) as Awaited<typeof invokePromise>;

      // If supabase-js flagged a non-2xx (rare now, since the edge function
      // always returns 200 with a structured fallback), don't surface the raw
      // infrastructure error — show a clean Hebrew message. For 'summary' the
      // post-processor will replace it with a local synthesized summary.
      let reply: string;
      if (error) {
        reply =
          replyKind === 'summary'
            ? 'מציג סיכום מקומי על בסיס הנתונים הקיימים.'
            : 'השירות עמוס כרגע. נסה שוב בעוד רגע.';
      } else {
        reply =
          (data as any)?.reply ??
          (data as any)?.error ??
          'לא התקבלה תשובה מהעוזר. נסה לנסח מחדש.';
      }
      setConversations((c) => ({
        ...c,
        [keyAtSend]: [...(c[keyAtSend] ?? next), { role: 'assistant', content: reply, kind: replyKind }],
      }));
    } catch (e: any) {
      const msg =
        e?.message === 'timeout'
          ? 'הבקשה לקחה יותר מדי זמן ובוטלה. נסה שוב או נסח מחדש את השאלה.'
          : replyKind === 'summary'
            ? 'מציג סיכום מקומי על בסיס הנתונים הקיימים.'
            : `שגיאה: ${e?.message ?? 'תקלה לא ידועה'}`;
      setConversations((c) => ({
        ...c,
        [keyAtSend]: [
          ...(c[keyAtSend] ?? next),
          { role: 'assistant', content: msg, kind: replyKind },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    const att = pendingAttachment;
    if (!text && !att) return;
    await sendText(text || 'נא לנתח את הקובץ המצורף.', 'generic', att ? [att] : undefined);
  };

  const handleFilePick = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'הקובץ גדול מדי', description: 'מקסימום 10MB', variant: 'destructive' });
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'סוג קובץ לא נתמך', description: 'רק JPG, PNG, PDF', variant: 'destructive' });
      return;
    }
    const buf = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const dataBase64 = btoa(binary);
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setPendingAttachment({ name: file.name, mimeType: file.type, dataBase64, previewUrl });
  };

  // Build a minimal local fallback summary from current entity context
  const buildLocalSummary = (): string => {
    const e = screenContext.entity || {};
    const name = e.project_name || 'פרויקט נוכחי';
    const lines: string[] = [];
    lines.push(`סיכום ניהולי – ${name}`);
    lines.push('');
    lines.push('סטטוס נוכחי:');
    lines.push(`• שלב: ${e.main_stage || 'לא צוין'}`);
    lines.push(`• סטטוס ניהול: ${e.management_status || 'לא צוין'}`);
    lines.push('');
    lines.push('מדדי ליבה:');
    lines.push(`• דירות קיימות: ${e.units_in ?? 'לא צוין'}`);
    lines.push(`• דירות מתוכננות: ${e.units_out ?? 'לא צוין'}`);
    lines.push(`• מכפיל: ${e.multiplier ?? 'לא צוין'}`);
    if (e.units_out) lines.push(`• פוטנציאל הכנסה מהיתרים: ${(Number(e.units_out) * 25000).toLocaleString('he-IL')} ₪`);
    lines.push('');
    lines.push(`חסם עיקרי: ${e.main_blocker || 'לא דווח חסם'}`);
    lines.push(`פעולה הבאה: ${e.next_action || 'לא הוגדרה פעולה הבאה'}`);
    lines.push('');
    lines.push('נקודות תשומת לב: בדוק שדות חסרים בכרטיס הפרויקט להשלמת התמונה הניהולית.');
    return lines.join('\n');
  };

  // Fetch fresh project data (and addresses) for action prompts so the AI has real values to fill in.
  const fetchProjectDataBlock = async (projectId: string): Promise<string> => {
    try {
      const [{ data: p }, { data: addrs }, { data: reviews }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('project_addresses').select('street_name,building_numbers').eq('project_id', projectId),
        supabase.from('forum2_reviews').select('reviewer_name,status,note').eq('project_id', projectId),
      ]);
      if (!p) return '';
      const addressLine = (addrs ?? [])
        .map((a: any) => `${a.street_name}${a.building_numbers?.length ? ' ' + a.building_numbers.join(', ') : ''}`)
        .filter(Boolean)
        .join(', ');
      const unitsIn = p.units_in ?? 0;
      const unitsOut = p.units_out ?? 0;
      const potential = unitsOut > 0 ? `₪${(unitsOut * 25000 / 1_000_000).toFixed(1)}M` : 'לא ידוע';
      const reviewerStatusMap: Record<string, string> = {
        not_sent: 'טרם נשלח',
        sent: 'נשלח',
        approved: 'אושר',
        rejected: 'נדחה',
      };
      const activeReviewers = (reviews ?? []).filter((r: any) => (r.status || 'not_sent') !== 'not_sent');
      const reviewersLine = activeReviewers.length
        ? activeReviewers
            .map((r: any) => `${r.reviewer_name || 'יועץ'} – ${reviewerStatusMap[r.status] || r.status}${r.note ? ` (${r.note})` : ''}`)
            .join(', ')
        : 'יועצים טרם הופעלו';
      const lines = [
        `שם פרויקט: ${p.project_name || 'לא ידוע'}`,
        `מס׳ תכנית: ${p.plan_number || 'לא ידוע'}`,
        `רובע: ${p.quarter || 'לא ידוע'}`,
        `כתובת/ות: ${addressLine || 'לא תועדה'}`,
        `יזם: ${p.developer || 'לא ידוע'}`,
        `מגיש התכנית: ${p.plan_submitter || 'לא ידוע'}`,
        `שלב נוכחי (main_stage): ${p.main_stage || 'לא ידוע'}${p.sub_stage ? ` / ${p.sub_stage}` : ''}`,
        `סטטוס ניהולי: ${p.management_status || 'לא ידוע'}`,
        `רמת סיכון: ${p.risk_level || 'לא ידוע'}`,
        `יח״ד נכנסות: ${unitsIn}`,
        `יח״ד יוצאות: ${unitsOut}`,
        `מכפיל: ${p.multiplier ?? 0}`,
        `פוטנציאל היטלים: ${potential}`,
        `חסם עיקרי: ${p.main_blocker || 'אין'}`,
        `פעולה הבאה: ${p.next_action || 'לא הוגדרה'}${p.next_action_owner ? ` (אחראי: ${p.next_action_owner})` : ''}${p.next_action_due_date ? ` עד ${p.next_action_due_date}` : ''}`,
        `סטטוס יועצים (Forum 2): ${reviewersLine}`,
        `הערות: ${p.notes || 'אין'}`,
      ];
      return `נתוני הפרויקט (מקור אמת מהמערכת – להשתמש בהם בלבד):\n${lines.join('\n')}`;
    } catch (e) {
      console.error('fetchProjectDataBlock failed', e);
      return '';
    }
  };

  // Quick action: managerial summary of current project
  const handleSummary = async () => {
    if (loading) return;
    const projectId = screenContext.entityId;
    const dataBlock = projectId ? await fetchProjectDataBlock(projectId) : '';
    const apiPrompt =
      `${dataBlock}\n\nאתה כותב סיכום ניהולי לראש מינהל הנדסה בעיריית אשדוד. השתמש אך ורק בנתונים שלמעלה. כללי כתיבה מחייבים:\n\n1) אסור להחזיר את ההוראות, אסור להחזיר את בלוק הנתונים, אסור JSON, אסור התו "|", אסור נקודה-פסיק (";") בין פריטים – השתמש בפסיק רגיל.\n2) אסור שייכתבו במענה ערכי אנום באנגלית או מפתחות פנימיים (לדוגמה "not_sent", "main_stage"). תרגם תמיד לעברית.\n3) תרגום סטטוסים של יועצים: not_sent="טרם נשלח", sent="נשלח", approved="אושר", rejected="נדחה".\n4) שורת "סטטוס יועצים": רשום רק יועצים שהסטטוס שלהם שונה מ"טרם נשלח". אם כל היועצים במצב "טרם נשלח" – כתוב בדיוק: "סטטוס יועצים: יועצים טרם הופעלו".\n5) "פעולה הבאה: לא הוגדרה" מותר כשאין ערך – השאר כך.\n6) "בקרת תכן" ו-"משימות פתוחות" – הצג שורה רק אם יש נתונים בפועל בנושא; אם אין, השמט את השורה לחלוטין (אל תכתוב "לא זמין").\n\nפורמט פלט (תבליטים בלבד, כל שורה מתחילה ב-"• "):\n\n• שלב נוכחי: ...\n• מדדי ליבה: יח״ד נכנסות / יוצאות / מכפיל / פוטנציאל ...\n• חסם עיקרי: ...\n• פעולה הבאה: ...\n• סטטוס יועצים: ...\n(• בקרת תכן: ...   ← רק אם יש מה לכתוב)\n(• משימות פתוחות: ...   ← רק אם יש מה לכתוב)`;
    await sendText('סכם את הפרויקט', 'summary', undefined, apiPrompt);
    // After response: if the assistant returned an empty/failure fallback, replace with a local synthesized summary
    setTimeout(() => {
      setConversations((c) => {
        const arr = c[conversationKey] ?? [];
        const last = arr[arr.length - 1];
        if (!last || last.role !== 'assistant' || last.kind !== 'summary') return c;
        const txt = (last.content || '').trim();
        const looksFailed =
          !txt ||
          txt.length < 40 ||
          txt.includes('לא הצלחתי לייצר תשובה') ||
          txt.includes('לא התקבלה תשובה') ||
          txt.includes('מציג סיכום מקומי') ||
          txt.includes('מציג מענה מקומי') ||
          txt.includes('השירות עמוס') ||
          txt.includes('חרגת ממכסת') ||
          txt.includes('Edge Function') ||
          txt.includes('non-2xx') ||
          txt.startsWith('{');
        if (!looksFailed) return c;
        const replaced = [...arr];
        replaced[replaced.length - 1] = { ...last, content: buildLocalSummary() };
        return { ...c, [conversationKey]: replaced };
      });
    }, 50);
  };

  // Convert any object-shaped email payload to a readable Hebrew email block
  const renderReadableEmail = (raw: string): string => {
    const txt = (raw || '').trim();
    // Try to extract the first JSON object inside the text
    let obj: any = null;
    if (txt.startsWith('{')) {
      try { obj = JSON.parse(txt); } catch { /* ignore */ }
    }
    if (!obj) {
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) { try { obj = JSON.parse(m[0]); } catch { /* ignore */ } }
    }
    if (obj && typeof obj === 'object') {
      const subject = obj.subject || obj.נושא || '';
      const opening = obj.opening || obj.פתיחה || '';
      const body = obj.body || obj.גוף || '';
      const request = obj.request || obj.action || obj['בקשה'] || obj['פעולה נדרשת'] || '';
      const closing = obj.closing || obj.סגירה || obj.signature || '';
      const out: string[] = [];
      if (subject) out.push(`נושא: ${subject}`);
      if (opening) out.push(`פתיחה:\n${opening}`);
      if (body) out.push(`גוף:\n${body}`);
      if (request) out.push(`בקשה / פעולה נדרשת:\n${request}`);
      if (closing) out.push(`סגירה:\n${closing}`);
      if (out.length) return out.join('\n\n');
    }
    return txt;
  };

  // Quick action: email/message draft about current project
  const handleEmail = async () => {
    if (loading) return;
    const prompt =
      'נסח טיוטת מייל ליזם הפרויקט עם עדכון סטטוס. חובה: לא להשתמש בכלים (tools), לא להחזיר JSON, לא לעטוף בקוד. החזר טקסט בעברית בלבד, קריא ומוכן להעתקה, במבנה הבא בדיוק (כל כותרת בשורה נפרדת):\n\nנושא: ...\nפתיחה: ...\nגוף: ...\nבקשה / פעולה נדרשת: ...\nסגירה: ...\n\nהשתמש בנתוני הפרויקט הנוכחי בלבד. אל תשלח — רק טיוטה.';
    await sendText(prompt, 'email');
    // Post-process: if reply came back as JSON, rewrite to readable text
    setTimeout(() => {
      setConversations((c) => {
        const arr = c[conversationKey] ?? [];
        const last = arr[arr.length - 1];
        if (!last || last.role !== 'assistant' || last.kind !== 'email') return c;
        const readable = renderReadableEmail(last.content);
        if (readable === last.content) return c;
        const replaced = [...arr];
        replaced[replaced.length - 1] = { ...last, content: readable };
        return { ...c, [conversationKey]: replaced };
      });
    }, 50);
  };

  // ─── Dashboard quick actions ───
  const handleSystemSummary = () => {
    if (loading) return;
    sendText(
      'הכן סיכום ניהולי של מצב המערכת כולה (דשבורד), המבוסס אך ורק על נתוני ה-DB האמיתיים: מספר פרויקטים פעילים, סך דירות קיימות מול מתוכננות, מכפיל ממוצע, פוטנציאל הכנסה מהיתרים (לפי 25,000 ₪ ליח״ד מתוכננת), פרויקטים עם חסמים, פרויקטים בסיכון בינוני/גבוה, פעולות שעבר תאריך היעד, פעולות עם יעד קרוב, פרויקטים תקועים/מושהים, ונקודות תשומת לב ניהוליות עיקריות. כתוב בעברית, מובנה ותמציתי.',
      'system_summary',
    );
  };

  const handleSystemExceptions = () => {
    if (loading) return;
    sendText(
      'זהה והצג רשימה תמציתית של חריגים הדורשים תשומת לב מיידית במערכת, על בסיס נתוני ה-DB בלבד: פרויקטים עם חסם פעיל, פרויקטים בסיכון גבוה, פעולות הבאות שעבר תאריך היעד, פרויקטים תקועים/מושהים, ופרויקטים ללא עדכון מעל שבוע. עבור כל חריג ציין את שם הפרויקט, סיבת החריגה, והפעולה הבאה הנדרשת. הצג כרשימה ממוספרת קצרה וברורה.',
      'system_exceptions',
    );
  };

  const handleManagementUpdate = () => {
    if (loading) return;
    sendText(
      'נסח עדכון ניהולי כתוב להנהלה הבכירה על מצב פעילות ההתחדשות העירונית באשדוד, בפורמט הבא בדיוק (כותרות בעברית בשורה נפרדת):\nנושא: ...\nתקציר מנהלים: ...\nמדדי ליבה: ...\nהישגים בתקופה: ...\nחסמים ופעולות נדרשות: ...\nצעדים הבאים: ...\nהשתמש בנתוני ה-DB האמיתיים בלבד. אין להמציא מספרים. אין שיחה — רק טיוטה רשמית מוכנה להעברה.',
      'mgmt_update',
    );
  };

  const handleStuckProjects = async () => {
    if (loading) return;
    await sendText('אילו פרויקטים תקועים או מושהים כרגע? פרט לכל אחד מה הסיבה ומה הפעולה המומלצת לביטול העיכוב.', 'generic');
  };

  // ─── Project detail extra actions ───
  const handleForumReadiness = async () => {
    if (loading) return;
    const p: any = screenContext.entity;
    const prompt = `נתח את מוכנות הפרויקט "${p?.project_name}" לפורום הבא.
שלב נוכחי: ${p?.main_stage || 'לא ידוע'}.
סטטוס ניהולי: ${p?.management_status || 'לא הוגדר'}.
חסם מרכזי: ${p?.main_blocker || 'אין'}.
פעולה הבאה: ${p?.next_action || 'לא הוגדרה'}.
ענה בפורמט:
✅ מה מוכן
⚠️ מה חסר / מה מסכן
🎯 המלצה — האם להתקדם לפורום או לעצור`;
    await sendText(prompt, 'generic');
  };

  const handleIdentifyBlockers = async () => {
    if (loading) return;
    const p: any = screenContext.entity;
    const prompt = `זהה ונתח את החסמים הפעילים בפרויקט "${p?.project_name}".
שלב: ${p?.main_stage || 'לא ידוע'}.
חסם מרכזי רשום: ${p?.main_blocker || 'לא רשום'}.
פעולה הבאה: ${p?.next_action || 'לא הוגדרה'}.
אחראי: ${p?.next_action_owner || 'לא הוגדר'}.
ענה בפורמט:
🔴 חסמים קריטיים
🟡 סיכונים פוטנציאליים  
🔧 פעולות נדרשות לפתרון`;
    await sendText(prompt, 'generic');
  };

  const handlePrepCommittee = async () => {
    if (loading) return;
    const p: any = screenContext.entity;
    const prompt = `הכן תדריך קצר לוועדה עבור פרויקט "${p?.project_name}".
מספר תכנית: ${p?.plan_number || 'לא ידוע'}.
שלב: ${p?.main_stage || 'לא ידוע'}.
דירות קיימות: ${p?.units_in || 'לא ידוע'}, מתוכננות: ${p?.units_out || 'לא ידוע'}.
מכפיל: ${p?.multiplier || 'לא ידוע'}.
חסם: ${p?.main_blocker || 'אין'}.
הכן מסמך קצר הכולל:
📋 תקציר מנהלים (3 שורות)
🏗️ עיקרי הפרויקט
✅ המלצה לוועדה`;
    await sendText(prompt, 'generic');
  };

  const openMgmtUpdateAsFormalDoc = (text: string) => {
    const draft: any = {
      documentType: 'system_status',
      subject: 'עדכון ניהולי – מצב מערכת ההתחדשות העירונית',
      projectsLine: 'התחדשות עירונית – אשדוד',
      body: text,
      decisions: '',
      actionItems: [{ id: crypto.randomUUID(), task: '', owner: '', due: '' }],
      hideParticipants: true,
    };
    window.dispatchEvent(
      new CustomEvent('open-dashboard-formal-document', { detail: { draft } }),
    );
    setOpen(false);
  };

  // Quick action: open FormalDocumentEditor pre-filled with this project's data
  const handleFormalDocument = async () => {
    if (loading) return;
    const projectId = screenContext.entityId;
    if (screenContext.screen !== 'project_detail' || !projectId) return;

    setLoading(true);
    try {
      const { data: p, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      if (!p) throw new Error('project_not_found');

      const lines: string[] = [];
      lines.push(`שם הפרויקט: ${p.project_name}`);
      if (p.plan_number) lines.push(`מס׳ תכנית: ${p.plan_number}`);
      if (p.quarter) lines.push(`רובע: ${p.quarter}`);
      if (p.developer) lines.push(`יזם: ${p.developer}`);
      if (p.plan_submitter) lines.push(`מגיש התכנית: ${p.plan_submitter}`);
      if (p.units_in != null) lines.push(`דירות קיימות: ${p.units_in}`);
      if (p.units_out != null) lines.push(`דירות מתוכננות: ${p.units_out}`);
      if (p.multiplier != null) lines.push(`מכפיל: ${p.multiplier}`);
      if (p.main_stage) lines.push(`שלב נוכחי: ${p.main_stage}`);
      if (p.management_status) lines.push(`סטטוס ניהול: ${p.management_status}`);
      if (p.risk_level) lines.push(`רמת סיכון: ${p.risk_level}`);

      const decisionLines: string[] = [];
      if (p.main_blocker) decisionLines.push(`חסם עיקרי: ${p.main_blocker}`);
      if (p.next_action) decisionLines.push(`פעולה הבאה: ${p.next_action}`);

      const draft = {
        documentType: 'project_status' as const,
        subject: `סיכום מצב פרויקט – ${p.project_name}`,
        projectsLine: p.plan_number ? `${p.project_name} – תכנית מס׳ ${p.plan_number}` : p.project_name,
        body: lines.join('\n'),
        decisions: decisionLines.join('\n'),
        actionItems: p.next_action
          ? [{
              id: crypto.randomUUID(),
              task: p.next_action,
              owner: p.next_action_owner || '',
              due: p.next_action_due_date ? formatDate(new Date(p.next_action_due_date)) : '',
            }]
          : [{ id: crypto.randomUUID(), task: '', owner: '', due: '' }],
      };

      window.dispatchEvent(
        new CustomEvent('open-project-formal-document', {
          detail: { projectId, draft },
        }),
      );
      setOpen(false);
    } catch (e: any) {
      const msg = `שגיאה ביצירת מסמך רשמי: ${e?.message ?? 'תקלה לא ידועה'}`;
      const keyAtSend = conversationKey;
      setConversations((c) => ({
        ...c,
        [keyAtSend]: [...(c[keyAtSend] ?? []), { role: 'assistant', content: msg }],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleBriefing = async () => {
    if (loading) return;
    const projectId = screenContext.entityId;
    if (!projectId) return;
    const dataBlock = await fetchProjectDataBlock(projectId);
    const apiPrompt = `${dataBlock}\n\nהכן תדריך לישיבת ועדה על בסיס הנתונים שלמעלה בלבד. אם שדה ריק – ציין זאת במפורש במקום לכתוב "לא זמין". כלל קריטי לכתובת: סכם את הכתובת כשם רחוב + רובע בלבד (למשל: "רחוב המעפילים, רובע ב"). אסור לפרט מספרי בתים או רשימת מספרים מופרדים בפסיקים. הצג בעברית כרשימת תבליטים (כל סעיף מתחיל ב-"• ") במבנה הבא בדיוק, ללא תווי "|" וללא JSON וללא הזכרת שמות כלים פנימיים:\n\n• שם פרויקט, כתובת (רחוב + רובע בלבד), שלב נוכחי: ...\n• ההחלטה המרכזית הנדרשת: ...\n• חסם עיקרי: ...\n• פעולה מומלצת לוועדה: ...\n• נקודות פתוחות לשאלות: ...`;
    await sendText('הכן תדריך לישיבה', 'briefing', undefined, apiPrompt);
  };

  // Quick action: AI-generated formal document draft displayed inside the panel
  const handleDocumentDraft = async () => {
    if (loading) return;
    const projectId = screenContext.entityId;
    if (!projectId) return;
    const dataBlock = await fetchProjectDataBlock(projectId);
    const apiPrompt = `${dataBlock}\n\nהכן טיוטת מסמך רשמי על בסיס הנתונים שלמעלה בלבד. החזר טקסט בעברית בלבד, נקי ומוכן להעתקה, במבנה הבא בדיוק, ללא הסברים, ללא תווי "|", ללא JSON וללא הזכרת שמות כלים פנימיים:\n\nנושא: ...\nאל: ...\nמאת: ...\n\nגוף המסמך:\n• ...\n• ...\n\nהחלטות / סיכום:\n• ...\n\nפעולות נדרשות:\n• ...`;
    await sendText('טיוטת מסמך רשמי', 'document_draft', undefined, apiPrompt);
  };

  // Run a pending action queued by the open-yohan-ai event once the panel is open
  useEffect(() => {
    if (!open || loading) return;
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;
    if (action === 'summary') void handleSummary();
    else if (action === 'briefing') void handleBriefing();
    else if (action === 'document') void handleDocumentDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationKey]);

  // Copy any text to clipboard with toast feedback
  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} הועתק ללוח` });
    } catch {
      toast({ title: 'העתקה נכשלה', variant: 'destructive' });
    }
  };

  // Parse a structured email draft (key: value blocks in Hebrew) into parts
  const parseEmailDraft = (text: string) => {
    const grab = (label: string) => {
      const re = new RegExp(`^\\s*${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:נושא|פתיחה|גוף|בקשה(?:\\s*\\/\\s*פעולה(?:\\s*נדרשת)?)?|סגירה)\\s*:|$)`, 'm');
      const m = text.match(re);
      return m ? m[1].trim() : '';
    };
    return {
      subject: grab('נושא'),
      opening: grab('פתיחה'),
      body: grab('גוף'),
      request: grab('בקשה(?:\\s*\\/\\s*פעולה(?:\\s*נדרשת)?)?'),
      closing: grab('סגירה'),
    };
  };

  // Open formal document with the AI summary content as the body
  const openSummaryAsFormalDoc = async (summaryText: string) => {
    const projectId = screenContext.entityId;
    if (screenContext.screen !== 'project_detail' || !projectId) return;
    try {
      const { data: p } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      const projectName = p?.project_name ?? screenContext.entity?.project_name ?? 'פרויקט';
      const planNumber = p?.plan_number ?? screenContext.entity?.plan_number ?? null;

      const draft = {
        documentType: 'project_status' as const,
        subject: `סיכום ניהולי – ${projectName}`,
        projectsLine: planNumber ? `${projectName} – תכנית מס׳ ${planNumber}` : projectName,
        body: summaryText,
        decisions: p?.main_blocker ? `חסם עיקרי: ${p.main_blocker}` : '',
        actionItems: p?.next_action
          ? [{
              id: crypto.randomUUID(),
              task: p.next_action,
              owner: p.next_action_owner || '',
              due: p.next_action_due_date ? formatDate(new Date(p.next_action_due_date)) : '',
            }]
          : [{ id: crypto.randomUUID(), task: '', owner: '', due: '' }],
      };

      window.dispatchEvent(
        new CustomEvent('open-project-formal-document', { detail: { projectId, draft } }),
      );
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'שגיאה בפתיחת מסמך', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  // Open formal document as a "letter" using the parsed email draft
  const openEmailAsFormalLetter = async (emailText: string) => {
    const projectId = screenContext.entityId;
    if (screenContext.screen !== 'project_detail' || !projectId) return;
    try {
      const { data: p } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      const projectName = p?.project_name ?? screenContext.entity?.project_name ?? 'פרויקט';
      const planNumber = p?.plan_number ?? screenContext.entity?.plan_number ?? null;
      const parsed = parseEmailDraft(emailText);

      const bodyParts = [parsed.opening, parsed.body].filter(Boolean).join('\n\n') || emailText;
      const decisions = parsed.request || '';

      const draft = {
        documentType: 'project_status' as const,
        recipient: p?.developer ? `לכבוד ${p.developer}` : '',
        subject: parsed.subject || `עדכון סטטוס – ${projectName}`,
        projectsLine: planNumber ? `${projectName} – תכנית מס׳ ${planNumber}` : projectName,
        body: bodyParts,
        decisions,
        signature: parsed.closing || '',
        bodyLabel: 'תוכן המכתב',
        decisionsLabel: 'בקשה / פעולה נדרשת',
        hideParticipants: true,
        actionItems: [{ id: crypto.randomUUID(), task: '', owner: '', due: '' }],
      };

      window.dispatchEvent(
        new CustomEvent('open-project-formal-document', { detail: { projectId, draft } }),
      );
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'שגיאה בפתיחת מכתב', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  // Track which assistant messages had their PDF attachment saved to the project documents tab
  const [savedPdfIdx, setSavedPdfIdx] = useState<Record<string, true>>({});
  const [savingPdfIdx, setSavingPdfIdx] = useState<Record<string, true>>({});

  const detectPdfCategory = (fileName: string, assistantText: string): 'plan_instructions' | 'drawings' | 'renders' => {
    const hay = `${fileName} ${assistantText}`.toLowerCase();
    if (/תשריט|drawing|sheet/i.test(hay)) return 'drawings';
    if (/נספח|הדמי|render|appendix/i.test(hay)) return 'renders';
    return 'plan_instructions';
  };

  const categoryLabel: Record<string, string> = {
    plan_instructions: 'הוראות תוכנית',
    drawings: 'תשריט',
    renders: 'נספח',
  };

  const handleSavePdfToProject = async (msgIndex: number, attachment: Attachment, assistantText: string) => {
    const projectId = screenContext.entityId;
    if (!projectId) return;
    const key = `${conversationKey}:${msgIndex}`;
    setSavingPdfIdx((s) => ({ ...s, [key]: true }));
    try {
      const category = detectPdfCategory(attachment.name, assistantText);
      // base64 -> Blob
      const bin = atob(attachment.dataBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: attachment.mimeType || 'application/pdf' });
      const ext = attachment.name.includes('.') ? attachment.name.substring(attachment.name.lastIndexOf('.')) : '.pdf';
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const path = `${projectId}/${category}/${safeName}`;
      const { error: upErr } = await supabase.storage.from('project-assets').upload(path, blob, {
        contentType: attachment.mimeType || 'application/pdf',
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('project-assets').getPublicUrl(path);
      console.info('[SmartAssistant] project asset upload path', {
        fileName: attachment.name,
        storagePath: path,
        storedFilePath: urlData.publicUrl,
      });
      const { error: insErr } = await supabase.from('project_assets').insert({
        project_id: projectId,
        file_path: urlData.publicUrl,
        asset_type: category,
        description: attachment.name,
        source: 'yohan_ai',
        slide_number: null,
      });
      if (insErr) throw insErr;
      setSavedPdfIdx((s) => ({ ...s, [key]: true }));
      const okMsg: Msg = {
        role: 'assistant',
        content: `המסמך נשמר בלשונית המסמכים של הפרויקט תחת "${categoryLabel[category]}" ✓`,
        kind: 'generic',
      };
      setConversations((c) => ({
        ...c,
        [conversationKey]: [...(c[conversationKey] ?? []), okMsg],
      }));
      toast({ title: 'המסמך נשמר במסמכי הפרויקט' });
    } catch (e: any) {
      toast({ title: 'שמירה נכשלה', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setSavingPdfIdx((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
    }
  };

  // ── iplan documents ──
  const [savingDocKey, setSavingDocKey] = useState<Record<string, true>>({});
  const [savedDocKey, setSavedDocKey] = useState<Record<string, true>>({});

  const handleFetchIplanDocs = async () => {
    if (loading) return;
    const p: any = screenContext.entity;
    const planNumber = p?.plan_number;
    if (!planNumber) {
      toast({ title: 'אין מספר תכנית בפרויקט', variant: 'destructive' });
      return;
    }
    const keyAtSend = conversationKey;
    const userMsg: Msg = { role: 'user', content: `שלוף מסמכי תוכנית עבור ${planNumber}` };
    setConversations((c) => ({ ...c, [keyAtSend]: [...(c[keyAtSend] ?? []), userMsg] }));
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('iplan-documents', {
        body: { action: 'list', planNumber, projectId: screenContext.entityId },
      });
      if (error) throw error;
      const docs: IplanDoc[] = (data as any)?.documents ?? [];
      const reply: Msg = docs.length
        ? { role: 'assistant', content: `נמצאו ${docs.length} מסמכים עבור תכנית ${planNumber}:`, kind: 'iplan_docs', iplanDocs: docs }
        : { role: 'assistant', content: `לא נמצאו מסמכי תוכנית במאגר ה-iplan עבור ${planNumber}.`, kind: 'generic' };
      setConversations((c) => ({ ...c, [keyAtSend]: [...(c[keyAtSend] ?? []), reply] }));
    } catch (e: any) {
      setConversations((c) => ({
        ...c,
        [keyAtSend]: [...(c[keyAtSend] ?? []), { role: 'assistant', content: `שגיאה בשליפת מסמכי תוכנית: ${e?.message ?? ''}`, kind: 'generic' }],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIplanDoc = async (msgIndex: number, doc: IplanDoc) => {
    const projectId = screenContext.entityId;
    if (!projectId) return;
    const k = `${conversationKey}:${msgIndex}:${doc.url}`;
    setSavingDocKey((s) => ({ ...s, [k]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('iplan-documents', {
        body: { action: 'save', projectId, url: doc.url, name: doc.name, type: doc.type },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSavedDocKey((s) => ({ ...s, [k]: true }));
      toast({ title: 'המסמך נשמר במסמכי הפרויקט' });
    } catch (e: any) {
      toast({ title: 'שמירה נכשלה', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setSavingDocKey((s) => { const n = { ...s }; delete n[k]; return n; });
    }
  };

  const contextLabel = useMemo(() => {
    if (screenContext.screen === 'project_detail' && screenContext.entity?.project_name) {
      return `פרויקט: ${screenContext.entity.project_name}`;
    }
    if (screenContext.screen === 'tama_site_detail' && screenContext.entity?.site_address) {
      return `אתר תמ״א: ${screenContext.entity.site_address}`;
    }
    return screenContext.screen;
  }, [screenContext]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          aria-label="Yohan AI"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0" dir="rtl">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-right">
            <Sparkles className="h-5 w-5 text-primary" />
            Yohan AI
          </SheetTitle>
          <SheetDescription className="sr-only">
            Yohan AI — עוזר ניהולי לשאלות על המסך הנוכחי והישות הפעילה.
          </SheetDescription>
          <p className="text-xs text-muted-foreground text-right">
            הקשר נוכחי: {contextLabel}
          </p>
        </SheetHeader>

        {screenContext.screen === 'project_detail' && screenContext.entityId && (
          <div className="border-b p-3 flex flex-wrap gap-2 bg-muted/30">
            <Button size="sm" variant="outline" onClick={handleSummary} disabled={loading} className="gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" />
              סיכום ניהולי
            </Button>
            <Button size="sm" variant="outline" onClick={handleEmail} disabled={loading} className="gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" />
              טיוטת מייל
            </Button>
            <Button size="sm" variant="outline" onClick={handleFormalDocument} disabled={loading} className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              מסמך רשמי
            </Button>
            <Button size="sm" variant="outline" onClick={handleBriefing} disabled={loading} className="gap-1.5 text-xs">
              <Presentation className="h-3.5 w-3.5" />
              הכן לישיבה
            </Button>
            <Button size="sm" variant="outline" onClick={handleForumReadiness} disabled={loading} className="gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              מוכנות לפורום
            </Button>
            <Button size="sm" variant="outline" onClick={handleIdentifyBlockers} disabled={loading} className="gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              זהה חסמים
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrepCommittee} disabled={loading} className="gap-1.5 text-xs">
              <FileSignature className="h-3.5 w-3.5" />
              הכן לוועדה
            </Button>
          </div>
        )}

        {screenContext.screen === 'dashboard' && (
          <div className="border-b p-3 flex flex-wrap gap-2 bg-muted/30">
            <Button size="sm" variant="outline" onClick={handleSystemSummary} disabled={loading} className="gap-1.5 text-xs">
              <ClipboardList className="h-3.5 w-3.5" />
              סכם מצב מערכת
            </Button>
            <Button size="sm" variant="outline" onClick={handleSystemExceptions} disabled={loading} className="gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5" />
              חריגים לטיפול
            </Button>
            <Button size="sm" variant="outline" onClick={handleManagementUpdate} disabled={loading} className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              עדכון להנהלה
            </Button>
            <Button size="sm" variant="outline" onClick={handleStuckProjects} disabled={loading} className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />
              פרויקטים תקועים
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              שאל אותי על המערכת — פרויקטים, אתרי תמ״א, משימות, סיכומים.
            </div>
          )}
          {messages.map((m, i) => {
            const isProjectDetail = screenContext.screen === 'project_detail' && !!screenContext.entityId;
            const isDashboard = screenContext.screen === 'dashboard';
            const showSummaryActions = m.role === 'assistant' && m.kind === 'summary' && isProjectDetail;
            const showEmailActions = m.role === 'assistant' && m.kind === 'email' && isProjectDetail;
            const showMgmtActions = m.role === 'assistant' && m.kind === 'mgmt_update' && isDashboard;
            const showBriefingActions = m.role === 'assistant' && m.kind === 'briefing';
            const showDocDraftActions = m.role === 'assistant' && m.kind === 'document_draft';

            // Detect navigation target from assistant text
            let navTarget: { path: string; label: string } | null = null;
            if (m.role === 'assistant') {
              const text = m.content || '';
              const matchedProject = projects.find(p => p.project_name && text.includes(p.project_name));
              if (matchedProject && !(isProjectDetail && screenContext.entityId === matchedProject.id)) {
                navTarget = { path: `/project/${matchedProject.id}`, label: `עבור לפרויקט ${matchedProject.project_name} →` };
              } else if (/\bדוח(ות)?\b|דו"ח/.test(text) && location.pathname !== '/reports') {
                navTarget = { path: '/reports', label: 'פתח דוחות →' };
              } else if (/גאנט|ציר זמן/.test(text) && location.pathname !== '/gantt-all') {
                navTarget = { path: '/gantt-all', label: 'פתח גאנט כולל →' };
              } else if (/(ישיב|פגיש|פורום)/.test(text) && location.pathname !== '/meetings') {
                navTarget = { path: '/meetings', label: 'פתח ישיבות →' };
              } else if (/משימ|מטל/.test(text) && location.pathname !== '/tasks') {
                navTarget = { path: '/tasks', label: 'פתח משימות →' };
              } else if (/רשימת הפרויקטים|כל הפרויקטים/.test(text) && location.pathname !== '/projects') {
                navTarget = { path: '/projects', label: 'פתח רשימת פרויקטים →' };
              }
            }

            return (
              <div key={i} className={cn('space-y-2', m.role === 'user' ? 'mr-8' : 'ml-8')}>
                <div
                  className={cn(
                    'rounded-lg p-3 text-sm whitespace-pre-wrap',
                    m.role === 'user' ? 'bg-primary/10' : 'bg-muted',
                  )}
                >
                  {m.attachments?.map((a, ai) => (
                    <div key={ai} className="mb-2 flex items-center gap-2 text-xs">
                      {a.previewUrl || a.mimeType.startsWith('image/') ? (
                        <img
                          src={a.previewUrl || `data:${a.mimeType};base64,${a.dataBase64}`}
                          alt={a.name}
                          className="h-16 w-16 rounded object-cover"
                        />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                  {(() => {
                    const c = m.content || '';
                    if (m.role !== 'assistant' || !c.includes('|')) {
                      return c;
                    }
                    // Render mixed content: group consecutive pipe-lines into HTML tables,
                    // keep other lines as plain text.
                    const sepRe = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
                    const splitRow = (line: string): string[] => {
                      let s = line.trim();
                      if (s.startsWith('|')) s = s.slice(1);
                      if (s.endsWith('|')) s = s.slice(0, -1);
                      return s.split('|').map((c) => c.trim());
                    };
                    const lines = c.split('\n');
                    const nodes: React.ReactNode[] = [];
                    let i = 0;
                    let key = 0;
                    let textBuf: string[] = [];
                    const flushText = () => {
                      if (textBuf.length) {
                        nodes.push(
                          <span key={`t-${key++}`} className="whitespace-pre-wrap">
                            {textBuf.join('\n')}
                          </span>,
                        );
                        textBuf = [];
                      }
                    };
                    while (i < lines.length) {
                      const line = lines[i];
                      if (line.includes('|')) {
                        // collect contiguous table block
                        const block: string[] = [];
                        while (i < lines.length && lines[i].includes('|')) {
                          block.push(lines[i]);
                          i++;
                        }
                        if (block.length >= 2) {
                          flushText();
                          const rows = block.map(splitRow);
                          const hasSep = block.length > 1 && sepRe.test(block[1]);
                          const headerRow = rows[0];
                          const bodyStart = hasSep ? 2 : 1;
                          const bodyRows = rows.slice(bodyStart);
                          nodes.push(
                            <div key={`tbl-${key++}`} className="my-2 overflow-x-auto" dir="rtl">
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr>
                                    {headerRow.map((h, hi) => (
                                      <th
                                        key={hi}
                                        className="border border-border bg-muted-foreground/10 px-2 py-1 text-right font-semibold"
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {bodyRows.map((row, ri) => (
                                    <tr key={ri}>
                                      {row.map((cell, ci) => (
                                        <td
                                          key={ci}
                                          className="border border-border px-2 py-1 text-right align-top"
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>,
                          );
                        } else {
                          // single pipe-line — keep as text
                          textBuf.push(line);
                        }
                      } else {
                        textBuf.push(line);
                        i++;
                      }
                    }
                    flushText();
                    return <>{nodes}</>;
                  })()}
                </div>
                {navTarget && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => { navigate(navTarget!.path); setOpen(false); }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {navTarget.label}
                  </Button>
                )}
                {showSummaryActions && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => copyText(m.content, 'הסיכום')}>
                      <Copy className="h-3.5 w-3.5" />
                      העתק סיכום
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => openSummaryAsFormalDoc(m.content)}>
                      <FileText className="h-3.5 w-3.5" />
                      פתח כמסמך רשמי
                    </Button>
                  </div>
                )}
                {showEmailActions && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => copyText(m.content, 'המייל')}>
                      <Copy className="h-3.5 w-3.5" />
                      העתק מייל
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => openEmailAsFormalLetter(m.content)}>
                      <FileSignature className="h-3.5 w-3.5" />
                      פתח כמכתב רשמי
                    </Button>
                  </div>
                )}
                {showMgmtActions && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => copyText(m.content, 'העדכון')}>
                      <Copy className="h-3.5 w-3.5" />
                      העתק עדכון
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => openMgmtUpdateAsFormalDoc(m.content)}>
                      <FileText className="h-3.5 w-3.5" />
                      פתח כמסמך רשמי
                    </Button>
                  </div>
                )}
                {showBriefingActions && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => copyText(m.content, 'התדריך')}>
                      <Copy className="h-3.5 w-3.5" />
                      העתק
                    </Button>
                  </div>
                )}
                {showDocDraftActions && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
                      onClick={() => copyText(m.content, 'המסמך')}>
                      <Copy className="h-3.5 w-3.5" />
                      העתק
                    </Button>
                  </div>
                )}
                {m.role === 'assistant' && containsList(m.content || '') && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => {
                        const prev = messages[i - 1];
                        const title = prev?.role === 'user' ? prev.content : 'תשובת Yohan AI';
                        exportYohanPdf(title, m.content || '');
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      ייצא PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => {
                        const prev = messages[i - 1];
                        const title = prev?.role === 'user' ? prev.content : 'תשובת Yohan AI';
                        exportYohanDocx(title, m.content || '');
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      ייצא Word
                    </Button>
                  </div>
                )}
                {m.role === 'assistant' && m.kind === 'iplan_docs' && m.iplanDocs && m.iplanDocs.length > 0 && (
                  <div className="space-y-2">
                    {m.iplanDocs.map((doc, di) => {
                      const k = `${conversationKey}:${i}:${doc.url}`;
                      const saved = !!savedDocKey[k];
                      const saving = !!savingDocKey[k];
                      return (
                        <div key={di} className="border rounded-md p-2 bg-background">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <span className="text-xs font-medium truncate flex-1">{doc.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{doc.type}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                              onClick={() => window.open(doc.url, '_blank', 'noopener,noreferrer')}>
                              <ExternalLink className="h-3 w-3" />
                              פתח
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                              disabled={saved || saving || !isProjectDetail}
                              onClick={() => handleSaveIplanDoc(i, doc)}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              {saved ? 'נשמר ✓' : 'שמור בפרויקט'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(() => {
                  if (m.role !== 'assistant') return null;
                  if (!isProjectDetail) return null;
                  const prev = messages[i - 1];
                  const pdf = prev?.attachments?.find((a) => a.mimeType === 'application/pdf');
                  if (!pdf) return null;
                  const text = `${m.content || ''} ${pdf.name}`;
                  const isPlanning = /הוראות תוכנית|תשריט|נספח|תכנית|תוכנית|planning/i.test(text)
                    || /(asks|בקש|שמור|save).*(מסמכ|פרויקט|document)/i.test((prev?.content || ''));
                  if (!isPlanning) return null;
                  const key = `${conversationKey}:${i}`;
                  const saved = !!savedPdfIdx[key];
                  const saving = !!savingPdfIdx[key];
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        disabled={saved || saving}
                        onClick={() => handleSavePdfToProject(i, pdf, m.content || '')}
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                        {saved ? 'נשמר ✓' : 'שמור במסמכי הפרויקט'}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              חושב...
            </div>
          )}
        </div>

        <div className="border-t p-3 space-y-2">
          {pendingAttachment && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
              {pendingAttachment.previewUrl ? (
                <img src={pendingAttachment.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-xs flex-1 truncate text-right">{pendingAttachment.name}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPendingAttachment(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFilePick(f);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="צרף קובץ"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="כתוב שאלה..."
              className="min-h-[44px] max-h-32 resize-none text-right"
              dir="rtl"
            />
            <Button onClick={send} disabled={loading || (!input.trim() && !pendingAttachment)} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
