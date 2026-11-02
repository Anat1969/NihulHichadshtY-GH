import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import PlanGuideContent from '@/components/PlanGuideContent';
import { useApp } from '@/context/ProjectContext';
import { getStageName, getMultiplier, STAGES, StageId, getProjectProgress } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Globe, AlertTriangle, CheckCircle2, Edit, ClipboardList, Users, FileBarChart, MessageSquare, Shield, FolderOpen, Building2, FolderOpen as FolderIcon, Info, Map, BookOpen, MapPin, Loader2, Settings, Image as ImageIcon, User, FileText, FileSpreadsheet, Download, Sparkles, Presentation, Wand2, LayoutDashboard, ChevronUp, ChevronDown, CalendarDays, X } from 'lucide-react';
import GanttTab from '@/components/GanttTab';
import { exportProjectPdf, exportProjectExcel } from '@/lib/exportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FullEditDrawer from '@/components/FullEditDrawer';
import ProjectSmartSummary from '@/components/ProjectSmartSummary';
import FormalDocumentEditor from '@/components/FormalDocumentEditor';
import MeetingBriefingDialog from '@/components/MeetingBriefingDialog';
import type { MeetingDocumentDraft } from '@/lib/formalDocumentExport';
import OngoingManagementCard from '@/components/OngoingManagementCard';

import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import ForumsTab from '@/components/ForumsTab';
import TasksTab from '@/components/TasksTab';
import DesignReviewTab from '@/components/DesignReviewTab';
import Forum2ReviewsTab from '@/components/Forum2ReviewsTab';
import EnhancedReportsTab from '@/components/EnhancedReportsTab';
import DocumentsTab from '@/components/DocumentsTab';
import StudioTab from '@/components/StudioTab';
import IdentityAssetsSection from '@/components/IdentityAssetsSection';
import ProjectReminders from '@/components/ProjectReminders';
import ProjectAddressEditor from '@/components/ProjectAddressEditor';
import { useProjects, ProjectWithAddresses } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { updateProject: updateDbProject, addAddress, updateAddress, deleteAddress } = useProjects();

  // Fetch project directly from DB by route id
  const [dbProject, setDbProject] = useState<ProjectWithAddresses | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchProject = async () => {
      setProjectLoading(true);
      const { data: proj, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (pErr || !proj) {
        console.error('Error fetching project:', pErr);
        setDbProject(null);
        setProjectLoading(false);
        return;
      }

      const { data: addrs } = await supabase
        .from('project_addresses')
        .select('*')
        .eq('project_id', id);

      setDbProject({ ...proj, addresses: addrs || [] });
      setProjectLoading(false);
    };
    fetchProject();
  }, [id]);

  // Refetch after address/project mutations
  const refetch = async () => {
    if (!id) return;
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
    if (!proj) return;
    const { data: addrs } = await supabase.from('project_addresses').select('*').eq('project_id', id);
    setDbProject({ ...proj, addresses: addrs || [] });
  };

  const [editOpen, setEditOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [formalDocOpen, setFormalDocOpen] = useState(false);
  const [formalDocOverride, setFormalDocOverride] = useState<Partial<MeetingDocumentDraft> | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  // ── Single, flat lower-content navigation ────────────────────────────
  // Replaces the previous double-nested model (sections row + inner tabs row).
  // All sections are siblings: Overview/Forums/Tasks/Design/Consultants/
  // Reports/Documents/Studio/Addresses/Plan-data.
  type TabId =
    | 'overview' | 'forums' | 'tasks' | 'design-review' | 'consultants'
    | 'reports' | 'documents' | 'studio' | 'addresses' | 'taba' | 'gantt';

  const initialTab = (searchParams.get('tab') || searchParams.get('section') || 'overview') as TabId;
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [identityOpen, setIdentityOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.delete('section');
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const tab = searchParams.get('tab') || searchParams.get('section');
    if (tab) setActiveTab(tab as TabId);
  }, [searchParams]);

  // Bridge: SmartAssistant → open FormalDocumentEditor with a draft for THIS project only
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (!id || detail.projectId !== id) return;
      setFormalDocOverride(detail.draft ?? null);
      setFormalDocOpen(true);
    };
    window.addEventListener('open-project-formal-document', handler as EventListener);
    return () => window.removeEventListener('open-project-formal-document', handler as EventListener);
  }, [id]);

  if (projectLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-4">טוען פרויקט...</p>
        </div>
      </Layout>
    );
  }

  if (!dbProject) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground">פרויקט לא נמצא</p>
          <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/projects')}>
            <ArrowRight className="h-4 w-4 rotate-180" />חזרה לפרויקטים
          </Button>
        </div>
      </Layout>
    );
  }

  const multiplier = dbProject.multiplier || (dbProject.units_in && dbProject.units_in > 0 ? ((dbProject.units_out || 0) / dbProject.units_in).toFixed(1) : '0');
  const progress = getProjectProgress(dbProject.main_stage as StageId || 'forum1_harmonika');

  const startEdit = () => {
    setEditOpen(true);
  };

  const handleFullEditSave = async (updates: Record<string, any>) => {
    if (!dbProject) return;
    try {
      await updateDbProject(dbProject.id, updates);
      await refetch();
      toast({ title: 'הפרויקט עודכן ✓' });
    } catch (e: any) {
      toast({ title: 'שמירה נכשלה', description: e?.message || 'שגיאה לא ידועה', variant: 'destructive' });
      throw e;
    }
  };

  const handleAddAddress = async (data: any) => {
    await addAddress(data);
    await refetch();
  };

  const handleUpdateAddress = async (addrId: string, updates: any) => {
    await updateAddress(addrId, updates);
    await refetch();
  };

  const handleDeleteAddress = async (addrId: string) => {
    await deleteAddress(addrId);
    await refetch();
  };

  const handleUpdateProject = async (updates: any) => {
    await updateDbProject(dbProject.id, updates);
    await refetch();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* ═══ Executive Summary ═══ */}
        <div className="sticky top-[60px] z-20 bg-background/95 backdrop-blur-xl -mx-4 md:-mx-8 px-4 md:px-8 border-b border-border/50 transition-all duration-200">
          <div className="max-w-[1320px] mx-auto">
            {/* Always-visible top bar: name + actions + collapse toggle */}
            <div className="flex items-center justify-between gap-3 py-3">
              {/* Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-extrabold leading-tight truncate">{dbProject.project_name}</h1>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    {dbProject.quarter && <span>רובע {dbProject.quarter}</span>}
                    {dbProject.plan_number && <span className="font-mono">{dbProject.plan_number}</span>}
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-medium text-foreground/80">{getStageName((dbProject.main_stage as StageId) || 'forum1_harmonika')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <Button
                  size="sm"
                  onClick={() => window.dispatchEvent(new Event('open-yohan-ai'))}
                  className="gap-1.5 h-8 rounded-xl text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />Yohan AI
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-yohan-ai', { detail: { action: 'summary' } }))} className="gap-1.5 h-8 rounded-xl text-[12px]">
                  <Sparkles className="h-3.5 w-3.5" />סכם
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-yohan-ai', { detail: { action: 'briefing' } }))} className="gap-1.5 h-8 rounded-xl text-[12px]">
                  <Presentation className="h-3.5 w-3.5" />הכן לישיבה
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-yohan-ai', { detail: { action: 'document' } }))} className="gap-1.5 h-8 rounded-xl text-[12px]">
                  <FileText className="h-3.5 w-3.5" />מסמך
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-xl text-[12px]">
                      <Download className="h-3.5 w-3.5" />ייצוא
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportProjectPdf(dbProject)} className="gap-2">
                      <FileText className="h-4 w-4" />ייצוא PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportProjectExcel(dbProject)} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />ייצוא Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-xl text-[12px]">
                      <Settings className="h-3.5 w-3.5" />פרויקט
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={startEdit} className="gap-2">
                      <Settings className="h-4 w-4" />עריכה
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIdentityOpen(true)} className="gap-2">
                      <ImageIcon className="h-4 w-4" />תעודת זהות
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/project/${dbProject.id}/360`)} className="gap-2">
                      <Globe className="h-4 w-4" />360°
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Collapse toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHeaderCollapsed(v => !v)}
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                  title={headerCollapsed ? 'הרחב פרטים' : 'צמצם פרטים'}
                >
                  {headerCollapsed
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronUp className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>

            {/* Collapsible details */}
            {!headerCollapsed && (
              <div className="space-y-4 pb-5">
                {/* Address / extra identity */}
                {dbProject.address_cluster_summary && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>{dbProject.address_cluster_summary}</span>
                  </div>
                )}

                {/* Key Facts */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] border-t border-border/40 pt-3">
                  {dbProject.developer && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">יזם:</span>
                      <span className="font-semibold">{dbProject.developer}</span>
                    </div>
                  )}
                  {(dbProject.units_in || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">דירות קיימות:</span>
                      <span className="font-semibold">{dbProject.units_in}</span>
                    </div>
                  )}
                  {(dbProject.units_out || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">דירות מתוכננות:</span>
                      <span className="font-semibold">{dbProject.units_out}</span>
                    </div>
                  )}
                  {(dbProject.units_in || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">מכפיל:</span>
                      <span className="font-bold text-primary">×{multiplier}</span>
                    </div>
                  )}
                  {(dbProject.units_out || 0) > 0 && (
                    <div className="flex items-center gap-1.5">
                       <span className="text-muted-foreground">פוטנציאל צפוי מהיתרים:</span>
                       <span className="font-bold text-emerald-600">₪ {((dbProject.units_out || 0) * 25000 / 1_000_000).toFixed(1)}M</span>
                       <span className="text-[11px] text-muted-foreground/70 mr-1">
                         (לפי {(dbProject.units_out || 0).toLocaleString()} יח״ד × 25,000 ₪, בכפוף לאישור היתרים)
                       </span>
                    </div>
                  )}
                  {dbProject.plan_submitter && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">אדריכל / מגיש התכנית:</span>
                      <span className="font-semibold">{dbProject.plan_submitter}</span>
                    </div>
                  )}
                </div>

                {/* Stage & Status */}
                <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-3 flex-wrap">
                  <div className="flex items-center gap-4 flex-wrap text-[13px]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="font-semibold">{getStageName((dbProject.main_stage as StageId) || 'forum1_harmonika')}</span>
                    </div>
                    {dbProject.sub_stage && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>תת-שלב:</span>
                        <span className="font-medium text-foreground">{dbProject.sub_stage}</span>
                      </div>
                    )}
                    {dbProject.management_status && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>סטטוס:</span>
                        <span className="font-medium text-foreground">{dbProject.management_status}</span>
                      </div>
                    )}
                    {dbProject.last_update && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>עדכון:</span>
                        <span className="font-medium text-foreground">{formatDate(dbProject.last_update)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-20"><Progress value={progress} className="h-1.5 rounded-full" /></div>
                      <span className="text-muted-foreground font-semibold">{progress}%</span>
                    </div>
                    <Select value={dbProject.main_stage || 'forum1_harmonika'} onValueChange={async (v) => {
                      await updateDbProject(dbProject.id, { main_stage: v });
                      await refetch();
                    }}>
                      <SelectTrigger className="w-[180px] h-8 text-[12px] rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Ongoing Management ═══ */}
        <OngoingManagementCard project={dbProject} onUpdate={handleUpdateProject} />

        {/* ═══ Next Action Banner (always visible — primary call-out) ═══ */}
        <div className="premium-card border-primary/20 bg-primary/[0.03] p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">הפעולה הבאה</span>
              <p className="font-semibold text-[15px] mt-0.5">{dbProject.next_action || 'אין פעולה נדרשת'}</p>
            </div>
            {dbProject.next_action && (
              <button
                onClick={async () => {
                  await supabase.from('projects')
                    .update({ next_action: null, next_action_due_date: null, next_action_owner: null })
                    .eq('id', dbProject.id);
                  refetch();
                }}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="נקה פעולה הבאה"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ═══ One flat lower-content navigation (no nesting) ═══ */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap w-full h-auto bg-secondary/40 p-1.5 rounded-2xl gap-1">
            <TabsTrigger value="overview" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><LayoutDashboard className="h-4 w-4" />סקירה</TabsTrigger>
            <TabsTrigger value="forums" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><MessageSquare className="h-4 w-4" />פורומים</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><ClipboardList className="h-4 w-4" />משימות</TabsTrigger>
            <TabsTrigger value="design-review" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><Shield className="h-4 w-4" />בקרת תכן</TabsTrigger>
            <TabsTrigger value="consultants" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><Users className="h-4 w-4" />יועצים</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><FileBarChart className="h-4 w-4" />דוחות</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><FolderOpen className="h-4 w-4" />מסמכים</TabsTrigger>
            <TabsTrigger value="studio" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><Wand2 className="h-4 w-4" />סטודיו</TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><MapPin className="h-4 w-4" />כתובות</TabsTrigger>
            <TabsTrigger value="taba" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><Map className="h-4 w-4" />תב״ע</TabsTrigger>
            <TabsTrigger value="gantt" className="rounded-xl text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 font-semibold flex-1 min-w-[110px]"><CalendarDays className="h-4 w-4" />גאנט</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewTab dbProject={dbProject} />
          </TabsContent>
          <TabsContent value="forums"><ForumsTab projectId={dbProject.id} /></TabsContent>
          <TabsContent value="tasks"><TasksTab projectId={dbProject.id} /></TabsContent>
          <TabsContent value="design-review"><DesignReviewTab projectId={dbProject.id} /></TabsContent>
          <TabsContent value="consultants"><Forum2ReviewsTab projectId={dbProject.id} /></TabsContent>
          <TabsContent value="reports"><EnhancedReportsTab projectId={dbProject.id} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab projectId={dbProject.id} /></TabsContent>
          <TabsContent value="studio"><StudioTab projectId={dbProject.id} onOpenReports={() => handleTabChange('reports')} /></TabsContent>
          <TabsContent value="addresses">
            <ProjectAddressEditor
              projectId={dbProject.id}
              addresses={dbProject.addresses}
              addressClusterSummary={dbProject.address_cluster_summary || ''}
              sourceAddressesText={dbProject.source_addresses_text || ''}
              onAddAddress={handleAddAddress}
              onUpdateAddress={handleUpdateAddress}
              onDeleteAddress={handleDeleteAddress}
              onUpdateProject={handleUpdateProject}
            />
          </TabsContent>
          <TabsContent value="taba">
            <div className="space-y-4" dir="rtl">
              <div className="flex items-center justify-between">
                <a
                  href={dbProject.iplan_object_id ? `https://mavat.iplan.gov.il/SV4/1/${dbProject.iplan_object_id}/310` : 'https://mavat.iplan.gov.il'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${dbProject.iplan_object_id ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  <Globe className="h-4 w-4" />
                  פתח מסמכי תוכנית ב-iplan ←
                </a>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  נתוני תב״ע
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'מספר תכנית', value: dbProject.plan_number || '—' },
                  { label: 'iplan OBJECTID', value: dbProject.iplan_object_id ? String(dbProject.iplan_object_id) : '—' },
                  { label: 'סוג תכנית', value: 'תמ"ל — תכנית מועדפת לדיור' },
                  { label: 'מרחב תכנון', value: 'אשדוד' },
                  { label: 'ועדה מוסמכת', value: 'ועדה ארצית' },
                  { label: 'מגיש התכנית', value: dbProject.plan_submitter || '—' },
                  { label: 'יזם', value: dbProject.developer || '—' },
                ].map(item => (
                  <div key={item.label} className="premium-card p-4 text-right">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="premium-card p-5 text-right">
                <h4 className="text-sm font-semibold mb-2">קישור ישיר למסמכי התכנית</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {dbProject.iplan_object_id
                    ? `לצפייה בתשריטים, הוראות ומסמכים — פתח את iplan ישירות דרך הכפתור למעלה. OBJECTID: ${dbProject.iplan_object_id}`
                    : 'הזן OBJECTID של iplan בעריכת הפרויקט כדי לפתוח קישור ישיר למסמכי התכנית.'}
                </p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="gantt">
            <GanttTab
              projectId={dbProject.id}
              currentStage={dbProject.main_stage || 'forum1_harmonika'}
              lastUpdate={dbProject.last_update || dbProject.updated_at}
              nextActionDue={dbProject.next_action_due_date}
              nextAction={dbProject.next_action}
            />
          </TabsContent>
        </Tabs>

        {/* ═══ Identity assets — opened on demand from the top action bar ═══ */}
        {identityOpen && (
          <div className="premium-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />תעודת זהות הפרויקט
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIdentityOpen(false)}>סגור</Button>
            </div>
            <IdentityAssetsSection projectId={dbProject.id} />
          </div>
        )}

        {/* Full Edit Drawer */}
        <FullEditDrawer
          project={dbProject}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={handleFullEditSave}
        />

        <ProjectSmartSummary
          project={dbProject}
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          onCreateFormalDoc={(draft) => {
            setFormalDocOverride(draft);
            setFormalDocOpen(true);
          }}
        />

        <FormalDocumentEditor
          project={dbProject}
          open={formalDocOpen}
          onOpenChange={setFormalDocOpen}
          draftOverride={formalDocOverride}
        />

        <MeetingBriefingDialog
          project={dbProject}
          open={briefingOpen}
          onOpenChange={setBriefingOpen}
          onCreateFormalDoc={(draft) => {
            setFormalDocOverride(draft);
            setFormalDocOpen(true);
          }}
        />
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════
// ProjectOverviewTab — visual dashboard for the overview tab
// ═══════════════════════════════════════════════════════════════
import { getStageOrder } from '@/types/project';
import { Clock, Circle } from 'lucide-react';

function ProjectOverviewTab({ dbProject }: { dbProject: ProjectWithAddresses }) {
  const currentStage = (dbProject.main_stage || 'forum1_harmonika') as StageId;
  const currentOrder = getStageOrder(currentStage);
  const progress = getProjectProgress(currentStage);
  const unitsIn = dbProject.units_in || 0;
  const unitsOut = dbProject.units_out || 0;
  const multiplier = unitsIn > 0 ? +(unitsOut / unitsIn).toFixed(2) : 0;
  const lastUpdate = dbProject.last_update || dbProject.updated_at;
  const daysSince = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 86_400_000) : 0;
  const isOverdue = !!(dbProject.next_action_due_date && new Date(dbProject.next_action_due_date) < new Date());

  // Forum stage gates
  const forum1Order = STAGES.findIndex(s => s.id === 'forum1_harmonika');
  const forum2Order = STAGES.findIndex(s => s.id === 'forum2_consultants');
  const committeeOrder = STAGES.findIndex(s => s.id === 'committee_decision');

  const forumState = (gateOrder: number): 'done' | 'current' | 'future' => {
    if (currentOrder > gateOrder) return 'done';
    if (currentOrder === gateOrder) return 'current';
    return 'future';
  };

  const daysColor = daysSince > 14 ? '#ef4444' : daysSince > 7 ? '#f97316' : '#22c55e';

  return (
    <div className="space-y-6" dir="rtl">
      {/* SECTION 1 — Stage Timeline */}
      <div className="premium-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-6 text-right border-r-2 border-primary pr-3">ציר השלבים</h3>
        <div className="relative pt-2 pb-8">
          {/* Gradient progress line (RTL: right=past, left=future) */}
          <div className="absolute top-4 right-0 left-0 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-primary/80 via-primary/60 to-primary/30 transition-all duration-700 rounded-full"
              style={{ width: `${(currentOrder / Math.max(STAGES.length - 1, 1)) * 100}%`, marginRight: 0 }}
            />
          </div>
          <div className="relative flex justify-between w-full" dir="rtl">
            {STAGES.map((stage, idx) => {
              const isCurrent = idx === currentOrder;
              const isPast = idx < currentOrder;
              return (
                <div key={stage.id} className="flex flex-col items-center relative" style={{ flex: '0 0 auto' }}>
                  <div className="h-5 flex items-center justify-center">
                    {isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-primary ring-4 ring-primary/20 z-10" />
                    ) : isPast ? (
                      <div className="w-3 h-3 rounded-full bg-primary/40 z-10 transition-all duration-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-border z-10 transition-all duration-500" />
                    )}
                  </div>
                  {isCurrent && (
                    <span className="absolute top-7 right-1/2 translate-x-1/2 text-[10px] font-semibold text-primary whitespace-nowrap text-center max-w-[120px] truncate">
                      {stage.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2 — KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" dir="rtl">
        <KpiRingCard label="התקדמות" value={progress} suffix="%" percent={progress} color="hsl(var(--primary))" delay={0} />
        <KpiRingCard label="מכפיל" value={multiplier} suffix="x" percent={Math.min(multiplier * 20, 100)} color="#10b981" delay={100} />
        <KpiRingCard label="דירות מתוכננות" value={unitsOut} suffix="" percent={unitsIn > 0 ? Math.min((unitsOut / unitsIn) * 50, 100) : 0} color="hsl(var(--primary))" delay={200} subtitle={`מתוך ${unitsIn} קיימות`} />
        <KpiRingCard label="ימים מעדכון אחרון" value={daysSince} suffix="" percent={Math.min(daysSince * 5, 100)} color={daysColor} delay={300} />
      </div>

      {/* SECTION 3 — Blocker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
        <div className={cn(
          'rounded-2xl bg-card p-5 border-r-4 text-right shadow-sm hover:shadow-md transition-shadow duration-200',
          dbProject.main_blocker ? 'border-r-destructive bg-destructive/5' : 'border-r-emerald-500'
        )}>
          <div className="flex items-center gap-2 mb-2 flex-row-reverse justify-end">
            {dbProject.main_blocker ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-sm font-bold text-foreground">חסם מרכזי</span>
          </div>
          <p className="text-sm text-muted-foreground text-right">
            {dbProject.main_blocker || 'אין חסם פעיל'}
          </p>
        </div>
      </div>

      {/* SECTION 4 — Forum readiness */}
      <div className="premium-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4 text-right border-r-2 border-primary pr-3">מוכנות פורומים</h3>
        <div className="flex gap-3 flex-wrap" dir="rtl">
          <ForumPill label="פורום 1 — הרמוניקה" state={forumState(forum1Order)} />
          <ForumPill label="פורום 2 — יועצים" state={forumState(forum2Order)} />
          <ForumPill label="ועדה" state={forumState(committeeOrder)} />
        </div>
      </div>
    </div>
  );
}

function KpiRingCard({ label, value, suffix, percent, color, delay, subtitle }: {
  label: string; value: number | string; suffix: string; percent: number; color: string; delay: number; subtitle?: string;
}) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;

  return (
    <div
      className="rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col items-end gap-3 animate-fade-in opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="text-xs text-muted-foreground font-medium text-right w-full">{label}</div>
      <div className="relative w-full flex justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground leading-none">{value}{suffix}</span>
          {subtitle && <span className="text-[10px] text-muted-foreground mt-1">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

function ForumPill({ label, state }: { label: string; state: 'done' | 'current' | 'future' }) {
  const cfg = {
    done:    { cls: 'bg-emerald-500 text-white shadow-sm',                    icon: <CheckCircle2 className="h-4 w-4" /> },
    current: { cls: 'bg-primary text-primary-foreground shadow-md', icon: <Clock className="h-4 w-4" /> },
    future:  { cls: 'bg-muted text-muted-foreground',                         icon: <Circle className="h-4 w-4 opacity-50" /> },
  }[state];
  return (
    <div className={cn('rounded-2xl px-5 py-2.5 flex items-center gap-2 text-sm font-semibold transition-all duration-200', cfg.cls)}>
      <span>{cfg.icon}</span>
      <span>{label}</span>
    </div>
  );
}
