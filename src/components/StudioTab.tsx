import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  FileBarChart, Presentation, BarChart3, Wand2, Sparkles,
  Zap, LayoutDashboard, FileText, ChevronLeft, ChevronRight,
  Download, Loader2, CheckCircle2, Clock, Building2,
  AlertTriangle, TrendingUp, Target, X
} from 'lucide-react';
import ImportActionsDialog from '@/components/ImportActionsDialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface StudioTabProps {
  projectId: string;
  onOpenReports?: () => void;
}

export default function StudioTab({ projectId, onOpenReports }: StudioTabProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [infographicOpen, setInfographicOpen] = useState(false);

  const tools = [
    { id: 'import', label: 'ייבוא חוסמים ופעולות', desc: 'Yohan AI מחלץ ומתאים לפרויקטים', icon: Wand2, badge: 'AI · חדש', onClick: () => setImportOpen(true) },
    { id: 'report', label: 'דוח', desc: 'דוחות סטטוס לפורומים ויצוא רשמי', icon: FileBarChart, badge: undefined as string | undefined, onClick: onOpenReports },
    { id: 'presentation', label: 'מצגת', desc: 'מצגת ויזואלית לפורום או ועדה עם שקפים ו-PDF', icon: Presentation, badge: 'AI · חדש', onClick: () => setPresentationOpen(true) },
    { id: 'infographic', label: 'אינפוגרפיקה', desc: 'כרטיס מידע ויזואלי עם KPIs להורדה', icon: BarChart3, badge: 'AI · חדש', onClick: () => setInfographicOpen(true) },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">סטודיו יצירה</h2>
          <p className="text-sm text-muted-foreground mt-1">הפק תוצרים מקצועיים מנתוני הפרויקט — מופעל על ידי Yohan AI</p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          מופעל על ידי Yohan AI
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.id}
              onClick={tool.onClick}
              className="relative group cursor-pointer overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
            >
              {tool.badge && (
                <Badge className="absolute top-3 left-3 z-10 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                  {tool.badge}
                </Badge>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5 relative">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/15 transition-transform">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-1">{tool.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 min-h-[32px]">{tool.desc}</p>
                <div className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                  פתח
                  <ChevronLeft className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ImportActionsDialog open={importOpen} onOpenChange={setImportOpen} />
      <PresentationDialog open={presentationOpen} onOpenChange={setPresentationOpen} projectId={projectId} />
      <InfographicDialog open={infographicOpen} onOpenChange={setInfographicOpen} projectId={projectId} />
    </div>
  );
}

// ═══════════════ PRESENTATION DIALOG ═══════════════
interface Slide {
  title: string;
  subtitle?: string;
  points?: string[];
  highlight?: string;
  highlightLabel?: string;
  type?: string;
}

function PresentationDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const [format, setFormat] = useState<'short' | 'full'>('short');
  const [audience, setAudience] = useState('פורום אדריכל');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const AUDIENCES = ['פורום אדריכל', 'פורום יועצים', 'ועדה', 'הנהלה'];

  const generate = async () => {
    setGenerating(true);
    setSlides([]);
    const prompt = `You are creating a professional presentation for an Israeli urban renewal project.
Create ${format === 'short' ? '6' : '12'} slides for audience: ${audience}.
${instructions ? 'Special instructions: ' + instructions : ''}

Return ONLY a JSON array of slide objects. No other text. Format:
[
  {
    "title": "slide title in Hebrew",
    "subtitle": "optional subtitle",
    "points": ["point 1", "point 2", "point 3"],
    "highlight": "one key number or stat to emphasize (optional)",
    "highlightLabel": "label for the highlight",
    "type": "title|content|data|summary"
  }
]

First slide type must be "title". Last slide type must be "summary".
All text must be in Hebrew RTL.`;

    try {
      const { data } = await supabase.functions.invoke('assistant-chat', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          screenContext: { screen: 'project_detail', entity: { project_id: projectId } }
        }
      });
      const reply = data?.reply || '';
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSlides(parsed);
        setCurrentSlide(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async () => {
    if (!slides.length) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const GRAD_COLORS = [
      { r: 37, g: 99, b: 235 },
      { r: 51, g: 65, b: 85 },
      { r: 5, g: 150, b: 105 },
      { r: 79, g: 70, b: 229 },
    ];
    for (let i = 0; i < slides.length; i++) {
      if (i > 0) pdf.addPage();
      const slide = slides[i];
      const col = GRAD_COLORS[i % GRAD_COLORS.length];
      // Background
      pdf.setFillColor(col.r, col.g, col.b);
      pdf.rect(0, 0, W, H, 'F');
      // Slide number chip
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${audience} · ${i + 1} / ${slides.length}`, W - 10, 10, { align: 'right' });
      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(slide.title || '', W - 30);
      pdf.text(titleLines, W - 15, 35, { align: 'right' });
      // Subtitle
      if (slide.subtitle) {
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(230, 230, 230);
        const subY = 35 + titleLines.length * 12;
        pdf.text(slide.subtitle, W - 15, subY, { align: 'right' });
      }
      // Bullet points
      const bulletStartY = slide.subtitle ? 65 : 58;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(230, 230, 230);
      (slide.points || []).forEach((pt: string, pi: number) => {
        const y = bulletStartY + pi * 12;
        if (y > H - 25) return;
        pdf.circle(W - 15, y - 2, 1.2, 'F');
        const lines = pdf.splitTextToSize(pt, W - 35);
        pdf.text(lines[0], W - 20, y, { align: 'right' });
      });
      // Highlight box (bottom left)
      if (slide.highlight) {
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(10, H - 38, 55, 30, 4, 4, 'F');
        pdf.setTextColor(col.r, col.g, col.b);
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(slide.highlight), 37, H - 20, { align: 'center' });
        if (slide.highlightLabel) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(slide.highlightLabel, 37, H - 12, { align: 'center' });
        }
      }
      // Bottom bar
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, H - 8, W, 8, 'F');
      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('עיריית אשדוד · מערכת ניהול פינוי-בינוי', W - 5, H - 2.5, { align: 'right' });
      pdf.text(new Date().toLocaleDateString('he-IL'), 5, H - 2.5, { align: 'left' });
    }
    pdf.save('מצגת-פרויקט.pdf');
  };

  const slide = slides[currentSlide];
  const SLIDE_GRADIENTS = [
    'from-blue-600 to-blue-800',
    'from-slate-700 to-slate-900',
    'from-emerald-600 to-emerald-800',
    'from-primary to-primary/70',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-right">
            <Presentation className="h-5 w-5 text-primary" />
            יצירת מצגת עם Yohan AI
          </DialogTitle>
        </DialogHeader>

        {slides.length === 0 ? (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm font-semibold mb-3 text-right">היקף המצגת</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'short' as const, label: 'מצגת מקוצרת', sub: '6 שקפים · עיקרי הפרויקט', icon: Zap },
                  { val: 'full' as const, label: 'מצגת מורחבת', sub: '12 שקפים · ניתוח מעמיק', icon: LayoutDashboard },
                ].map(f => {
                  const FIcon = f.icon;
                  return (
                    <div
                      key={f.val}
                      onClick={() => setFormat(f.val)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all text-right ${format === f.val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                    >
                      <FIcon className={`h-5 w-5 mb-2 ${format === f.val ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-sm">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3 text-right">קהל יעד</p>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map(a => (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${audience === a ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2 text-right">
                הנחיות נוספות <span className="font-normal text-muted-foreground">(אופציונלי)</span>
              </p>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="לדוגמה: הדגש את נושא התחבורה, הוסף השוואה לפרויקטים דומים, כלול המלצה ברורה..."
                className="text-right resize-none"
                rows={3}
              />
            </div>

            <Button onClick={generate} disabled={generating} size="lg" className="w-full gap-2 h-12 text-base">
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generating ? 'Yohan AI יוצר את המצגת...' : '✦ צור מצגת עם Yohan AI'}
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div
              id="slide-render"
              className={`w-full aspect-video rounded-2xl bg-gradient-to-br ${SLIDE_GRADIENTS[currentSlide % SLIDE_GRADIENTS.length]} p-10 flex flex-col justify-between text-white shadow-xl`}
              dir="rtl"
              style={{ minHeight: 360 }}
            >
              {slide && (
                <>
                  <div>
                    <p className="text-white/60 text-xs mb-2 uppercase tracking-widest">
                      {audience} · שקף {currentSlide + 1}/{slides.length}
                    </p>
                    <h2 className="text-3xl font-bold leading-tight mb-3">{slide.title}</h2>
                    {slide.subtitle && <p className="text-white/80 text-lg">{slide.subtitle}</p>}
                  </div>
                  <div className="flex items-end justify-between gap-6">
                    <ul className="space-y-2 flex-1">
                      {(slide.points || []).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-white/90 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-1.5 shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    {slide.highlight && (
                      <div className="text-center shrink-0 bg-white/15 rounded-2xl px-6 py-4 backdrop-blur-sm">
                        <p className="text-4xl font-black">{slide.highlight}</p>
                        <p className="text-white/70 text-xs mt-1">{slide.highlightLabel}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0}>
                <ChevronRight className="h-4 w-4" />
                הקודם
              </Button>
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all ${i === currentSlide ? 'bg-primary w-5' : 'bg-border w-2'}`}
                  />
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))} disabled={currentSlide === slides.length - 1}>
                הבא
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={downloadPdf} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                הורד PDF
              </Button>
              <Button variant="outline" onClick={() => setSlides([])} className="gap-2">
                <X className="h-4 w-4" />
                צור מחדש
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════ INFOGRAPHIC DIALOG ═══════════════
interface InfographicData {
  title: string;
  subtitle?: string;
  kpis?: Array<{ label: string; value: string; unit?: string; color: string; icon?: string }>;
  status?: { label: string; color: string; description: string };
  blocker?: string | null;
  nextAction?: string | null;
  recommendation?: string;
  stages?: Array<{ name: string; done: boolean; current: boolean }>;
}

function InfographicDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; projectId: string }) {
  const [style, setStyle] = useState('card');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [infData, setInfData] = useState<InfographicData | null>(null);

  const STYLES = [
    { val: 'card', label: 'כרטיס מידע', sub: 'KPIs + מצב + המלצה', icon: FileText },
    { val: 'timeline', label: 'ציר זמן', sub: 'שלבי הפרויקט על ציר', icon: Clock },
    { val: 'compare', label: 'השוואה', sub: 'ביחס לממוצע המערכת', icon: TrendingUp },
  ];

  const generate = async () => {
    setGenerating(true);
    setInfData(null);
    const prompt = `Create an infographic data object for an Israeli urban renewal project.
Style: ${style}. ${instructions ? 'Instructions: ' + instructions : ''}

Return ONLY a JSON object (no other text):
{
  "title": "main title in Hebrew",
  "subtitle": "subtitle in Hebrew",
  "kpis": [
    { "label": "Hebrew label", "value": "value", "unit": "unit", "color": "#hex", "icon": "building|home|trending|target|clock|check" }
  ],
  "status": { "label": "Hebrew status", "color": "#hex", "description": "one sentence" },
  "blocker": "main blocker text or null",
  "nextAction": "next action text or null",
  "recommendation": "one clear recommendation sentence",
  "stages": [
    { "name": "stage name Hebrew", "done": true/false, "current": true/false }
  ]
}`;

    try {
      const { data } = await supabase.functions.invoke('assistant-chat', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          screenContext: { screen: 'project_detail', entity: { project_id: projectId } }
        }
      });
      const reply = data?.reply || '';
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) setInfData(JSON.parse(jsonMatch[0]));
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async () => {
    const el = document.getElementById('infographic-render');
    if (!el) return;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save('אינפוגרפיקה-פרויקט.pdf');
  };

  const ICON_MAP: Record<string, typeof Building2> = {
    building: Building2, home: Building2, trending: TrendingUp,
    target: Target, clock: Clock, check: CheckCircle2,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-right">
            <BarChart3 className="h-5 w-5 text-primary" />
            יצירת אינפוגרפיקה עם Yohan AI
          </DialogTitle>
        </DialogHeader>

        {!infData ? (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm font-semibold mb-3 text-right">סגנון האינפוגרפיקה</p>
              <div className="grid grid-cols-3 gap-3">
                {STYLES.map(s => {
                  const SIcon = s.icon;
                  return (
                    <div
                      key={s.val}
                      onClick={() => setStyle(s.val)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all text-right ${style === s.val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                    >
                      <SIcon className={`h-5 w-5 mb-2 ${style === s.val ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2 text-right">
                הנחיות נוספות <span className="font-normal text-muted-foreground">(אופציונלי)</span>
              </p>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="הנחיות מיוחדות..."
                className="text-right resize-none"
                rows={2}
              />
            </div>

            <Button onClick={generate} disabled={generating} size="lg" className="w-full gap-2 h-12 text-base">
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generating ? 'Yohan AI יוצר אינפוגרפיקה...' : '✦ צור אינפוגרפיקה עם Yohan AI'}
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div id="infographic-render" className="bg-white rounded-2xl p-8 border border-border/40 shadow-sm" dir="rtl">
              <div className="border-b-4 border-primary pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">עיריית אשדוד · התחדשות עירונית</div>
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mt-2">{infData.title}</h2>
                {infData.subtitle && <p className="text-gray-500 text-sm mt-1">{infData.subtitle}</p>}
              </div>

              {infData.kpis && infData.kpis.length > 0 && (
                <div className={`grid gap-4 mb-6 ${infData.kpis.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {infData.kpis.map((kpi, i) => {
                    const IconComp = ICON_MAP[kpi.icon || 'building'] || Building2;
                    return (
                      <div key={i} className="rounded-xl p-4 text-right" style={{ background: kpi.color + '15', borderRight: `4px solid ${kpi.color}` }}>
                        <IconComp className="h-4 w-4 mb-2" style={{ color: kpi.color }} />
                        <p className="text-2xl font-black text-gray-900">
                          {kpi.value}
                          {kpi.unit && <span className="text-sm font-normal text-gray-500 mr-1">{kpi.unit}</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-4 text-right" style={{ background: (infData.status?.color || '#22c55e') + '15' }}>
                  <p className="text-xs text-gray-500 mb-1">סטטוס נוכחי</p>
                  <p className="font-bold" style={{ color: infData.status?.color }}>{infData.status?.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{infData.status?.description}</p>
                </div>
                <div className={`rounded-xl p-4 text-right ${infData.blocker ? 'bg-red-50 border border-red-100' : 'bg-green-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">חסם מרכזי</p>
                  {infData.blocker ? (
                    <p className="text-sm font-semibold text-red-700 flex items-start gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {infData.blocker}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      אין חסם פעיל
                    </p>
                  )}
                </div>
              </div>

              {infData.stages && infData.stages.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-3">התקדמות בתהליך</p>
                  <div className="flex items-center gap-0" dir="rtl">
                    {infData.stages.map((st, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
                          <div className={`w-3 h-3 rounded-full shrink-0 ${st.done ? 'bg-primary' : st.current ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-200'}`} />
                          {st.current && <p className="text-[9px] text-primary font-bold mt-1 text-center leading-tight" style={{ maxWidth: 60 }}>{st.name}</p>}
                        </div>
                        {i < infData.stages.length - 1 && (
                          <div className={`h-0.5 flex-1 ${st.done ? 'bg-primary' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {infData.recommendation && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-right">
                  <p className="text-xs text-primary font-semibold mb-1">המלצה</p>
                  <p className="text-sm text-gray-800">{infData.recommendation}</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                <p className="text-[10px] text-gray-400">הופק על ידי מערכת ניהול פינוי-בינוי · אשדוד</p>
                <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString('he-IL')}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={downloadPdf} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                הורד PDF
              </Button>
              <Button variant="outline" onClick={() => setInfData(null)} className="gap-2">
                <X className="h-4 w-4" />
                צור מחדש
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
