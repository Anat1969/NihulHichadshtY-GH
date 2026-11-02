import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, Users, FileCheck, Info, Ruler, Leaf, Shield,
  Settings, TreePine, Calculator, CheckCircle2, FileText,
  AlertTriangle, Lightbulb, BarChart3, Layers, BookOpen,
  Target, Car, Droplets, Zap, Trash2, Droplet, Phone,
  Mail, Clock, MapPin, ChevronLeft, ClipboardList, Eye,
  HardHat, ArrowDown,
} from 'lucide-react';
import {
  DEPARTMENTS, LICENSING_TRACKS, BANK_ACCOUNTS,
  SPATIAL_REVIEW_STEPS, WASTE_VOLUME_TABLE, type Department,
} from '@/data/planGuideData';

const DEPT_ICONS: Record<string, any> = {
  FileCheck, HardHat, Car, Droplets, TreePine, Zap, Trash2, Droplet, Leaf,
};

const CHAPTER_COLORS: Record<string, string> = {
  'א': 'bg-primary/10 text-primary border-primary/20',
  'ב': 'bg-secondary/10 text-secondary border-secondary/20',
  'ג': 'bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/.2)]',
};

const CHAPTER_NAMES: Record<string, string> = {
  'א': 'פרק א\' – רישוי להיתר',
  'ב': 'פרק ב\' – ביצוע',
  'ג': 'פרק ג\' – תשתית, פיתוח וסביבה',
};

interface PlanGuideContentProps {
  showHeader?: boolean;
}

export default function PlanGuideContent({ showHeader = true }: PlanGuideContentProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // ═══ Waste calculator state ═══
  const [wasteUnits, setWasteUnits] = useState(0);
  const [wasteFloors, setWasteFloors] = useState(0);

  const wasteResult = (() => {
    const dailyVolume = wasteUnits * 12;
    const weeklyVolume = dailyVolume * 7;
    let containerType = '';
    let recommendation = '';
    if (wasteFloors <= 10) {
      containerType = 'טמון קרקע 5 מ"ק לכל 25 יח"ד';
      recommendation = `מומלץ ${Math.ceil(wasteUnits / 25)} טמוני קרקע`;
    } else if (wasteFloors <= 14) {
      containerType = 'דחסן 12-22 מ"ק + שוט אשפה + שוט נפרד לכתומים';
      recommendation = 'דחסנית אחת + 2 שוטים';
    } else {
      containerType = '2 דחסנים + 2 שוטים (אשפה + מחזור אריזות)';
      recommendation = '2 דחסניות + 2 שוטים לשני זרמים';
    }
    return { dailyVolume, weeklyVolume, containerType, recommendation };
  })();

  // ═══ Fee calculator ═══
  const [feeMeters, setFeeMeters] = useState(0);
  const [feeRate, setFeeRate] = useState(0);
  const feeDeposit = feeMeters > 0 && feeRate > 0 ? Math.round(feeMeters * feeRate * 0.2) : 0;

  const groupedDepts = DEPARTMENTS.reduce((acc, dept) => {
    if (!acc[dept.chapter]) acc[dept.chapter] = [];
    acc[dept.chapter].push(dept);
    return acc;
  }, {} as Record<string, Department[]>);

  const renderDeptDetail = (dept: Department) => {
    const Icon = DEPT_ICONS[dept.icon] || Building2;

    return (
      <div className="space-y-6" key={dept.id}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-foreground">{dept.name}</h3>
            <Badge className={CHAPTER_COLORS[dept.chapter] + ' border text-[11px] mt-1'}>
              {dept.chapterName}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dept.receptionHours && (
            <div className="bg-muted/40 rounded-lg p-4 flex items-start gap-3">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">שעות קבלת קהל</p>
                <p className="text-xs text-muted-foreground mt-1">{dept.receptionHours}</p>
                {dept.phoneHours && <p className="text-xs text-muted-foreground mt-0.5">מענה טלפוני: {dept.phoneHours}</p>}
              </div>
            </div>
          )}
          {dept.address && (
            <div className="bg-muted/40 rounded-lg p-4 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">כתובת</p>
                <p className="text-xs text-muted-foreground mt-1">{dept.address}</p>
              </div>
            </div>
          )}
        </div>

        {dept.contacts.length > 0 && (
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                אנשי קשר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right text-xs">שם</TableHead>
                    <TableHead className="text-right text-xs">תפקיד</TableHead>
                    <TableHead className="text-right text-xs">טלפון</TableHead>
                    <TableHead className="text-right text-xs">דוא"ל</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dept.contacts.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.role}</TableCell>
                      <TableCell className="text-xs">
                        <a href={`tel:${c.phone}`} className="text-primary hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" />{c.phone}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" />{c.email}
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="premium-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              תחום אחריות לבדיקה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">{dept.scope}</p>
          </CardContent>
        </Card>

        {dept.graphicContent && dept.graphicContent.length > 0 && (
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-secondary" />
                תכולה גרפית נדרשת
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dept.graphicContent.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dept.spatialReviewConditions && dept.spatialReviewConditions.length > 0 && (
            <Card className="premium-card border-r-4 border-r-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  שלב בקרה מרחבית
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dept.spatialReviewConditions.map((item, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                      <ArrowDown className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {dept.designReviewConditions && dept.designReviewConditions.length > 0 && (
            <Card className="premium-card border-r-4 border-r-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5 text-secondary" />
                  שלב בקרת תכן
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dept.designReviewConditions.map((item, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                      <ArrowDown className="h-3 w-3 text-secondary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {dept.workStartConditions && dept.workStartConditions.length > 0 && (
            <Card className="premium-card border-r-4 border-r-accent/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <HardHat className="h-3.5 w-3.5 text-accent" />
                  שלב אישור תחילת עבודות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dept.workStartConditions.map((item, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                      <ArrowDown className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {dept.completionConditions && dept.completionConditions.length > 0 && (
            <Card className="premium-card border-r-4 border-r-[hsl(var(--success)/.3)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <FileCheck className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  שלב תעודת גמר
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dept.completionConditions.map((item, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                      <ArrowDown className="h-3 w-3 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {dept.designGuidelines && dept.designGuidelines.length > 0 && (
          <Card className="premium-card bg-primary/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-secondary" />
                דגשים והנחיות לתכנון
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {dept.designGuidelines.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {dept.notes && dept.notes.length > 0 && (
          <div className="space-y-2">
            {dept.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 bg-secondary/10 rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                <p className="text-[11px] text-secondary font-medium">{note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSidebarDeptClick = (dept: Department) => {
    const tabMap: Record<string, string> = { 'א': 'licensing', 'ב': 'execution', 'ג': 'infrastructure' };
    setActiveTab(tabMap[dept.chapter] || 'overview');
    if (dept.chapter === 'ג') {
      setSelectedDept(dept.id);
    } else {
      setSelectedDept(null);
    }
  };

  const renderSidebar = () => (
    <aside className="hidden lg:block sticky top-4 self-start space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
        <Phone className="h-4 w-4 text-primary" />
        מדריך מחלקות וטלפונים
      </h3>
      {Object.entries(CHAPTER_NAMES).map(([ch, name]) => {
        const depts = groupedDepts[ch] || [];
        return (
          <div key={ch} className="space-y-2">
            <Badge className={CHAPTER_COLORS[ch] + ' border text-[10px] font-black px-2 py-0.5'}>
              {name}
            </Badge>
            {depts.map(dept => {
              const Icon = DEPT_ICONS[dept.icon] || Building2;
              const mainContact = dept.contacts[0];
              return (
                <button
                  key={dept.id}
                  onClick={() => handleSidebarDeptClick(dept)}
                  className="w-full text-right bg-card hover:bg-muted/50 border border-border/50 rounded-lg p-2.5 transition-colors cursor-pointer block"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate">{dept.name}</span>
                  </div>
                  {mainContact && (
                    <div className="mr-5 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground">{mainContact.name} • {mainContact.role}</p>
                      <a
                        href={`tel:${mainContact.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-2.5 w-2.5" />{mainContact.phone}
                      </a>
                      {mainContact.email && (
                        <a
                          href={`mailto:${mainContact.email}`}
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] text-primary/70 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-2.5 w-2.5" />{mainContact.email}
                        </a>
                      )}
                    </div>
                  )}
                  {dept.receptionHours && (
                    <div className="mr-5 mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground truncate">{dept.receptionHours}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </aside>
  );

  return (
    <div className="space-y-8" dir="rtl">
      {showHeader && (
        <div className="page-header">
          <div>
            <h1 className="text-3xl font-extrabold" style={{ background: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--primary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              הנחיות להיתר בניה
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              אוגדן הנחיות מידע להיתר לעורכי בקשה – עיריית אשדוד • נוסח מתאריך 01-01-2025
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-bold border-primary/20 text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            עיריית אשדוד
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6" dir="rtl">
        {renderSidebar()}
        <div>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedDept(null); }}>
        <TabsList className="h-12 p-1 bg-muted/60 rounded-xl w-full justify-start gap-1 flex-wrap" style={{direction: 'rtl'}}>
          <TabsTrigger value="overview" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm px-4">
            <BarChart3 className="h-3.5 w-3.5" />
            סקירה כללית
          </TabsTrigger>
          <TabsTrigger value="licensing" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm px-4">
            <FileCheck className="h-3.5 w-3.5" />
            רישוי להיתר
          </TabsTrigger>
          <TabsTrigger value="execution" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm px-4">
            <HardHat className="h-3.5 w-3.5" />
            ביצוע
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm px-4">
            <Settings className="h-3.5 w-3.5" />
            תשתית ופיתוח
          </TabsTrigger>
          <TabsTrigger value="calculators" className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm px-4">
            <Calculator className="h-3.5 w-3.5" />
            מחשבונים
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: OVERVIEW ═══ */}
        <TabsContent value="overview" className="space-y-8 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{direction: 'rtl'}}>
            <div className="kpi-card">
              <div className="text-3xl font-black text-primary">3</div>
              <div className="text-xs text-muted-foreground mt-1">מסלולי רישוי</div>
            </div>
            <div className="kpi-card">
              <div className="text-3xl font-black text-secondary">{DEPARTMENTS.length}</div>
              <div className="text-xs text-muted-foreground mt-1">גורמים ומחלקות</div>
            </div>
            <div className="kpi-card">
              <div className="text-3xl font-black text-[hsl(var(--success))]">4</div>
              <div className="text-xs text-muted-foreground mt-1">שלבי בדיקה</div>
            </div>
            <div className="kpi-card">
              <div className="text-3xl font-black text-accent">3</div>
              <div className="text-xs text-muted-foreground mt-1">פרקי האוגדן</div>
            </div>
          </div>

          <div>
            <h2 className="section-header mb-4">
              <FileCheck className="h-5 w-5 text-primary" />
              מסלולי רישוי – לוחות זמנים
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{direction: 'rtl'}}>
              {LICENSING_TRACKS.map((track, i) => (
                <Card key={i} className="premium-card" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardContent className="p-5 text-center">
                    <div className="text-4xl font-black text-primary mb-2">{track.days}</div>
                    <div className="text-xs font-bold text-foreground">ימים</div>
                    <Separator className="my-3" />
                    <p className="text-sm font-bold text-foreground">{track.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{track.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="section-header mb-4">
              <Eye className="h-5 w-5 text-primary" />
              שלבי הבקרה המרחבית
            </h2>
            <Card className="premium-card">
              <CardContent className="p-5">
                <ol className="space-y-3">
                  {SPATIAL_REVIEW_STEPS.map((step, i) => (
                    <li key={i} className="flex flex-row-reverse items-start gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-black text-primary">
                        {i + 1}
                      </div>
                      <span className="text-xs text-muted-foreground pt-1 flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="section-header mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              מבנה האוגדן – לפי פרקים
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{direction: 'rtl'}}>
              {Object.entries(CHAPTER_NAMES).map(([ch, name], i) => {
                const depts = groupedDepts[ch] || [];
                return (
                  <Card key={ch} className="premium-card" style={{ animationDelay: `${i * 100}ms` }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={CHAPTER_COLORS[ch] + ' border text-xs font-black px-3 py-1'}>{ch}</Badge>
                        <CardTitle className="text-sm">{name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {depts.map(d => {
                          const Icon = DEPT_ICONS[d.icon] || Building2;
                          return (
                            <li key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Icon className="h-3.5 w-3.5 text-primary" />
                              <span>{d.name}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══ TAB: LICENSING ═══ */}
        <TabsContent value="licensing" className="space-y-6 mt-6">
          {(groupedDepts['א'] || []).map(dept => renderDeptDetail(dept))}

          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                חשבונות בנק לתשלום פיקדון
              </CardTitle>
              <CardDescription className="text-xs">לאחר ביצוע תשלום אגרה/פיקדון יש להעביר אסמכתא + הודעת חיוב שנמסרה במייל: agrot@asdod.muni.il</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right text-xs">שם הבנק</TableHead>
                    <TableHead className="text-right text-xs">מס' בנק</TableHead>
                    <TableHead className="text-right text-xs">מס' סניף</TableHead>
                    <TableHead className="text-right text-xs">מס' חשבון</TableHead>
                    <TableHead className="text-right text-xs">IBAN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BANK_ACCOUNTS.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{b.bankName}</TableCell>
                      <TableCell className="text-xs">{b.bankNumber}</TableCell>
                      <TableCell className="text-xs">{b.branchNumber}</TableCell>
                      <TableCell className="text-xs">{b.accountNumber}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{b.iban}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: EXECUTION ═══ */}
        <TabsContent value="execution" className="space-y-6 mt-6">
          {(groupedDepts['ב'] || []).map(dept => renderDeptDetail(dept))}
        </TabsContent>

        {/* ═══ TAB: INFRASTRUCTURE ═══ */}
        <TabsContent value="infrastructure" className="space-y-6 mt-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedDept === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDept(null)}
              className="text-xs rounded-lg h-8"
            >
              הכל
            </Button>
            {(groupedDepts['ג'] || []).map(d => {
              const Icon = DEPT_ICONS[d.icon] || Building2;
              return (
                <Button
                  key={d.id}
                  variant={selectedDept === d.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDept(selectedDept === d.id ? null : d.id)}
                  className="text-xs rounded-lg h-8 gap-1.5"
                >
                  <Icon className="h-3 w-3" />
                  {d.name.replace('מחלקת ', '').replace('אגף ', '').substring(0, 20)}
                </Button>
              );
            })}
          </div>

          {selectedDept ? (
            renderDeptDetail(DEPARTMENTS.find(d => d.id === selectedDept)!)
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {(groupedDepts['ג'] || []).map((dept) => {
                const Icon = DEPT_ICONS[dept.icon] || Building2;
                return (
                  <AccordionItem key={dept.id} value={dept.id} className="border rounded-xl overflow-hidden bg-card px-1">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 text-right">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-bold">{dept.name}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{dept.scope.substring(0, 80)}...</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4">
                      {renderDeptDetail(dept)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        {/* ═══ TAB: CALCULATORS ═══ */}
        <TabsContent value="calculators" className="space-y-8 mt-6">
          <h2 className="section-header">
            <Calculator className="h-5 w-5 text-primary" />
            מחשבונים מקצועיים
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{direction: 'rtl'}}>
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-primary" />
                  מחשבון אצירת אשפה למגורים
                </CardTitle>
                <CardDescription className="text-xs">חישוב סוג וכמות כלי אצירה הנדרשים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">יחידות דיור</Label>
                    <Input type="number" value={wasteUnits || ''} onChange={e => setWasteUnits(Number(e.target.value))} className="mt-1 h-9 text-sm rounded-lg" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">קומות</Label>
                    <Input type="number" value={wasteFloors || ''} onChange={e => setWasteFloors(Number(e.target.value))} className="mt-1 h-9 text-sm rounded-lg" placeholder="0" />
                  </div>
                </div>

                <Separator />

                {wasteUnits > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary/[0.06] rounded-lg p-3 text-center">
                        <div className="text-lg font-black text-primary">{wasteResult.dailyVolume}</div>
                        <div className="text-[10px] text-muted-foreground">ליטר/יום</div>
                      </div>
                      <div className="bg-secondary/10 rounded-lg p-3 text-center">
                        <div className="text-lg font-black text-secondary">{wasteResult.weeklyVolume}</div>
                        <div className="text-[10px] text-muted-foreground">ליטר/שבוע</div>
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-4">
                      <p className="text-xs font-bold text-foreground mb-1">סוג כלי אצירה מומלץ:</p>
                      <p className="text-xs text-muted-foreground">{wasteResult.containerType}</p>
                      <p className="text-xs text-primary font-bold mt-2">{wasteResult.recommendation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-secondary" />
                  מחשבון פיקדון (20% מאגרת בניה)
                </CardTitle>
                <CardDescription className="text-xs">חישוב סכום הפיקדון הנדרש לפתיחת תיק</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">סך מטרים מוצעים</Label>
                    <Input type="number" value={feeMeters || ''} onChange={e => setFeeMeters(Number(e.target.value))} className="mt-1 h-9 text-sm rounded-lg" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">ערך אגרה למ"ר (₪)</Label>
                    <Input type="number" value={feeRate || ''} onChange={e => setFeeRate(Number(e.target.value))} className="mt-1 h-9 text-sm rounded-lg" placeholder="0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 col-span-2">
                    ערך אגרה למ״ר מתעדכן מדי שנה — בדוק באגף הרישוי עיריית אשדוד
                  </p>
                </div>

                <Separator />

                <div className="bg-secondary/10 rounded-xl p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-2">סכום פיקדון נדרש</p>
                  <div className="text-4xl font-black text-secondary">
                    ₪{feeDeposit.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {feeDeposit > 0 ? '20% מסך אגרת הבניה (סך מטרים × ערך אגרה למ"ר)' : 'הזן נתונים לחישוב'}
                  </p>
                </div>

                <div className="flex items-start gap-2 bg-secondary/10 rounded-lg p-3">
                  <Info className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-secondary font-medium">
                    בבקשות במסלול שימוש חורג/הקלות – אין תשלום פיקדון
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-primary" />
                טבלת בסיס לחישוב נפח אשפה – שימושים שאינם למגורים
              </CardTitle>
              <CardDescription className="text-xs">מבוסס על תקנות התכנון והבניה, אצירת אשפה, תש"ף 2019</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right text-xs">#</TableHead>
                    <TableHead className="text-right text-xs">ייעוד המבנה</TableHead>
                    <TableHead className="text-right text-xs">יחידה לחישוב</TableHead>
                    <TableHead className="text-right text-xs">נפח יומי (ליטר)</TableHead>
                    <TableHead className="text-right text-xs">הערות קרטון</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WASTE_VOLUME_TABLE.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">{row.id}</TableCell>
                      <TableCell className="text-xs font-medium">{row.usage}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.unit}</TableCell>
                      <TableCell className="text-xs font-bold text-primary">{row.volumePerUnit}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{row.cardboardNote}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
}
